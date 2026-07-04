const { v4: uuid } = require('uuid');
const WorkflowConfig = require('../../models/WorkflowConfig');
const ApiKey = require('../../models/ApiKey');
const ExecutionLog = require('../../models/ExecutionLog');
const { executeWorkflow } = require('../../engine/executor');
const { getRequestValidator, formatAjvErrors } = require('../../engine/validator');
const matchPath = require('../../utils/matchPath');
const { success, failure } = require('../../utils/responseEnvelope');
const logger = require('../../config/logger');

// In-memory cache of active workflows, refreshed lazily. This is what lets new/updated
// configs go live without a server restart or code change - the whole point of the platform.
let cache = null;

async function loadActiveWorkflows() {
  if (!cache) {
    cache = await WorkflowConfig.find({ isActive: true }).lean();
  }
  return cache;
}

function invalidateDispatchCache() {
  cache = null;
}

async function findMatchingWorkflow(method, path) {
  const workflows = await loadActiveWorkflows();
  for (const wf of workflows) {
    if (wf.method !== method) continue;
    const params = matchPath(wf.path, path);
    if (params) return { workflow: wf, params };
  }
  return null;
}

// Single catch-all middleware mounted after admin/mock-vendor routes: looks up a
// workflow for the incoming method+path and, if found, runs the whole
// validate -> orchestrate -> transform -> respond pipeline. Falls through to the
// 404 handler when nothing matches.
async function dispatcherMiddleware(req, res, next) {
  const match = await findMatchingWorkflow(req.method, req.path);
  if (!match) return next();

  const { workflow, params } = match;
  const requestId = uuid();
  const startedAt = Date.now();

  try {
    if (workflow.authRequired) {
      const key = req.headers['x-api-key'];
      if (!key) return res.status(401).json(failure('Missing x-api-key header', 'UNAUTHORIZED'));
      const record = await ApiKey.findOne({ key, isActive: true });
      if (!record) return res.status(401).json(failure('Invalid API key', 'UNAUTHORIZED'));
    }

    const validate = getRequestValidator(workflow._id, workflow.requestSchema);
    const valid = validate(req.body || {});
    if (!valid) {
      const errors = formatAjvErrors(validate.errors);
      await ExecutionLog.create({
        requestId,
        workflowName: workflow.name,
        workflowVersion: workflow.version,
        method: req.method,
        path: req.path,
        success: false,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
        requestBody: req.body,
        error: { message: 'Request validation failed', details: errors },
      });
      return res.status(400).json(failure('Request validation failed', 'VALIDATION_ERROR', errors, { requestId }));
    }

    const initialContext = {
      input: req.body || {},
      params,
      query: req.query,
      headers: { 'content-type': req.headers['content-type'] },
    };

    const result = await executeWorkflow(workflow, initialContext);
    const durationMs = Date.now() - startedAt;

    await ExecutionLog.create({
      requestId,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      method: req.method,
      path: req.path,
      success: result.success,
      statusCode: result.success ? 200 : 502,
      durationMs,
      requestBody: req.body,
      responseBody: result.success ? result.responseBody : undefined,
      steps: result.stepLogs,
      error: result.success ? undefined : { step: result.failedStep, message: result.errorMessage },
    });

    if (!result.success) {
      return res
        .status(502)
        .json(failure(`Workflow failed at step "${result.failedStep}": ${result.errorMessage}`, 'WORKFLOW_STEP_FAILED', result.stepLogs, {
          requestId,
        }));
    }

    res.json(success(result.responseBody, { requestId, workflow: workflow.name, version: workflow.version, durationMs }));
  } catch (err) {
    logger.error(`Dispatcher error for ${req.method} ${req.path}: ${err.message}`, { stack: err.stack });
    await ExecutionLog.create({
      requestId,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      method: req.method,
      path: req.path,
      success: false,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      requestBody: req.body,
      error: { message: err.message },
    }).catch(() => {});
    res.status(500).json(failure('Unexpected error while executing workflow', 'INTERNAL_ERROR', undefined, { requestId }));
  }
}

module.exports = { dispatcherMiddleware, invalidateDispatchCache };
