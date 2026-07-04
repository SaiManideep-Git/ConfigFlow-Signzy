const rateLimit = require('express-rate-limit');
const { failure } = require('../utils/responseEnvelope');

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(failure('Too many requests, please try again later.', 'RATE_LIMITED'));
  },
});

module.exports = limiter;
