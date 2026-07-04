const logger = require('../config/logger');
const { failure } = require('../utils/responseEnvelope');
const AppError = require('../utils/AppError');

function notFoundHandler(req, res) {
  res.status(404).json(failure(`No route or workflow matches ${req.method} ${req.path}`, 'NOT_FOUND'));
}

// Centralized error handler: every thrown/next(err) in the app lands here so the
// client always gets the same standardized error envelope, regardless of where
// the failure originated (validation, downstream vendor, engine, auth, etc).
function errorHandler(err, req, res, next) { 
  const statusCode = err instanceof AppError ? err.statusCode : err.statusCode || 500;
  const code = err.code || (err instanceof AppError ? 'APP_ERROR' : 'INTERNAL_ERROR');

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack });
  } else {
    logger.warn(err.message);
  }

  res.status(statusCode).json(failure(err.message, code, err.details));
}

module.exports = { notFoundHandler, errorHandler };
