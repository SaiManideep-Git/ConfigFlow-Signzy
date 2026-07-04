# ConfigFlow: Master API Curl Testing Cheat Sheet

This document compiles copy-pasteable `curl` commands for **every single request** configured in your Postman collection. 

---

## Base API URL
* **Production Deployed Server**: `https://configflow-signzy.onrender.com`
* **Local Development Server**: `http://localhost:4000`

---

## 1. Folder 1: Admin APIs

### Request 1.1: Admin Login (Retrieve JWT Token)
Run this first to get the `token` string for administrative requests.
```bash
curl -X POST https://configflow-signzy.onrender.com/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@configflow.local",
    "password": "ChangeMe123!"
  }'
```

### Request 1.2: List All API Keys
Retrieves active client API keys.
```bash
curl -X GET https://configflow-signzy.onrender.com/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Request 1.3: List Execution Logs
Retrieves the execution logs trace.
```bash
curl -X GET "https://configflow-signzy.onrender.com/admin/logs?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 2. Folder 2: Dynamic Client APIs

### Request 2.1: PAN Verification (Success Case)
* **API path**: `POST /verify-pan`
```bash
curl -X POST https://configflow-signzy.onrender.com/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan": "ABCDE1234F"}'
```

### Request 2.2: PAN Verification (Graceful Failure Case)
Runs PAN verification with a mock invalid payload (ends in `0`) to show error degradation.
* **API path**: `POST /verify-pan`
```bash
curl -X POST https://configflow-signzy.onrender.com/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan": "ABCDE1230F"}'
```

### Request 2.3: Identity Validation (Aadhaar Valid, Runs GST)
* **API path**: `POST /validate-identity`
```bash
curl -X POST https://configflow-signzy.onrender.com/validate-identity \
  -H "Content-Type: application/json" \
  -d '{
    "aadhaar": "123456789012",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

### Request 2.4: Identity Validation (Aadhaar Invalid, Bypasses GST)
Aadhaar starting with `0` is invalid, causing the engine to skip the GST lookup wave.
* **API path**: `POST /validate-identity`
```bash
curl -X POST https://configflow-signzy.onrender.com/validate-identity \
  -H "Content-Type: application/json" \
  -d '{
    "aadhaar": "023456789012",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

### Request 2.5: KYC Onboarding (API Key Success Case)
* **API path**: `POST /kyc-onboarding`
```bash
curl -X POST https://configflow-signzy.onrender.com/kyc-onboarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: cf_demo_f48ea30d35e1d904b6b6ec42" \
  -d '{
    "documentUrl": "https://example.com/doc.png",
    "selfieUrl": "https://example.com/selfie.png"
  }'
```

### Request 2.6: KYC Onboarding (Unauthorized Case)
* **API path**: `POST /kyc-onboarding`
```bash
curl -X POST https://configflow-signzy.onrender.com/kyc-onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "documentUrl": "https://example.com/doc.png",
    "selfieUrl": "https://example.com/selfie.png"
  }'
```

### Request 2.7: Company KYC Custom Orchestration
* **API path**: `POST /company-kyc`
```bash
curl -X POST https://configflow-signzy.onrender.com/company-kyc \
  -H "Content-Type: application/json" \
  -d '{
    "pan": "ABCDE1234F",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

---

## 3. Folder 3: Mock Sandbox APIs

### Request 3.1: Vendor A PAN Verification Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/vendor-a/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan": "ABCDE1234F"}'
```

### Request 3.2: Vendor B GST Details Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/vendor-b/gst-details \
  -H "Content-Type: application/json" \
  -d '{"gstin": "29ABCDE1234F1Z5"}'
```

### Request 3.3: Aadhaar Validation Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/aadhaar/validate \
  -H "Content-Type: application/json" \
  -d '{"aadhaar": "123456789012"}'
```

### Request 3.4: Document OCR Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/ocr/extract \
  -H "Content-Type: application/json" \
  -d '{"documentUrl": "https://example.com/doc.png"}'
```

### Request 3.5: Fraud Check Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/fraud/check \
  -H "Content-Type: application/json" \
  -d '{"name": "Rahul Sharma"}'
```

### Request 3.6: Face Match Compare Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/face-match/compare \
  -H "Content-Type: application/json" \
  -d '{
    "selfieUrl": "https://example.com/selfie.png",
    "idPhotoUrl": "https://example.com/id.png"
  }'
```

### Request 3.7: Flaky Echo (Retry Sandbox)
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/flaky/echo \
  -H "Content-Type: application/json" \
  -d '{
    "attemptKey": "test-run-1",
    "failTimes": 2
  }'
```

---

## 4. Folder 4: Config Management APIs (CRUD)

### Request 4.1: Create New Workflow Configuration (POST)
```bash
curl -X POST https://configflow-signzy.onrender.com/admin/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "validate-phone-new",
    "method": "POST",
    "path": "/validate-phone-new",
    "description": "API to check if a phone number is 10 digits",
    "authRequired": false,
    "requestSchema": {
      "type": "object",
      "required": ["phone"],
      "properties": {
        "phone": { "type": "string", "pattern": "^[0-9]{10}$" }
      },
      "additionalProperties": false
    },
    "steps": [
      {
        "id": "formatCheck",
        "name": "Format Check Step",
        "type": "transform",
        "dependsOn": [],
        "transform": {
          "expression": "{ \"phone\": input.phone, \"status\": &apos;VALID&apos; }"
        }
      }
    ],
    "response": {
      "mapping": {
        "result": "$.steps.formatCheck.output"
      }
    }
  }'
```

### Request 4.2: Get Workflow Version History (GET)
```bash
curl -X GET https://configflow-signzy.onrender.com/admin/workflows/validate-phone-new \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Request 4.3: Update & Publish Version 2 (PUT)
```bash
curl -X PUT https://configflow-signzy.onrender.com/admin/workflows/validate-phone-new \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "validate-phone-new",
    "method": "POST",
    "path": "/validate-phone-new",
    "description": "API to check if a phone number is 10 digits (v2 updated description)",
    "authRequired": false,
    "requestSchema": {
      "type": "object",
      "required": ["phone"],
      "properties": {
        "phone": { "type": "string", "pattern": "^[0-9]{10}$" }
      },
      "additionalProperties": false
    },
    "steps": [
      {
        "id": "formatCheck",
        "name": "Format Check Step",
        "type": "transform",
        "dependsOn": [],
        "transform": {
          "expression": "{ \"phone\": input.phone, \"status\": &apos;UPDATED_AND_VALID&apos; }"
        }
      }
    ],
    "response": {
      "mapping": {
        "result": "$.steps.formatCheck.output"
      }
    }
  }'
```

### Request 4.4: Activate / Rollback to Version 1 (POST)
```bash
curl -X POST https://configflow-signzy.onrender.com/admin/workflows/validate-phone-new/activate/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Request 4.5: Delete Version 2 Configuration (DELETE)
```bash
curl -X DELETE https://configflow-signzy.onrender.com/admin/workflows/validate-phone-new/2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
