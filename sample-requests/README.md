# Sample requests

These assume the stack is running via `docker-compose up` (or `npm run dev` in both
`backend/` and `frontend/`) and that `npm run seed` has been run inside `backend/`
(this creates the admin user, a demo API key, and loads `sample-configs/*.json`).

Backend base URL: `http://localhost:4000`

## 1. Admin login

```bash
curl -s -X POST http://localhost:4000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@configflow.local","password":"ChangeMe123!"}'
```

Copy the returned `data.token` into `$TOKEN` for the requests below:

```bash
export TOKEN="paste-the-jwt-here"
```

## 2. List workflows

```bash
curl -s http://localhost:4000/admin/workflows -H "Authorization: Bearer $TOKEN"
```

## 3. Example 1 - Verify PAN (Client -> Vendor A -> Transform -> Return)

```bash
curl -s -X POST http://localhost:4000/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan":"ABCDE1234F"}'
```

Expected: `{"success":true,"data":{"result":{"verified":true,"pan":"ABCDE1234F","name":"RAHUL SHARMA","vendorStatus":"SUCCESS"}}, ...}`

Try a PAN whose 4-digit block ends in 0 (e.g. `ABCDE1230F`) to see the `NOT_FOUND` branch.

## 4. Example 2 - Validate identity (Aadhaar -> conditional GST -> merge)

```bash
curl -s -X POST http://localhost:4000/validate-identity \
  -H "Content-Type: application/json" \
  -d '{"aadhaar":"123456789012","gstin":"29ABCDE1234F1Z5"}'
```

Try an aadhaar starting with `0` (invalid) to see the GST step get skipped via `runIf`:

```bash
curl -s -X POST http://localhost:4000/validate-identity \
  -H "Content-Type: application/json" \
  -d '{"aadhaar":"023456789012","gstin":"29ABCDE1234F1Z5"}'
```

## 5. Example 3 - KYC onboarding (OCR -> parallel fraud+face-match -> aggregate)

This workflow has `authRequired: true`, so you need the demo API key printed by
`npm run seed` (or fetch it from Mongo: `db.apikeys.findOne({label:"demo"})`).

```bash
curl -s -X POST http://localhost:4000/kyc-onboarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"documentUrl":"https://example.com/doc.png","selfieUrl":"https://example.com/selfie.png"}'
```

## 6. Retry mechanism demo

Calls a mock endpoint that fails twice then succeeds - watch the backend logs to see
the retry/backoff in action.

```bash
curl -s -X POST http://localhost:4000/retry-demo \
  -H "Content-Type: application/json" \
  -d '{"attemptKey":"demo-run-1"}'
```

## 7. Agentic AI - generate a workflow from a description

Requires `ANTHROPIC_API_KEY` set in `backend/.env`.

```bash
curl -s -X POST http://localhost:4000/agent/generate-workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"Create an API that validates a PAN using Vendor A and, if successful, fetches GST details from Vendor B."}'
```

## 8. Create a workflow via the admin API directly

```bash
curl -s -X POST http://localhost:4000/admin/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @../sample-configs/verify-pan.json
```

## 9. Execution logs

```bash
curl -s "http://localhost:4000/admin/logs?limit=10" -H "Authorization: Bearer $TOKEN"
```
