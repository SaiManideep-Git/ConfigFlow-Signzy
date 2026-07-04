const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { workflowConfigSchema } = require('./workflowConfigSchema');

const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
addFormats(ajv);

const validateWorkflowConfig = ajv.compile(workflowConfigSchema);

// Compiled-schema cache for arbitrary request-payload schemas defined inside a workflow config,
// keyed by workflow id so we don't recompile on every request.
const requestSchemaCache = new Map();

function getRequestValidator(workflowId, schema) {
  const cacheKey = String(workflowId);
  let cached = requestSchemaCache.get(cacheKey);
  if (cached && cached.schema === schema) return cached.validate;

  const validate = schema ? ajv.compile(schema) : () => true;
  requestSchemaCache.set(cacheKey, { schema, validate });
  return validate;
}

function invalidateRequestSchemaCache(workflowId) {
  requestSchemaCache.delete(String(workflowId));
}

function formatAjvErrors(errors = []) {
  return errors.map((e) => ({
    field: e.instancePath || e.params?.missingProperty || '(root)',
    message: e.message,
    keyword: e.keyword,
  }));
}

module.exports = {
  validateWorkflowConfig,
  getRequestValidator,
  invalidateRequestSchemaCache,
  formatAjvErrors,
};
