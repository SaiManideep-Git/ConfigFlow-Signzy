# ConfigFlow: REST API Documentation Reference

This document provides a clear, concise, and complete API reference for the ConfigFlow platform. 

---

## Base URL
* **Local Development**: `http://localhost:4000`
* **Production (Render)**: `https://configflow-signzy.onrender.com`

---

## 1. Admin Authentication APIs

### Admin Login
Authenticates an administrator and returns a JWT token for administrative actions.
* **Method**: `POST`
* **Path**: `/admin/auth/login`
* **Auth**: None
* **Request Headers**:
  - `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "admin@configflow.local",
    "password": "ChangeMe123!"
  }
  ```
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "email": "admin@configflow.local",
      "role": "admin"
    },
    "error": null,
    "meta": null
  }
  ```

---

## 2. Admin Workflows Management APIs
All endpoints in this section require the JWT bearer token in the headers:
- `Authorization: Bearer <JWT_TOKEN>`

### List Workflows
Retrieves the latest version of all workflows, or all versions if requested.
* **Method**: `GET`
* **Path**: `/admin/workflows`
* **Query Parameters**:
  - `allVersions` (boolean, optional): Set to `true` to fetch full historical versions instead of just the latest active versions.
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "name": "verify-pan",
        "version": 1,
        "isActive": true,
        "method": "POST",
        "path": "/verify-pan",
        "authRequired": false,
        "steps": [ ... ]
      }
    ],
    "error": null,
    "meta": null
  }
  ```

### Get Workflow Versions History
Retrieves all versions of a specific workflow, ordered by version descending.
* **Method**: `GET`
* **Path**: `/admin/workflows/:name`
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      { "name": "verify-pan", "version": 2, "isActive": true },
      { "name": "verify-pan", "version": 1, "isActive": false }
    ],
    "error": null,
    "meta": null
  }
  ```

### Create Workflow Configuration
Registers a new dynamic API endpoint (version 1) and sets it active.
* **Method**: `POST`
* **Path**: `/admin/workflows`
* **Request Body**: A workflow config JSON object.
* **Response Body (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "verify-pan",
      "version": 1,
      "isActive": true,
      "method": "POST",
      "path": "/verify-pan",
      "steps": [ ... ]
    },
    "error": null,
    "meta": null
  }
  ```

### Publish New Workflow Version
Increments the version number of an existing workflow, saves the config, makes it the active version, and deactivates the previous one.
* **Method**: `PUT`
* **Path**: `/admin/workflows/:name`
* **Request Body**: A workflow config JSON.
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "verify-pan",
      "version": 2,
      "isActive": true,
      "steps": [ ... ]
    },
    "error": null,
    "meta": null
  }
  ```

### Rollback / Activate Specific Version
Activates a historical version of a workflow and deactivates the currently active one.
* **Method**: `POST`
* **Path**: `/admin/workflows/:name/activate/:version`
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "verify-pan",
      "version": 1,
      "isActive": true
    },
    "error": null,
    "meta": null
  }
  ```

### Delete Workflow Version
Deletes a specific version of a workflow from the database.
* **Method**: `DELETE`
* **Path**: `/admin/workflows/:name/:version`
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": { "deleted": true },
    "error": null,
    "meta": null
  }
  ```

---

## 3. Admin Execution Logs & API Keys APIs
Require header: `Authorization: Bearer <JWT_TOKEN>`

### List Execution Logs
Retrieves the history of all requests matching dynamic endpoints.
* **Method**: `GET`
* **Path**: `/admin/logs`
* **Query Parameters**:
  - `limit` (number, optional, default 20)
  - `skip` (number, optional, default 0)
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "requestId": "9f65b4ad-...",
        "workflowName": "company-kyc",
        "method": "POST",
        "path": "/company-kyc",
        "success": true,
        "statusCode": 200,
        "durationMs": 289,
        "steps": [ ... ]
      }
    ],
    "error": null,
    "meta": null
  }
  ```

### List API Keys
Retrieves the list of active client API keys.
* **Method**: `GET`
* **Path**: `/admin/api-keys`
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60c72b2f...",
        "key": "cf_demo_f48ea3...",
        "label": "demo",
        "isActive": true,
        "createdAt": "2026-07-04T10:32:18Z"
      }
    ],
    "error": null,
    "meta": null
  }
  ```

---

## 4. Agentic AI API
Require header: `Authorization: Bearer <JWT_TOKEN>`

### Generate Workflow Config from Description
Takes a plain-English prompt and returns a validated JSON configuration object matching the platform's schema.
* **Method**: `POST`
* **Path**: `/agent/generate-workflow`
* **Request Body**:
  ```json
  {
    "description": "Create an API that validates a PAN using Vendor A and, if successful, fetches GST details from Vendor B."
  }
  ```
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "workflowConfig": {
        "name": "pan-gst-lookup",
        "method": "POST",
        "path": "/pan-gst-lookup",
        "steps": [ ... ],
        "response": { ... }
      },
      "attempts": 1
    },
    "error": null,
    "meta": null
  }
  ```

---

## 5. Mock Vendor APIs
These mimic third-party servers. They are open endpoints with **No Auth** required.

### PAN Verification
* **Method**: `POST`
* **Path**: `/mock/vendor-a/verify-pan`
* **Request Body**:
  ```json
  { "pan": "ABCDE1234F" }
  ```
* **Response Body (Success)**:
  ```json
  { "status": "SUCCESS", "pan": "ABCDE1234F", "nameOnPan": "RAHUL SHARMA", "panType": "Individual" }
  ```
* **Response Body (Not Found - if PAN ends with 0)**:
  ```json
  { "status": "NOT_FOUND", "pan": "ABCDE1230F" }
  ```

### GST Lookup
* **Method**: `POST`
* **Path**: `/mock/vendor-b/gst-details`
* **Request Body**:
  ```json
  { "gstin": "29ABCDE1234F1Z5" }
  ```
* **Response Body**:
  ```json
  { "status": "SUCCESS", "gstin": "29ABCDE1234F1Z5", "legalName": "Rahul Sharma Enterprises", "filingStatus": "ACTIVE" }
  ```

### Aadhaar Validation
* **Method**: `POST`
* **Path**: `/mock/aadhaar/validate`
* **Request Body**:
  ```json
  { "aadhaar": "123456789012" }
  ```
* **Response Body**:
  ```json
  { "valid": true, "aadhaar": "123456789012", "name": "Rahul Sharma" }
  ```

### OCR Document Extractor
* **Method**: `POST`
* **Path**: `/mock/ocr/extract`
* **Request Body**:
  ```json
  { "documentUrl": "https://example.com/doc.png" }
  ```
* **Response Body**:
  ```json
  { "status": "SUCCESS", "documentUrl": "...", "extractedFields": { "name": "Rahul Sharma", "dob": "1990-05-14", "idNumber": "ID1234567" } }
  ```

### Fraud Detector
* **Method**: `POST`
* **Path**: `/mock/fraud/check`
* **Request Body**:
  ```json
  { "name": "Rahul Sharma" }
  ```
* **Response Body**:
  ```json
  { "status": "SUCCESS", "riskScore": 0.05, "flagged": false }
  ```

### Face Matching
* **Method**: `POST`
* **Path**: `/mock/face-match/compare`
* **Request Body**:
  ```json
  { "selfieUrl": "http://...", "idPhotoUrl": "http://..." }
  ```
* **Response Body**:
  ```json
  { "status": "SUCCESS", "match": true, "confidence": 0.97 }
  ```

### Flaky Echo (Retry Demo)
* **Method**: `POST`
* **Path**: `/mock/flaky/echo`
* **Request Body**:
  ```json
  { "attemptKey": "test-run-1", "failTimes": 2 }
  ```
* **Response Body (Attempts <= failTimes - Returns 503)**:
  ```json
  { "status": "TEMPORARILY_UNAVAILABLE", "attempt": 1 }
  ```
* **Response Body (Attempts > failTimes - Returns 200)**:
  ```json
  { "status": "SUCCESS", "attempt": 3, "echo": { ... } }
  ```

---

## 6. Dynamic Orchestration APIs (Client-Facing)
Exposed dynamic routes. Auth requirement depends on the workflow's `authRequired` setting.

### verify-pan (Example 1)
* **Method**: `POST`
* **Path**: `/verify-pan`
* **Auth**: None
* **Request Body**: `{ "pan": "ABCDE1234F" }`
* **Response Body**:
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
    "error": null,
    "meta": { "requestId": "...", "workflow": "verify-pan", "version": 1 }
  }
  ```

### validate-identity (Example 2)
* **Method**: `POST`
* **Path**: `/validate-identity`
* **Auth**: None
* **Request Body**: `{ "aadhaar": "123456789012", "gstin": "29ABCDE1234F1Z5" }`
* **Response Body**:
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
    "error": null,
    "meta": { "requestId": "...", "workflow": "validate-identity", "version": 1 }
  }
  ```

### kyc-onboarding (Example 3)
* **Method**: `POST`
* **Path**: `/kyc-onboarding`
* **Auth**: API Key (`x-api-key` header required)
* **Request Body**: `{ "documentUrl": "http://...", "selfieUrl": "http://..." }`
* **Response Body**:
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
    "error": null,
    "meta": { "requestId": "...", "workflow": "kyc-onboarding", "version": 1 }
  }
  ```

### company-kyc (Your Custom Workflow!)
* **Method**: `POST`
* **Path**: `/company-kyc`
* **Auth**: None (or API Key if enabled)
* **Request Body**: `{ "pan": "ABCDE1234F", "gstin": "29ABCDE1234F1Z5" }`
* **Response Body**:
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
    "error": null,
    "meta": { "requestId": "...", "workflow": "company-kyc", "version": 3 }
  }
  ```
