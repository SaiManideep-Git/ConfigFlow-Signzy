const express = require('express');
const WorkflowConfig = require('../../models/WorkflowConfig');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { success } = require('../../utils/responseEnvelope');
const { validateWorkflowConfig, formatAjvErrors, invalidateRequestSchemaCache } = require('../../engine/validator');
const { requireJwt } = require('../../middleware/auth');
const { invalidateDispatchCache } = require('../dynamic/dispatcher');

const router = express.Router();
router.use(requireJwt);

function assertValidConfig(body) {
  const valid = validateWorkflowConfig(body);
  if (!valid) {
    throw new AppError('Workflow configuration failed schema validation', 422, formatAjvErrors(validateWorkflowConfig.errors));
  }
  const stepIds = body.steps.map((s) => s.id);
  const duplicateIds = stepIds.filter((id, i) => stepIds.indexOf(id) !== i);
  if (duplicateIds.length) throw new AppError(`Duplicate step id(s): ${[...new Set(duplicateIds)].join(', ')}`, 422);

  for (const step of body.steps) {
    for (const dep of step.dependsOn || []) {
      if (!stepIds.includes(dep)) {
        throw new AppError(`Step "${step.id}" depends on unknown step "${dep}"`, 422);
      }
    }
  }
}

async function assertNoActiveConflict(method, path, excludeName) {
  const query = { method, path, isActive: true };
  if (excludeName) query.name = { $ne: excludeName };
  const clash = await WorkflowConfig.findOne(query);
  if (clash) {
    throw new AppError(`An active workflow "${clash.name}" (v${clash.version}) already serves ${method} ${path}`, 409);
  }
}

/**
 * @openapi
 * /admin/workflows:
 *   get:
 *     summary: List workflows (latest version of each, unless allVersions=true)
 *     tags: [Admin Workflows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (req.query.allVersions === 'true') {
      const all = await WorkflowConfig.find().sort({ name: 1, version: -1 });
      return res.json(success(all));
    }
    const latest = await WorkflowConfig.aggregate([
      { $sort: { version: -1 } },
      { $group: { _id: '$name', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { name: 1 } },
    ]);
    res.json(success(latest));
  })
);

/**
 * @openapi
 * /admin/workflows/{name}:
 *   get:
 *     summary: Get version history for a workflow
 *     tags: [Admin Workflows]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/:name',
  asyncHandler(async (req, res) => {
    const versions = await WorkflowConfig.find({ name: req.params.name }).sort({ version: -1 });
    if (!versions.length) throw new AppError(`No workflow named "${req.params.name}"`, 404);
    res.json(success(versions));
  })
);

/**
 * @openapi
 * /admin/workflows:
 *   post:
 *     summary: Create a new workflow (version 1)
 *     tags: [Admin Workflows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    assertValidConfig(req.body);
    const existing = await WorkflowConfig.findOne({ name: req.body.name });
    if (existing) throw new AppError(`Workflow "${req.body.name}" already exists. Use PUT to add a new version.`, 409);

    await assertNoActiveConflict(req.body.method, req.body.path);

    const doc = await WorkflowConfig.create({ ...req.body, version: 1, isActive: true });
    invalidateDispatchCache();
    res.status(201).json(success(doc));
  })
);

/**
 * @openapi
 * /admin/workflows/{name}:
 *   put:
 *     summary: Publish a new version of an existing workflow (auto-increments version, deactivates the previous one)
 *     tags: [Admin Workflows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.put(
  '/:name',
  asyncHandler(async (req, res) => {
    const body = { ...req.body, name: req.params.name };
    assertValidConfig(body);

    const latest = await WorkflowConfig.findOne({ name: req.params.name }).sort({ version: -1 });
    if (!latest) throw new AppError(`No workflow named "${req.params.name}". Use POST to create it first.`, 404);

    await assertNoActiveConflict(body.method, body.path, req.params.name);

    await WorkflowConfig.updateMany({ name: req.params.name }, { isActive: false });
    const doc = await WorkflowConfig.create({ ...body, version: latest.version + 1, isActive: true });
    invalidateRequestSchemaCache(latest._id);
    invalidateDispatchCache();
    res.json(success(doc));
  })
);

/**
 * @openapi
 * /admin/workflows/{name}/activate/{version}:
 *   post:
 *     summary: Roll back/forward - activate a specific historical version
 *     tags: [Admin Workflows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post(
  '/:name/activate/:version',
  asyncHandler(async (req, res) => {
    const target = await WorkflowConfig.findOne({ name: req.params.name, version: Number(req.params.version) });
    if (!target) throw new AppError('Version not found', 404);

    await assertNoActiveConflict(target.method, target.path, undefined);

    await WorkflowConfig.updateMany({ name: req.params.name }, { isActive: false });
    target.isActive = true;
    await target.save();
    invalidateDispatchCache();
    res.json(success(target));
  })
);

/**
 * @openapi
 * /admin/workflows/{name}/{version}:
 *   delete:
 *     summary: Delete a specific workflow version
 *     tags: [Admin Workflows]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.delete(
  '/:name/:version',
  asyncHandler(async (req, res) => {
    const result = await WorkflowConfig.deleteOne({ name: req.params.name, version: Number(req.params.version) });
    if (result.deletedCount === 0) throw new AppError('Version not found', 404);
    invalidateDispatchCache();
    res.json(success({ deleted: true }));
  })
);

module.exports = router;
