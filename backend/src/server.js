require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`ConfigFlow backend listening on port ${PORT}`);
    logger.info(`Swagger docs at http://localhost:${PORT}/docs`);
  });
}

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
