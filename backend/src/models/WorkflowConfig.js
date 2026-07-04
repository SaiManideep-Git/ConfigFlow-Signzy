const mongoose = require('mongoose');

const workflowConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true }, // groups versions together (a "slug")
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: '' },
    method: { type: String, required: true, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    path: { type: String, required: true },
    authRequired: { type: Boolean, default: false },
    requestSchema: { type: mongoose.Schema.Types.Mixed, default: undefined },
    steps: { type: mongoose.Schema.Types.Mixed, required: true },
    response: { type: mongoose.Schema.Types.Mixed, default: undefined },
    errorPolicy: { type: mongoose.Schema.Types.Mixed, default: undefined },
    createdBy: { type: String, default: 'system' },
  },
  { timestamps: true }
);

// Only one active version may serve a given method+path at a time.
workflowConfigSchema.index({ method: 1, path: 1, isActive: 1 });
workflowConfigSchema.index({ name: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('WorkflowConfig', workflowConfigSchema);
