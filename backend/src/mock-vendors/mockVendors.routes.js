const express = require('express');

const router = express.Router();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Vendor A: PAN verification -------------------------------------------------
// Deterministic mock: PANs ending in the digit '0' are treated as "not found".
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
router.post('/aadhaar/validate', async (req, res) => {
  await sleep(150);
  const { aadhaar = '' } = req.body;
  const valid = /^\d{12}$/.test(aadhaar) && !aadhaar.startsWith('0');
  return res.status(200).json({ valid, aadhaar, name: valid ? 'Rahul Sharma' : undefined });
});

// --- OCR extraction ----------------------------------------------------------------
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
router.post('/fraud/check', async (req, res) => {
  await sleep(120);
  const { name = '' } = req.body;
  const riskScore = name.toLowerCase().includes('fraud') ? 0.92 : 0.05;
  return res.status(200).json({ status: 'SUCCESS', riskScore, flagged: riskScore > 0.5 });
});

// --- Face match ----------------------------------------------------------------------
router.post('/face-match/compare', async (req, res) => {
  await sleep(180);
  const { selfieUrl = '', idPhotoUrl = '' } = req.body;
  const match = Boolean(selfieUrl) && Boolean(idPhotoUrl);
  return res.status(200).json({ status: 'SUCCESS', match, confidence: match ? 0.97 : 0.0 });
});

// --- Flaky endpoint used to demo the retry mechanism ---------------------------------
// Fails with 503 on the first `failTimes` calls sharing the same `attemptKey`, then
// succeeds - lets sample-configs/*.json show a retry policy actually recovering.
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
