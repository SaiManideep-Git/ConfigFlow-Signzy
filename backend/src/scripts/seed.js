require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../config/logger');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const WorkflowConfig = require('../models/WorkflowConfig');
const { validateWorkflowConfig, formatAjvErrors } = require('../engine/validator');

const SAMPLE_CONFIGS_DIR = path.join(__dirname, '..', '..', '..', 'sample-configs');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@configflow.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await User.findOne({ email });
  if (existing) {
    logger.info(`Admin user already exists: ${email}`);
    return;
  }
  const passwordHash = await User.hashPassword(password);
  await User.create({ email, passwordHash, role: 'admin' });
  logger.info(`Created admin user: ${email} / ${password}`);
}

async function seedApiKey() {
  const existing = await ApiKey.findOne({ label: 'demo' });
  if (existing) {
    logger.info(`Demo API key already exists: ${existing.key}`);
    return existing.key;
  }
  const key = `cf_demo_${crypto.randomBytes(16).toString('hex')}`;
  await ApiKey.create({ key, label: 'demo' });
  logger.info(`Created demo API key: ${key}`);
  return key;
}

async function seedWorkflows() {
  const files = fs.readdirSync(SAMPLE_CONFIGS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const config = JSON.parse(fs.readFileSync(path.join(SAMPLE_CONFIGS_DIR, file), 'utf8'));

    const valid = validateWorkflowConfig(config);
    if (!valid) {
      logger.error(`Sample config ${file} failed validation`, { errors: formatAjvErrors(validateWorkflowConfig.errors) });
      continue;
    }

    const existing = await WorkflowConfig.findOne({ name: config.name });
    if (existing) {
      logger.info(`Workflow "${config.name}" already seeded, skipping`);
      continue;
    }

    await WorkflowConfig.create({ ...config, version: 1, isActive: true, createdBy: 'seed' });
    logger.info(`Seeded workflow "${config.name}" -> ${config.method} ${config.path}`);
  }
}

async function main() {
  await connectDB();
  await seedAdmin();
  await seedApiKey();
  await seedWorkflows();
  await mongoose.disconnect();
  logger.info('Seed complete.');
}

main().catch((err) => {
  logger.error(`Seed failed: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
