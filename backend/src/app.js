const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const logger = require('./config/logger');
const rateLimiter = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const swaggerSpec = require('./docs/swagger');

const authRoutes = require('./routes/admin/auth.routes');
const workflowsRoutes = require('./routes/admin/workflows.routes');
const logsRoutes = require('./routes/admin/logs.routes');
const apiKeysRoutes = require('./routes/admin/apikeys.routes');
const agentRoutes = require('./routes/agent/generate.routes');
const mockVendorRoutes = require('./mock-vendors/mockVendors.routes');
const { dispatcherMiddleware } = require('./routes/dynamic/dispatcher');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(rateLimiter);

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (req, res) => res.json(swaggerSpec));

// Admin API: manages workflow configs, execution logs, auth, and the AI generator.
app.use('/admin/auth', authRoutes);
app.use('/admin/workflows', workflowsRoutes);
app.use('/admin/logs', logsRoutes);
app.use('/admin/api-keys', apiKeysRoutes);
app.use('/agent', agentRoutes);

// Mock third-party vendors used by the sample workflow configs.
app.use('/mock', mockVendorRoutes);

// Every user-defined workflow is served here - matched dynamically against Mongo,
// not hardcoded as an Express route.
app.use(dispatcherMiddleware);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
