function success(data, meta = {}) {
  return { success: true, data, error: null, meta: { timestamp: new Date().toISOString(), ...meta } };
}

function failure(message, code = 'INTERNAL_ERROR', details, meta = {}) {
  return {
    success: false,
    data: null,
    error: { code, message, details },
    meta: { timestamp: new Date().toISOString(), ...meta },
  };
}

module.exports = { success, failure };
