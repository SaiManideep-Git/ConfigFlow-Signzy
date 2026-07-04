# ConfigFlow: Sample Requests and Responses

This document provides copy-pasteable requests (in standard `curl` format) and their corresponding response payloads. You can use these to demonstrate and test the platform's features (such as dynamic routing, AJV request validation, conditional bypassing, API key authentication, and error policies).

---

## Base API URL
All curl examples point to the production server on Render:
`https://configflow-signzy.onrender.com`

> [!NOTE]
> **Postman Collection**: You can import all test cases directly into Postman by downloading the collection from your GitHub repository: **[ConfigFlow.postman_collection.json](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/ConfigFlow.postman_collection.json)**.
> 
> The collection includes pre-configured automation scripts that capture and propagate the JWT bearer token automatically on login.

---

## 1. Admin Authentication

### Login to retrieve JWT Bearer Token
* **Endpoint**: `POST /admin/auth/login`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/admin/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@configflow.local",
      "password": "ChangeMe123!"
    }'
  ```
* **Response (`200 OK`)**:
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

---

## 2. Dynamic Routing & AJV Validation

### Request Validation Failure (Invalid Input Type)
If a client sends fields that do not match the compiled AJV JSON Schema (e.g. sending a numeric PAN instead of a string matching the regex pattern):
* **Endpoint**: `POST /verify-pan`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/verify-pan \
    -H "Content-Type: application/json" \
    -d '{
      "pan": 12345
    }'
  ```
* **Response (`422 Unprocessable Entity`)**:
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "APP_ERROR",
      "message": "Validation failed",
      "details": [
        {
          "field": "/pan",
          "message": "must be string",
          "keyword": "type"
        }
      ]
    },
    "meta": {
      "timestamp": "2026-07-04T18:02:14.312Z"
    }
  }
  ```

---

## 3. Dynamic Workflow Executions

### A. verify-pan (Example 1 - Success)
Calls Vendor A mock API, extracts outputs, and shapes the final response structure.
* **Endpoint**: `POST /verify-pan`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/verify-pan \
    -H "Content-Type: application/json" \
    -d '{
      "pan": "ABCDE1234F"
    }'
  ```
* **Response (`200 OK`)**:
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

### B. verify-pan (Example 1 - Mock Partner Error)
Triggers a mock error in Vendor A (simulated by ending the PAN number block with a `0`).
* **Endpoint**: `POST /verify-pan`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/verify-pan \
    -H "Content-Type: application/json" \
    -d '{
      "pan": "ABCDE1230F"
    }'
  ```
* **Response (`200 OK` - Graceful degradation)**:
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

---

## 4. Conditional Bypassing (`runIf`)

### A. validate-identity (Example 2 - Aadhaar Valid, Executes GST)
* **Endpoint**: `POST /validate-identity`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/validate-identity \
    -H "Content-Type: application/json" \
    -d '{
      "aadhaar": "123456789012",
      "gstin": "29ABCDE1234F1Z5"
    }'
  ```
* **Response (`200 OK`)**:
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

### B. validate-identity (Example 2 - Aadhaar Invalid, Bypasses GST)
Since the Aadhaar begins with `0` (simulated invalid), the Aadhaar check fails, and the engine automatically skips calling the GST vendor step.
* **Endpoint**: `POST /validate-identity`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/validate-identity \
    -H "Content-Type: application/json" \
    -d '{
      "aadhaar": "023456789012",
      "gstin": "29ABCDE1234F1Z5"
    }'
  ```
* **Response (`200 OK`)**:
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

---

## 5. API Key Client Authentication

### A. kyc-onboarding (Example 3 - Unauthorized Request)
The client attempts to request an onboarding process without providing the authentication key header.
* **Endpoint**: `POST /kyc-onboarding`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/kyc-onboarding \
    -H "Content-Type: application/json" \
    -d '{
      "documentUrl": "https://example.com/doc.png",
      "selfieUrl": "https://example.com/selfie.png"
    }'
  ```
* **Response (`401 Unauthorized`)**:
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

### B. kyc-onboarding (Example 3 - Authorized Success)
The client provides the active API key inside the `x-api-key` header.
* **Endpoint**: `POST /kyc-onboarding`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/kyc-onboarding \
    -H "Content-Type: application/json" \
    -H "x-api-key: cf_demo_f48ea30d35e1d904b6b6ec42" \
    -d '{
      "documentUrl": "https://example.com/doc.png",
      "selfieUrl": "https://example.com/selfie.png"
    }'
  ```
* **Response (`200 OK`)**:
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

---

## 6. Custom Orchestration Case

### company-kyc (Your custom workflow)
Orchestrates PAN verification and GST lookup sequentially, returning a single, unified KYC verdict.
* **Endpoint**: `POST /company-kyc`
* **Request**:
  ```bash
  curl -X POST https://configflow-signzy.onrender.com/company-kyc \
    -H "Content-Type: application/json" \
    -d '{
      "pan": "ABCDE1234F",
      "gstin": "29ABCDE1234F1Z5"
    }'
  ```
* **Response (`200 OK`)**:
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
