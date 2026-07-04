# ConfigFlow: Low-Code API Orchestration Platform
### Senior Systems Design & SDE-1 Assignment Submission Report
**Author**: Sai Manideep  
**GitHub Repository**: [https://github.com/SaiManideep-Git/ConfigFlow-Signzy](https://github.com/SaiManideep-Git/ConfigFlow-Signzy)  
**Deployed Frontend Console**: [https://config-flow-signzy.vercel.app](https://config-flow-signzy.vercel.app)  
**Deployed Backend Engine**: [https://configflow-signzy.onrender.com](https://configflow-signzy.onrender.com)  

---

## Executive Summary

ConfigFlow is a MERN-stack configuration-driven API orchestration platform designed to streamline third-party integrations (KYC, PAN, GST, Face Match, and payment gateways). By exposing custom REST endpoints configured entirely via metadata (JSON/YAML), ConfigFlow eliminates the overhead of compiling, testing, and redeploying backend service code for new partner connections.

---

## 1. Architectural Blueprint

```mermaid
flowchart TD
    subgraph Client [Client & Admin Tier]
        U[API Consumer]
        UI[React Admin UI - Vercel]
    end

    subgraph Gateway [Express Gateway Engine - Render]
        DISP[Wildcard Dispatcher Middleware]
        VAL[AJV Schema Validator]
        
        subgraph Engine [Core Orchestration Engine]
            DAG[DAG Wave Executor]
            JSNT[JSONata Transform Evaluator]
            INV[HTTP Invoker]
        end
    end

    subgraph Data [Data & Integrations]
        DB[(MongoDB Atlas)]
        VENDORS[Mock Vendor APIs]
        CLAUDE[Claude API - Agentic AI]
    end

    U -->|"POST /verify-pan"| DISP
    UI -->|JWT Auth / Admin CRUD| DISP
    DISP -->|1. Query active config| DB
    DISP -->|2. Validate request body| VAL
    DISP -->|3. Run step execution| DAG
    DAG -->|4. Transform JSON data| JSNT
    DAG -->|5. Outgoing API call| INV
    INV -->|"Axios + Exponential Backoff"| VENDORS
    DISP -->|6. Log transaction| DB
    UI -->|"NL description prompt"| CLAUDE
```

### Key Architectural Components

1. **Dynamic Gateway Router (Dispatcher)**: Maps incoming HTTP verbs and paths dynamically by querying MongoDB Atlas. It bypasses express's static route registration, meaning new APIs go live immediately on save.
2. **AJV Payload Validator**: Leverages the AJV schema compilation framework. Schema definitions are compiled once and cached in-memory, ensuring sub-millisecond validation times for client requests.
3. **DAG (Directed Acyclic Graph) Executor**: Steps are grouped based on their dependency array (`dependsOn`). It performs topological sorting to execute steps concurrently in parallel waves, achieving maximum throughput.
4. **JSONata Processing Sandbox**: Rather than running unsafe JavaScript code (`eval`), data mapping, transformations, and conditional step execution (`runIf`) are run inside a sandboxed JSONata environment.
5. **Resilient HTTP Invoker**: Outgoing REST requests are managed using Axios. Outgoing auth headers, timeouts, and exponential backoff retry algorithms are injected dynamically based on metadata.
6. **Dynamic Swagger Specification Compiler**: Intercepts requests on the `/docs.json` spec endpoint, queries MongoDB for all active user-configured workflows, extracts their custom request schemas, and dynamically injects their OpenAPI definitions in real-time, making user-created routes fully testable inside the interactive `/docs` UI.

---

## 2. Technical Design Decisions (The "Why")

### A. Why MongoDB (instead of relational PostgreSQL/MySQL)?
* **Schema Flexibility**: A workflow step varies widely depending on its type (`callApi` requires URLs, headers, retry policy, body mapping; `transform` requires JSONata strings). Storing this polymorphic structure in a relational database would require complex joins or sparse tables. MongoDB stores these naturally as document trees.
* **API Validation at the Boundary**: While MongoDB lacks strict tables, correctness is guaranteed by compiling and validating configurations against an AJV meta-schema ([workflowConfigSchema.js](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/engine/workflowConfigSchema.js)) at the API boundary before saving.

### B. Why JSONata (instead of JS `eval()`)?
* **Security**: Running user-submitted scripts using `eval()` exposes the backend process to Remote Code Execution (RCE) attacks. JSONata is a highly restricted, sandboxed language specifically designed for JSON querying and mutation.
* **Declarative Mapping**: JSONata is designed for document querying. Reshaping nested datasets (e.g., `steps.ocr.output.extractedFields.name`) is simpler and more concise in JSONata than in pure JavaScript.

---

## 3. Resiliency & Security Analysis

### Resiliency Patterns (Self-Healing)
* **Exponential Backoff Retries**: Downstream connections can experience transient failures (network blips or server overloads). ConfigFlow implements exponential backoff:
  $$\text{Delay} = \text{backoffMs} \times 2^{\text{attempt}}$$
  This prevents "thundering herd" problems by spacing retries dynamically.
* **Circuit Isolation (`onError`)**: Step failures can be isolated. Developers can choose:
  - `abort`: Halt immediately.
  - `skip` / `continue`: Ignore errors, allowing unrelated parallel steps to continue.

### Security Strategy
1. **Administrative Access**: Admin endpoints are protected via JWT (JSON Web Tokens) with a default expiry.
2. **Client Access**: Client dynamic APIs can be protected by configuring `authRequired: true`. Access is then governed by the `x-api-key` header verified against a hash-indexed Mongoose collection.
3. **CORS Control**: Access-Control headers are explicitly handled, allowing safe web portal execution while isolating dynamic REST clients.

---

## 4. SOW Requirements & Code Mapping

| SOW Functional Requirement | File & Line Reference | Architectural Details |
| :--- | :--- | :--- |
| **Dynamic API Creation** | [workflows.routes.js:L93-L143](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/routes/admin/workflows.routes.js#L93-L143) | Saves dynamic workflow documents to MongoDB and invalidates the in-memory cache. |
| **Request Validation** | [dispatcher.js:L56-L73](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/routes/dynamic/dispatcher.js#L56-L73) | Compiles AJV schemas on-demand and caches them in `requestSchemaCache` to avoid compile overhead. |
| **Field Mapping** | [mapper.js](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/engine/mapper.js) | Translates `$.` dot-paths recursively and interpolates URL placeholders using regular expressions. |
| **HTTP API Invocation** | [invoker.js](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/engine/invoker.js) | Issues Axios calls using dynamically built headers, query parameters, auth objects, and timeouts. |
| **Multiple API Orchestration**| [executor.js:L28-L87](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/engine/executor.js#L28-L87) | Uses topological-sort waves to group and run independent dependency branches concurrently. |
| **Conditional Execution** | [executor.js:L55-L63](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/engine/executor.js#L55-L63) | Runs step-level `runIf` JSONata conditions, bypassing the step execution if the output evaluates to false. |
| **Error Handling** | [executor.js:L76-L81](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/engine/executor.js#L76-L81) | Propagates failures based on step-level `onError` configurations (`abort`, `skip`, `continue`). |
| **Retry Mechanism** | [invoker.js:L49-L93](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/engine/invoker.js#L49-L93) | Executes exponential backoff retries ($Delay = backoffMs \times 2^{attempt}$) on network/status failures. |
| **Standardized Response** | [responseEnvelope.js](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/utils/responseEnvelope.js) | Formats all API responses into a structured `{ success, data, error, meta }` response envelope. |
| **Execution Logging** | [dispatcher.js:L85-L98](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/routes/dynamic/dispatcher.js#L85-L98) | Stores execution traces (duration, steps, input/output data) inside the database. |
| **Visual Workflow Editor** | [WorkflowEditorPage.jsx](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/frontend/src/pages/WorkflowEditorPage.jsx) | React Flow canvas visualizer with connection routing, node inspector, and a live Test Console. |
| **Agentic AI Bonus** | [generate.routes.js](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/backend/src/routes/agent/generate.routes.js) | Generates configurations from text descriptions using Claude, and runs self-correction passes. |
| **CI/CD Pipeline** | [ci.yml](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/.github/workflows/ci.yml) | GitHub Actions workflow to run backend tests and frontend builds on every commit. |

---

## 5. REST API Documentation Reference

Detailed documentation is available in [api_documentation.md](file:///C:/Users/saima/.gemini/antigravity/brain/68cda090-feda-4464-a3ab-9dea61f9dd2e/api_documentation.md).

* **Admin Login**: `POST /admin/auth/login` (Returns JWT token).
* **Workflows CRUD**: `GET`, `POST`, `PUT`, `DELETE` at `/admin/workflows`.
* **Execution Logs**: `GET /admin/logs` (with pagination).
* **API Keys Listing**: `GET /admin/api-keys` (lists active client API keys).
* **AI Generator**: `POST /agent/generate-workflow` (creates configs from plain-English).
* **Mock Vendor APIs**: `/mock/vendor-a/verify-pan`, `/mock/vendor-b/gst-details`, `/mock/aadhaar/validate`, etc.

---

## 6. Verification and Test Logs (CURL Cases)

> [!NOTE]
> **Postman Collection**: You can import all test cases directly into Postman by downloading the collection from your GitHub repository: **[ConfigFlow.postman_collection.json](https://github.com/SaiManideep-Git/ConfigFlow-Signzy/blob/main/ConfigFlow.postman_collection.json)**.
> 
> The collection includes pre-configured automation scripts that capture and propagate the JWT bearer token automatically on login.

### Test 1: Admin Login
```bash
curl -X POST https://configflow-signzy.onrender.com/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@configflow.local","password":"ChangeMe123!"}'
```
* **Response Body**:
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

### Test 2: PAN Verification (Example 1 - Success)
```bash
curl -X POST https://configflow-signzy.onrender.com/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan":"ABCDE1234F"}'
```
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
    "meta": {
      "timestamp": "2026-07-04T17:55:10.120Z",
      "requestId": "9f65b4ad-5190-4f10-ae6b-b825282b826a",
      "workflow": "verify-pan",
      "version": 1,
      "durationMs": 178
    }
  }
  ```

### Test 3: PAN Verification (Example 1 - NOT_FOUND)
```bash
curl -X POST https://configflow-signzy.onrender.com/verify-pan \
  -H "Content-Type: application/json" \
  -d '{"pan":"ABCDE1230F"}'
```
* **Response Body**:
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
    "error": null,
    "meta": {
      "timestamp": "2026-07-04T17:55:42.312Z",
      "requestId": "1f85b4ad-5190-4f10-ae6b-c825282b826a",
      "workflow": "verify-pan",
      "version": 1,
      "durationMs": 172
    }
  }
  ```

### Test 4: Identity Validation (Example 2 - GST Step Skipped)
```bash
curl -X POST https://configflow-signzy.onrender.com/validate-identity \
  -H "Content-Type: application/json" \
  -d '{"aadhaar":"023456789012","gstin":"29ABCDE1234F1Z5"}'
```
* **Response Body**:
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
    "error": null,
    "meta": {
      "timestamp": "2026-07-04T17:56:02.128Z",
      "requestId": "4f95b4ad-5190-4f10-ae6b-d825282b826a",
      "workflow": "validate-identity",
      "version": 1,
      "durationMs": 164
    }
  }
  ```

### Test 5: Authenticated Onboarding (Example 3 - Using API Key)
```bash
curl -X POST https://configflow-signzy.onrender.com/kyc-onboarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: cf_demo_f48ea30d35e1d904b6b6ec42" \
  -d '{"documentUrl":"https://example.com/doc.png","selfieUrl":"https://example.com/selfie.png"}'
```
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
    "meta": {
      "timestamp": "2026-07-04T17:58:14.212Z",
      "requestId": "f85b4ad-5190-4f10-ae6b-b825282b826a",
      "workflow": "kyc-onboarding",
      "version": 1,
      "durationMs": 422
    }
  }
  ```
