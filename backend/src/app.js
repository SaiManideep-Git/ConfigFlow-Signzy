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

app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/docs.json' } }));
app.get('/docs.json', async (req, res, next) => {
  try {
    const WorkflowConfig = require('./models/WorkflowConfig');
    const activeWorkflows = await WorkflowConfig.find({ isActive: true });
    
    // Deep clone the base swagger specification
    const spec = JSON.parse(JSON.stringify(swaggerSpec));
    
    activeWorkflows.forEach((wf) => {
      const method = wf.method.toLowerCase();
      if (!spec.paths[wf.path]) {
        spec.paths[wf.path] = {};
      }
      
      spec.paths[wf.path][method] = {
        summary: `Dynamic Workflow: ${wf.name}`,
        tags: ['Dynamic Client APIs'],
        description: wf.description || 'Config-driven custom API endpoint.',
        requestBody: wf.requestSchema ? {
          required: true,
          content: {
            'application/json': {
              schema: wf.requestSchema
            }
          }
        } : undefined,
        responses: {
          200: {
            description: 'Successful Execution',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                    error: { type: 'object', nullable: true },
                    meta: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      };
    });
    
    res.json(spec);
  } catch (err) {
    next(err);
  }
});

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
