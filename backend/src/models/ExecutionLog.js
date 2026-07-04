const mongoose = require('mongoose');

const executionLogSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, index: true },
    workflowName: { type: String, required: true, index: true },
    workflowVersion: { type: Number },
    method: { type: String },
    path: { type: String },
    success: { type: Boolean, required: true },
    statusCode: { type: Number },
    durationMs: { type: Number },
    requestBody: { type: mongoose.Schema.Types.Mixed },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    steps: { type: mongoose.Schema.Types.Mixed, default: [] },
    error: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

executionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ExecutionLog', executionLogSchema);
