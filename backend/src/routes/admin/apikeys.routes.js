const express = require('express');
const ApiKey = require('../../models/ApiKey');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/responseEnvelope');
const { requireJwt } = require('../../middleware/auth');

const router = express.Router();
router.use(requireJwt);

/**
 * @openapi
 * /admin/api-keys:
 *   get:
 *     summary: List all API Keys
 *     tags: [Admin API Keys]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const keys = await ApiKey.find().sort({ createdAt: -1 });
    res.json(success(keys));
  })
);

module.exports = router;
