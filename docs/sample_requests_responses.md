# ConfigFlow: API Curl Testing Sheet

This document compiles copy-pasteable `curl` commands and their exact expected JSON response payloads for **every single request** in the ConfigFlow system.

---

## Base API URL
* **Production Deployed Server**: `https://configflow-signzy.onrender.com`
* **Local Development Server**: `http://localhost:4000`

---

## 1. Folder 1: Admin APIs

### Request 1.1: Admin Login (Retrieve JWT Token)
Run this first to obtain the authentication token.
```bash
curl -X POST https://configflow-signzy.onrender.com/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@configflow.local",
    "password": "ChangeMe123!"
  }'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YTQ5NDA2Mzk0NTJmODgwN2E2ZjE3NmUiLCJlbWFpbCI6ImFkbWluQGNvbmZpZ2Zsb3cubG9jYWwiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODMxOTE4NzMsImV4cCI6MTc4MzIyMDY3M30.3SAtCeoaLMH8rbFM52cCY6X4LmgylViCWapgpH9s71w",
      "email": "admin@configflow.local",
      "role": "admin"
    },
    "error": null,
    "meta": {
      "timestamp": "2026-07-04T19:04:33.161Z"
    }
  }
  ```

### Request 1.2: List All API Keys
Retrieves active client API keys.
```bash
curl -X GET https://configflow-signzy.onrender.com/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b2f...",
        "key": "cf_demo_f48ea30d35e1d904b6b6ec42",
        "label": "demo",
        "isActive": true,
        "createdAt": "2026-07-04T10:32:18Z"
      }
    ],
    "error": null,
    "meta": null
  }
  ```

### Request 1.3: List Execution Logs
Retrieves the execution logs trace.
```bash
curl -X GET "https://configflow-signzy.onrender.com/admin/logs?limit=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b5f...",
        "requestId": "9f65b4ad-5190-4f10-ae6b-b825282b826a",
        "workflowName": "company-kyc",
        "method": "POST",
        "path": "/company-kyc",
        "success": true,
        "statusCode": 200,
        "durationMs": 289,
        "steps": {
          "step1": {
            "status": "SUCCESS",
            "output": {
              "status": "SUCCESS",
              "pan": "ABCDE1234F",
              "nameOnPan": "RAHUL SHARMA",
              "panType": "Individual"
            }
          },
          "step2": {
            "status": "SUCCESS",
            "output": {
              "status": "SUCCESS",
              "gstin": "29ABCDE1234F1Z5",
              "legalName": "Rahul Sharma Enterprises",
              "filingStatus": "ACTIVE"
            }
          },
          "step3": {
            "status": "SUCCESS",
            "output": {
              "directorName": "RAHUL SHARMA",
              "companyName": "Rahul Sharma Enterprises",
              "panStatus": "SUCCESS",
              "gstStatus": "ACTIVE",
              "verdict": "VERIFIED"
            }
          }
        },
        "createdAt": "2026-07-04T17:51:54.748Z"
      }
    ],
    "error": null,
    "meta": null
  }
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
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "result": {
        "verified": true,
        "pan": "ABCDE1234F",
        "name": "RAHUL SHARMA",
        "vendorStatus": "SUCCESS"
      }
    },
    "meta": {
      "timestamp": "2026-07-04T18:03:10.120Z",
      "requestId": "9f65b4ad-5190-4f10-ae6b-b825282b826a",
      "workflow": "verify-pan",
      "version": 1,
      "durationMs": 178
    }
  }
  ```

### Request 2.2: PAN Verification (Graceful Failure Case)
* **API path**: `POST /verify-pan`
```bash
curl -X POST https://configflow-signzy.onrender.com/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan": "ABCDE1230F"}'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "result": {
        "verified": false,
        "pan": "ABCDE1230F",
        "name": null,
        "vendorStatus": "NOT_FOUND"
      }
    },
    "meta": {
      "timestamp": "2026-07-04T18:03:42.312Z",
      "requestId": "1f85b4ad-5190-4f10-ae6b-c825282b826a",
      "workflow": "verify-pan",
      "version": 1,
      "durationMs": 172
    }
  }
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
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "result": {
        "identityValid": true,
        "name": "Rahul Sharma",
        "gst": {
          "status": "SUCCESS",
          "gstin": "29ABCDE1234F1Z5",
          "legalName": "Rahul Sharma Enterprises",
          "filingStatus": "ACTIVE"
        }
      }
    },
    "meta": {
      "timestamp": "2026-07-04T18:05:12.110Z",
      "requestId": "2f95b4ad-5190-4f10-ae6b-d825282b826a",
      "workflow": "validate-identity",
      "version": 1,
      "durationMs": 284
    }
  }
  ```

### Request 2.4: Identity Validation (Aadhaar Invalid, Bypasses GST)
* **API path**: `POST /validate-identity`
```bash
curl -X POST https://configflow-signzy.onrender.com/validate-identity \
  -H "Content-Type: application/json" \
  -d '{
    "aadhaar": "023456789012",
    "gstin": "29ABCDE1234F1Z5"
  }'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "result": {
        "identityValid": false,
        "name": null,
        "gst": null
      }
    },
    "meta": {
      "timestamp": "2026-07-04T18:06:02.128Z",
      "requestId": "4f95b4ad-5190-4f10-ae6b-d825282b826a",
      "workflow": "validate-identity",
      "version": 1,
      "durationMs": 164
    }
  }
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
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "kyc": {
        "name": "Rahul Sharma",
        "fraudFlagged": false,
        "faceMatch": true,
        "decision": "APPROVED"
      }
    },
    "meta": {
      "timestamp": "2026-07-04T18:08:14.212Z",
      "requestId": "f85b4ad-5190-4f10-ae6b-b825282b826a",
      "workflow": "kyc-onboarding",
      "version": 1,
      "durationMs": 422
    }
  }
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
* **Expected Response (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Missing API key in x-api-key header"
    },
    "meta": {
      "timestamp": "2026-07-04T18:07:44.200Z"
    }
  }
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
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "kycResult": {
        "directorName": "RAHUL SHARMA",
        "companyName": "Rahul Sharma Enterprises",
        "panStatus": "SUCCESS",
        "gstStatus": "ACTIVE",
        "verdict": "VERIFIED"
      }
    },
    "meta": {
      "timestamp": "2026-07-04T18:10:48.330Z",
      "requestId": "3f95b4ad-5190-4f10-ae6b-a825282b826a",
      "workflow": "company-kyc",
      "version": 3,
      "durationMs": 289
    }
  }
  ```

---

## 3. Folder 3: Mock Sandbox APIs

### Request 3.1: Vendor A PAN Verification Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/vendor-a/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan": "ABCDE1234F"}'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "status": "SUCCESS",
    "pan": "ABCDE1234F",
    "nameOnPan": "RAHUL SHARMA",
    "panType": "Individual"
  }
  ```

### Request 3.2: Vendor B GST Details Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/vendor-b/gst-details \
  -H "Content-Type: application/json" \
  -d '{"gstin": "29ABCDE1234F1Z5"}'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "status": "SUCCESS",
    "gstin": "29ABCDE1234F1Z5",
    "legalName": "Rahul Sharma Enterprises",
    "registrationDate": "2019-04-01",
    "filingStatus": "ACTIVE"
  }
  ```

### Request 3.3: Aadhaar Validation Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/aadhaar/validate \
  -H "Content-Type: application/json" \
  -d '{"aadhaar": "123456789012"}'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "valid": true,
    "aadhaar": "123456789012",
    "name": "Rahul Sharma"
  }
  ```

### Request 3.4: Document OCR Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/ocr/extract \
  -H "Content-Type: application/json" \
  -d '{"documentUrl": "https://example.com/doc.png"}'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "status": "SUCCESS",
    "documentUrl": "https://example.com/doc.png",
    "extractedFields": {
      "name": "Rahul Sharma",
      "dob": "1990-05-14",
      "idNumber": "ID1234567"
    }
  }
  ```

### Request 3.5: Fraud Check Mock
```bash
curl -X POST https://configflow-signzy.onrender.com/mock/fraud/check \
  -H "Content-Type: application/json" \
  -d '{"name": "Rahul Sharma"}'
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "status": "SUCCESS",
    "riskScore": 0.05,
    "flagged": false
  }
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
* **Expected Response (`200 OK`)**:
  ```json
  {
    "status": "SUCCESS",
    "match": true,
    "confidence": 0.97
  }
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
* **Expected Response (`503 Service Unavailable` on runs 1-2)**:
  ```json
  {
    "status": "TEMPORARILY_UNAVAILABLE",
    "attempt": 1
  }
  ```
* **Expected Response (`200 OK` on run 3+)**:
  ```json
  {
    "status": "SUCCESS",
    "attempt": 3,
    "echo": {
      "attemptKey": "test-run-1",
      "failTimes": 2
    }
  }
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
* **Expected Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "validate-phone-new",
      "version": 1,
      "isActive": true,
      "method": "POST",
      "path": "/validate-phone-new",
      "authRequired": false,
      "steps": [ ... ],
      "response": { ... }
    },
    "error": null,
    "meta": null
  }
  ```

### Request 4.2: Get Workflow Version History (GET)
```bash
curl -X GET https://configflow-signzy.onrender.com/admin/workflows/validate-phone-new \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "name": "validate-phone-new",
        "version": 1,
        "isActive": true,
        "method": "POST",
        "path": "/validate-phone-new"
      }
    ],
    "error": null,
    "meta": null
  }
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
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "validate-phone-new",
      "version": 2,
      "isActive": true,
      "description": "API to check if a phone number is 10 digits (v2 updated description)"
    },
    "error": null,
    "meta": null
  }
  ```

### Request 4.4: Activate / Rollback to Version 1 (POST)
```bash
curl -X POST https://configflow-signzy.onrender.com/admin/workflows/validate-phone-new/activate/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "validate-phone-new",
      "version": 1,
      "isActive": true
    },
    "error": null,
    "meta": null
  }
  ```

### Request 4.5: Delete Version 2 Configuration (DELETE)
```bash
curl -X DELETE https://configflow-signzy.onrender.com/admin/workflows/validate-phone-new/2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
* **Expected Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "deleted": true
    },
    "error": null,
    "meta": null
  }
  ```
