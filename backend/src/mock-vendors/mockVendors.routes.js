const express = require('express');

const router = express.Router();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Vendor A: PAN verification -------------------------------------------------
/**
 * @openapi
 * /mock/vendor-a/verify-pan:
 *   post:
 *     summary: Mock Vendor A - PAN Verification
 *     tags: [Mock Sandbox APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pan]
 *             properties:
 *               pan: { type: string, example: "ABCDE1234F" }
 *     responses:
 *       200: { description: OK }
 */
router.post('/vendor-a/verify-pan', async (req, res) => {
  await sleep(150);
  const { pan = '' } = req.body;
  const match = pan.match(/^[A-Z]{5}([0-9]{4})[A-Z]$/);
  if (!match) {
    return res.status(200).json({ status: 'INVALID_FORMAT', pan });
  }
  const notFound = match[1].endsWith('0'); // digit block ending in 0 -> simulate "not found"
  if (notFound) return res.status(200).json({ status: 'NOT_FOUND', pan });
  return res.status(200).json({ status: 'SUCCESS', pan, nameOnPan: 'RAHUL SHARMA', panType: 'Individual' });
});

// --- Vendor B: GST lookup --------------------------------------------------------
/**
 * @openapi
 * /mock/vendor-b/gst-details:
 *   post:
 *     summary: Mock Vendor B - GST Lookup
 *     tags: [Mock Sandbox APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gstin]
 *             properties:
 *               gstin: { type: string, example: "29ABCDE1234F1Z5" }
 *     responses:
 *       200: { description: OK }
 */
router.post('/vendor-b/gst-details', async (req, res) => {
  await sleep(150);
  const { gstin = '' } = req.body;
  if (gstin.length !== 15) return res.status(200).json({ status: 'INVALID', gstin });
  return res.status(200).json({
    status: 'SUCCESS',
    gstin,
    legalName: 'Rahul Sharma Enterprises',
    registrationDate: '2019-04-01',
    filingStatus: 'ACTIVE',
  });
});

// --- Aadhaar validation ----------------------------------------------------------
/**
 * @openapi
 * /mock/aadhaar/validate:
 *   post:
 *     summary: Mock Aadhaar Validation
 *     tags: [Mock Sandbox APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aadhaar]
 *             properties:
 *               aadhaar: { type: string, example: "123456789012" }
 *     responses:
 *       200: { description: OK }
 */
router.post('/aadhaar/validate', async (req, res) => {
  await sleep(150);
  const { aadhaar = '' } = req.body;
  const valid = /^\d{12}$/.test(aadhaar) && !aadhaar.startsWith('0');
  return res.status(200).json({ valid, aadhaar, name: valid ? 'Rahul Sharma' : undefined });
});

// --- OCR extraction ----------------------------------------------------------------
/**
 * @openapi
 * /mock/ocr/extract:
 *   post:
 *     summary: Mock OCR Extraction
 *     tags: [Mock Sandbox APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentUrl]
 *             properties:
 *               documentUrl: { type: string, example: "https://example.com/doc.png" }
 *     responses:
 *       200: { description: OK }
 */
router.post('/ocr/extract', async (req, res) => {
  await sleep(200);
  const { documentUrl = '' } = req.body;
  return res.status(200).json({
    status: 'SUCCESS',
    documentUrl,
    extractedFields: { name: 'Rahul Sharma', dob: '1990-05-14', idNumber: 'ID1234567' },
  });
});

// --- Fraud detection ---------------------------------------------------------------
/**
 * @openapi
 * /mock/fraud/check:
 *   post:
 *     summary: Mock Fraud Risk Check
 *     tags: [Mock Sandbox APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Rahul Sharma" }
 *     responses:
 *       200: { description: OK }
 */
router.post('/fraud/check', async (req, res) => {
  await sleep(120);
  const { name = '' } = req.body;
  const riskScore = name.toLowerCase().includes('fraud') ? 0.92 : 0.05;
  return res.status(200).json({ status: 'SUCCESS', riskScore, flagged: riskScore > 0.5 });
});

// --- Face match ----------------------------------------------------------------------
/**
 * @openapi
 * /mock/face-match/compare:
 *   post:
 *     summary: Mock Face Match Comparison
 *     tags: [Mock Sandbox APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [selfieUrl, idPhotoUrl]
 *             properties:
 *               selfieUrl: { type: string, example: "https://example.com/selfie.png" }
 *               idPhotoUrl: { type: string, example: "https://example.com/id.png" }
 *     responses:
 *       200: { description: OK }
 */
router.post('/face-match/compare', async (req, res) => {
  await sleep(180);
  const { selfieUrl = '', idPhotoUrl = '' } = req.body;
  const match = Boolean(selfieUrl) && Boolean(idPhotoUrl);
  return res.status(200).json({ status: 'SUCCESS', match, confidence: match ? 0.97 : 0.0 });
});

// --- Flaky endpoint used to demo the retry mechanism ---------------------------------
/**
 * @openapi
 * /mock/flaky/echo:
 *   post:
 *     summary: Mock Flaky Service (Retry Demonstration)
 *     tags: [Mock Sandbox APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attemptKey, failTimes]
 *             properties:
 *               attemptKey: { type: string, example: "test-run-1" }
 *               failTimes: { type: number, example: 2 }
 *     responses:
 *       200: { description: OK }
 */
const attemptCounts = new Map();
router.post('/flaky/echo', async (req, res) => {
  const { attemptKey = 'default', failTimes = 2 } = req.body;
  const count = (attemptCounts.get(attemptKey) || 0) + 1;
  attemptCounts.set(attemptKey, count);
  await sleep(100);
  if (count <= Number(failTimes)) {
    return res.status(503).json({ status: 'TEMPORARILY_UNAVAILABLE', attempt: count });
  }
  return res.status(200).json({ status: 'SUCCESS', attempt: count, echo: req.body });
});

module.exports = router;
