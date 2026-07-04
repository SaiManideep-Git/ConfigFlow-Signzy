const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const ApiKey = require('../models/ApiKey');

// Protects the admin config/logs API - requires a valid JWT issued by /admin/auth/login.
function requireJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError('Missing bearer token', 401));

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401));
  }
}

// Protects generated endpoints that opted into `authRequired: true` - a simple
// API-key model (header: x-api-key), independent from the admin JWT.
async function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return next(new AppError('Missing x-api-key header', 401));

  const record = await ApiKey.findOne({ key, isActive: true });
  if (!record) return next(new AppError('Invalid API key', 401));

  record.lastUsedAt = new Date();
  await record.save();
  next();
}

module.exports = { requireJwt, requireApiKey };
