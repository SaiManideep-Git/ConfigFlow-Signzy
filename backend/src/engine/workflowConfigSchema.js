// Meta-schema: describes what a *valid workflow configuration document* looks like.
// This is what lets users "define an API using configuration" instead of code -
// every workflow saved through the admin API is validated against this shape.

const stepSchema = {
  type: 'object',
  required: ['id', 'type'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9_]*$' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['callApi', 'transform'] },
    dependsOn: { type: 'array', items: { type: 'string' }, default: [] },
    runIf: { type: 'string' }, // jsonata boolean expression, evaluated against execution context
    onError: { type: 'string', enum: ['abort', 'skip', 'continue'], default: 'abort' },
    api: {
      type: 'object',
      required: ['url', 'method'],
      additionalProperties: false,
      properties: {
        url: { type: 'string' }, // may contain {{input.x}} / {{steps.x.output.y}} templates
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        query: { type: 'object', additionalProperties: { type: 'string' } },
        auth: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: { type: 'string', enum: ['none', 'apiKey', 'bearer', 'basic'] },
            headerName: { type: 'string' },
            token: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        bodyMapping: { type: 'object' }, // dot-path / literal mapping spec -> request body
        timeoutMs: { type: 'number', default: 5000 },
        retry: {
          type: 'object',
          additionalProperties: false,
          properties: {
            attempts: { type: 'number', minimum: 0, default: 0 },
            backoffMs: { type: 'number', minimum: 0, default: 300 },
            retryOnStatus: { type: 'array', items: { type: 'number' } },
          },
        },
      },
    },
    transform: {
      type: 'object',
      required: ['expression'],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' }, // jsonata expression evaluated against context
      },
    },
  },
  allOf: [
    {
      if: { properties: { type: { const: 'callApi' } } },
      then: { required: ['api'] },
    },
    {
      if: { properties: { type: { const: 'transform' } } },
      then: { required: ['transform'] },
    },
  ],
};

const workflowConfigSchema = {
  $id: 'workflowConfig',
  type: 'object',
  required: ['name', 'method', 'path', 'steps'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9-_]*$' },
    description: { type: 'string' },
    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    path: { type: 'string', pattern: '^/' },
    authRequired: { type: 'boolean', default: false },
    requestSchema: { type: 'object' }, // JSON Schema used to validate incoming payloads
    createdBy: { type: 'string' },
    steps: { type: 'array', items: stepSchema, minItems: 1 },
    response: {
      type: 'object',
      additionalProperties: false,
      properties: {
        expression: { type: 'string' }, // jsonata expression (wins if present)
        mapping: { type: 'object' }, // simple dot-path/literal mapping (fallback)
      },
    },
    errorPolicy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        onFailure: { type: 'string', enum: ['abort'], default: 'abort' },
      },
    },
  },
};

module.exports = { workflowConfigSchema, stepSchema };
