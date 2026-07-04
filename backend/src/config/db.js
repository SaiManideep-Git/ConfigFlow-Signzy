const mongoose = require('mongoose');
const logger = require('./logger');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/configflow';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info(`MongoDB connected: ${uri}`);
  return mongoose.connection;
}

module.exports = connectDB;
