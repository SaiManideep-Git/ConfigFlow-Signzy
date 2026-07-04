const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const { success } = require('../../utils/responseEnvelope');
const { requireJwt } = require('../../middleware/auth');
const { validateWorkflowConfig, formatAjvErrors } = require('../../engine/validator');

const router = express.Router();
router.use(requireJwt);

const SYSTEM_PROMPT = `You are the Agentic AI feature of ConfigFlow, a low-code API orchestration platform.
Your job: convert a plain-English description of an integration into a single valid ConfigFlow "workflow config" JSON object.

A workflow config has this shape:
{
  "name": "kebab-or-camel-slug",
  "description": "string",
  "method": "GET"|"POST"|"PUT"|"PATCH"|"DELETE",
  "path": "/some-path",
  "authRequired": boolean,
  "requestSchema": <JSON Schema for the incoming request body>,
  "steps": [
    {
      "id": "shortStepId",
      "name": "human readable name",
      "type": "callApi" | "transform",
      "dependsOn": ["otherStepId"],           // omit or [] if it can run first
      "runIf": "jsonata boolean expression",   // OPTIONAL - only run this step if true, e.g. "steps.vendorA.output.status = 'SUCCESS'"
      "onError": "abort" | "skip" | "continue", // OPTIONAL, default "abort"
      "api": {                                  // required when type = "callApi"
        "url": "https://.../path or a mock vendor path like http://localhost:4000/mock/vendor-a/verify-pan",
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "auth": { "type": "none" | "apiKey" | "bearer" | "basic", "headerName": "x-api-key", "token": "..." },
        "bodyMapping": { "targetField": "$.input.sourceField or literal value" },
        "timeoutMs": 5000,
        "retry": { "attempts": 2, "backoffMs": 300, "retryOnStatus": [502, 503, 504] }
      },
      "transform": { "expression": "jsonata expression" } // required when type = "transform"
    }
  ],
  "response": {
    "mapping": { "field": "$.steps.someStep.output.value or literal" }
    // OR, for complex merges: "expression": "jsonata expression over { input, steps }"
  }
}

Mapping-value syntax (used in bodyMapping / response.mapping): a string starting with "$." is a dot-path lookup
into the execution context (context.input.*, context.steps.<id>.output.*, context.params.*); any other string is a literal.

The mock vendor APIs available for demos live at these exact paths (assume backend base URL http://localhost:4000):
- POST /mock/vendor-a/verify-pan          body: { pan }               -> { status, pan, nameOnPan, panType }
- POST /mock/vendor-b/gst-details         body: { gstin }             -> { status, gstin, legalName, registrationDate, filingStatus }
- POST /mock/aadhaar/validate             body: { aadhaar }           -> { valid, aadhaar, name }
- POST /mock/ocr/extract                  body: { documentUrl }       -> { status, extractedFields: { name, dob, idNumber } }
- POST /mock/fraud/check                  body: { name }              -> { status, riskScore, flagged }
- POST /mock/face-match/compare           body: { selfieUrl, idPhotoUrl } -> { status, match, confidence }

Rules:
- Respond with ONLY the JSON object (no markdown fences, no prose, no explanation).
- Prefer wiring steps to the mock vendor endpoints above when the user's description matches one of them.
- Every step id referenced in "dependsOn" or in a "runIf"/mapping/transform expression must exist in "steps".
- Keep it minimal and correct rather than elaborate.`;

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

/**
 * @openapi
 * /agent/generate-workflow:
 *   post:
 *     summary: Agentic AI - convert a natural-language description into a validated workflow config
 *     tags: [Agentic AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description]
 *             properties:
 *               description: { type: string, example: "Create an API that validates a PAN using Vendor A and, if successful, fetches GST details from Vendor B." }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  '/generate-workflow',
  asyncHandler(async (req, res) => {
    const { description } = req.body;
    if (!description || typeof description !== 'string') {
      throw new AppError('description (string) is required', 400);
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new AppError(
        'Agentic AI is not configured on this server: set ANTHROPIC_API_KEY in backend/.env to enable natural-language workflow generation.',
        503,
        { code: 'AGENT_NOT_CONFIGURED' }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

    let lastError;
    let generated;
    // Up to 2 attempts: if the first generation fails our own AJV validation, feed the
    // errors back to the model once and ask it to correct itself.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const userMessage =
        attempt === 0
          ? `Generate a workflow config for: ${description}`
          : `Your previous JSON failed validation with these errors: ${JSON.stringify(
              lastError
            )}. Here was your previous output: ${JSON.stringify(generated)}. Fix it and return corrected JSON only.`;

      const response = await client.messages.create({
        model,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
      try {
        generated = extractJson(text);
      } catch (err) {
        lastError = [{ message: `Model did not return valid JSON: ${err.message}` }];
        continue;
      }

      const valid = validateWorkflowConfig(generated);
      if (valid) {
        return res.json(success({ workflowConfig: generated, attempts: attempt + 1 }));
      }
      lastError = formatAjvErrors(validateWorkflowConfig.errors);
    }

    throw new AppError('Agent could not produce a valid workflow config after 2 attempts', 422, lastError);
  })
);

module.exports = router;
