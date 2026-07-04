const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: 'default' },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiKey', apiKeySchema);
