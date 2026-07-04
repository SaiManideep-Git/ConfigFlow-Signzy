const { invokeApi } = require('./invoker');
const { evaluate } = require('./jsonataEval');
const { resolveValue } = require('./mapper');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

async function evalCondition(expression, context) {
  if (!expression) return true;
  const result = await evaluate(expression, context);
  return Boolean(result);
}

async function runStep(step, context) {
  if (step.type === 'callApi') {
    const result = await invokeApi(step.api, context, { stepId: step.id });
    return result.data;
  }
  if (step.type === 'transform') {
    return evaluate(step.transform.expression, context);
  }
  throw new AppError(`Unknown step type: ${step.type}`, 500);
}

// Executes a workflow's steps as a DAG: steps whose dependencies are satisfied run
// concurrently in "waves" (this is what gives us parallel execution for independent
// branches, e.g. OCR + fraud-check firing at once), while dependent steps
// (e.g. "call Vendor B only if Vendor A succeeded") wait for their upstream results.
async function executeWorkflow(config, initialContext) {
  const stepsById = new Map(config.steps.map((s) => [s.id, s]));
  const pending = new Set(stepsById.keys());
  const completed = new Set();
  const context = { ...initialContext, steps: {} };
  const stepLogs = [];
  let aborted = null;

  while (pending.size > 0 && !aborted) {
    const ready = [...pending].filter((id) => {
      const deps = stepsById.get(id).dependsOn || [];
      return deps.every((d) => completed.has(d));
    });

    if (ready.length === 0) {
      aborted = { stepId: null, message: 'Unresolvable step dependency graph (cycle or missing step id).' };
      break;
    }

    await Promise.all(
      ready.map(async (id) => {
        const step = stepsById.get(id);
        const startedAt = Date.now();
        const log = { id, type: step.type, name: step.name || id, status: 'pending' };
        stepLogs.push(log);

        try {
          const shouldRun = await evalCondition(step.runIf, context);
          if (!shouldRun) {
            log.status = 'skipped';
            log.durationMs = Date.now() - startedAt;
            context.steps[id] = { status: 'skipped', output: null };
            completed.add(id);
            pending.delete(id);
            return;
          }

          const output = await runStep(step, context);
          log.status = 'success';
          log.durationMs = Date.now() - startedAt;
          context.steps[id] = { status: 'success', output };
        } catch (err) {
          log.status = 'error';
          log.durationMs = Date.now() - startedAt;
          log.error = err.message;
          if (err.status) log.upstreamStatus = err.status;
          context.steps[id] = { status: 'error', output: null, error: err.message };

          const onError = step.onError || 'abort';
          if (onError === 'abort') {
            aborted = { stepId: id, message: err.message };
          }
          logger.warn(`Step "${id}" failed (onError=${onError}): ${err.message}`);
        } finally {
          completed.add(id);
          pending.delete(id);
        }
      })
    );
  }

  if (aborted) {
    return {
      success: false,
      failedStep: aborted.stepId,
      errorMessage: aborted.message,
      stepLogs,
      context,
    };
  }

  let responseBody;
  if (config.response?.expression) {
    responseBody = await evaluate(config.response.expression, context);
  } else if (config.response?.mapping) {
    responseBody = resolveValue(config.response.mapping, context);
  } else {
    responseBody = { steps: Object.fromEntries(Object.entries(context.steps).map(([k, v]) => [k, v.output])) };
  }

  return { success: true, responseBody, stepLogs, context };
}

module.exports = { executeWorkflow };
