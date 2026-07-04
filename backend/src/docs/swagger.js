const swaggerJsdoc = require('swagger-jsdoc');

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ConfigFlow API',
      version: '1.0.0',
      description:
        'Configuration-driven API orchestration platform. The /admin/* routes manage workflow configs, ' +
        'logs and the AI generator; every workflow you define shows up as its own live endpoint at the path/method you gave it.',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
      },
    },
  },
  apis: ['./src/routes/admin/*.js', './src/routes/agent/*.js'],
});

module.exports = spec;
