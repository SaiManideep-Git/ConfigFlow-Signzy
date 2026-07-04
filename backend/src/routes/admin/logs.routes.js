const express = require('express');
const ExecutionLog = require('../../models/ExecutionLog');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/responseEnvelope');
const { requireJwt } = require('../../middleware/auth');

const router = express.Router();
router.use(requireJwt);

/**
 * @openapi
 * /admin/logs:
 *   get:
 *     summary: List execution logs (most recent first), optionally filtered by workflow name
 *     tags: [Admin Logs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: workflowName
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 50 }
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { workflowName, limit = 50 } = req.query;
    const query = workflowName ? { workflowName } : {};
    const logs = await ExecutionLog.find(query).sort({ createdAt: -1 }).limit(Math.min(Number(limit), 200));
    res.json(success(logs));
  })
);

/**
 * @openapi
 * /admin/logs/{id}:
 *   get:
 *     summary: Get a single execution log by id (full step-by-step trace)
 *     tags: [Admin Logs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const log = await ExecutionLog.findById(req.params.id);
    res.json(success(log));
  })
);

module.exports = router;
