const axios = require('axios');
const { interpolateDeep, resolveValue } = require('./mapper');
const logger = require('../config/logger');

function buildAuthHeaders(auth = { type: 'none' }, context) {
  switch (auth.type) {
    case 'apiKey':
      return { [auth.headerName || 'x-api-key']: interpolateDeep(auth.token, context) };
    case 'bearer':
      return { Authorization: `Bearer ${interpolateDeep(auth.token, context)}` };
    case 'basic': {
      const user = interpolateDeep(auth.username, context);
      const pass = interpolateDeep(auth.password, context);
      return { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` };
    }
    default:
      return {};
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Invokes a single downstream "callApi" step: resolves templated url/headers/query,
// maps the request body from context, and retries on network errors or configured
// status codes with exponential backoff.
async function invokeApi(apiSpec, context, { stepId } = {}) {
  const {
    url,
    method,
    headers = {},
    query = {},
    auth = { type: 'none' },
    bodyMapping,
    timeoutMs = 5000,
    retry = {},
  } = apiSpec;

  const attempts = Math.max(0, retry.attempts || 0);
  const backoffMs = retry.backoffMs ?? 300;
  const retryOnStatus = retry.retryOnStatus || [502, 503, 504];

  const resolvedUrl = interpolateDeep(url, context);
  const resolvedHeaders = { ...interpolateDeep(headers, context), ...buildAuthHeaders(auth, context) };
  const resolvedQuery = interpolateDeep(query, context);
  const body = bodyMapping ? resolveValue(bodyMapping, context) : undefined;

  let lastError;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await axios({
        url: resolvedUrl,
        method,
        headers: resolvedHeaders,
        params: resolvedQuery,
        data: body,
        timeout: timeoutMs,
        validateStatus: () => true,
      });

      const durationMs = Date.now() - startedAt;
      const shouldRetry = retryOnStatus.includes(response.status) && attempt < attempts;
      if (shouldRetry) {
        logger.warn(`Step ${stepId}: retrying after status ${response.status}`, { attempt });
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }

      if (response.status >= 400) {
        const err = new Error(`Downstream API responded with status ${response.status}`);
        err.isDownstreamError = true;
        err.status = response.status;
        err.data = response.data;
        err.durationMs = durationMs;
        throw err;
      }

      return { status: response.status, data: response.data, durationMs, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      const isNetworkError = !err.isDownstreamError;
      if (isNetworkError && attempt < attempts) {
        logger.warn(`Step ${stepId}: retrying after network error: ${err.message}`, { attempt });
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      if (!isNetworkError) throw err; // downstream error already carries status/data, surface immediately once retries exhausted
      throw err;
    }
  }
  throw lastError;
}

module.exports = { invokeApi };
