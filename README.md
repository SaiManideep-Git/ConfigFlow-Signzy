# ConfigFlow: Low-Code API Orchestration Platform

ConfigFlow is a MERN-stack (MongoDB, Express, React, Node.js) configuration-driven API orchestration platform. It allows developers and administrators to expose custom, validated REST API endpoints without writing backend code or redeploying servers.

```
Client Call (e.g., POST /company-kyc) 
   ↓
Exposed dynamic route matches in MongoDB
   ↓
Validate payload against JSON Schema (AJV)
   ↓
Execute steps in parallel waves (DAG)
   ├─ Call API 1 (OCR)
   ├─ Call API 2 (Fraud Check - runs concurrently if independent)
   └─ Run Transform (JSONata logic & data formatting)
   ↓
Respond with a standardized JSON Envelope
```

---

## 📖 Table of Contents
1. [Core Architectural Concepts](#1-core-architectural-concepts)
2. [Folder Structure](#2-folder-structure)
3. [Quick Start (Docker)](#3-quick-start-docker)
4. [Quick Start (Manual Setup)](#4-quick-start-manual-setup)
5. [The Orchestration Engine (How it Works)](#5-the-orchestration-engine-how-it-works)
6. [Visual Admin Interface & Features](#6-visual-admin-interface--features)
7. [Mock Vendor APIs reference](#7-mock-vendor-apis-reference)
8. [The Agentic AI Feature](#8-the-agentic-ai-feature)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Postman API Testing Collection](#10-postman-api-testing-collection)
---

## 1. Core Architectural Concepts

A traditional API gateway requires developer intervention to add routes, write validation schemas, build code, and deploy. ConfigFlow moves this entire cycle into data configurations:

* **Dynamic Dispatcher**: Express runs a single wildcard middleware (`dispatcherMiddleware` in [dispatcher.js](backend/src/routes/dynamic/dispatcher.js)). It matches the incoming HTTP method and path against active configs cached in memory.
* **Declarative Mapping**: Incoming variables and parameters are mapped to downstream request payloads using simple dot-paths (e.g. `$.input.pan`) and templates (e.g. `{{input.pan}}`).
* **JSONata Processing**: For advanced business logic, data merging, or calculations, the platform leverages **JSONata**—a lightweight, sandboxed JSON query and transformation language.

---

## 2. Folder Structure

```
├── .github/workflows/   # CI/CD Pipeline via GitHub Actions
├── backend/             # Express API & Orchestration Engine
│   ├── src/
│   │   ├── config/      # DB connection and Winston logger configs
│   │   ├── docs/        # OpenAPI/Swagger configuration
│   │   ├── engine/      # Core execution (DAG waves, invoker, validator, mappers)
│   │   ├── middleware/  # Auth checking, rate limiting, global error handlers
│   │   ├── mock-vendors/# Simulated KYC/PAN/GST third-party endpoints
│   │   ├── models/      # Mongoose Schemas (Workflows, Logs, Users, API Keys)
│   │   ├── routes/      # Express controllers (Admin CRUD, AI agent, Dynamic route dispatcher)
│   │   └── scripts/     # Database seed script (npm run seed)
├── frontend/            # React (Vite) Admin Console
│   ├── src/
│   │   ├── components/  # Canvas nodes, global editor panel, test consoles
│   │   ├── pages/       # Dashboard pages (Workflows, Logs, API Keys, Editor)
│   │   └── App.jsx      # Navigation, Route declarations
└── sample-configs/      # Example workflows matching the prompt use-cases
```

---

## 3. Quick Start (Docker)

Make sure you have **Docker Desktop** running:

1. **Spin up the MERN containers**:
   ```bash
   docker-compose up --build
   ```
2. **Seed the database** (in a separate terminal once containers are live):
   ```bash
   docker-compose exec backend npm run seed
   ```
   * *This bootstraps the admin user, sample configurations, and generates a demo API key.*
3. **Open the URLs**:
   * Frontend Portal: `http://localhost:5173`
   * Backend Swagger Docs: `http://localhost:4000/docs`

---

## 4. Quick Start (Manual Setup)

Ensure you have **Node.js (18+)** and a local **MongoDB (27017)** instance running:

### A. Set Up Backend
1. Navigate to the folder: `cd backend`
2. Create your env configuration: `cp .env.example .env`
3. Install dependencies: `npm install`
4. Seed the database: `npm run seed` *(Copy the generated API Key printed in the console)*
5. Run the dev server: `npm run dev` (starts on `http://localhost:4000`)

### B. Set Up Frontend
1. Navigate to the folder: `cd ../frontend`
2. Create your env configuration: `cp .env.example .env`
3. Install dependencies: `npm install`
4. Run the dev server: `npm run dev` (starts on `http://localhost:5173`)

### C. Default Login Credentials
* **Email**: `admin@configflow.local`
* **Password**: `ChangeMe123!`

---

## 5. The Orchestration Engine (How it Works)

The engine reads a workflow JSON and structures execution into a Directed Acyclic Graph (DAG) using these key features:

* **DAG Execution waves**: Steps define dependencies using `"dependsOn": ["stepId"]`. Steps with no remaining dependencies execute **concurrently** in the same wave using `Promise.all` for optimal performance.
* **Conditional Bypassing (`runIf`)**: Steps can specify a JSONata expression that must evaluate to `true` to execute. If it evaluates to `false`, the step is bypassed and marked as `skipped` in the logs.
* **Exponential Backoff Retries**: Each step can configure retries. The HTTP client will retry on network failures or specific status codes (e.g. `503`) waiting with increasing delays:
  $$\text{Delay} = \text{backoffMs} \times 2^{\text{attempt}}$$
* **Centralized Logs**: Every transaction (success or failure) is stored in the `ExecutionLog` collection, detailing request parameters, step durations, and step input/outputs.

---

## 6. Visual Admin Interface & Features

Once logged in, the UI gives you complete control over your APIs:

1. **Dashboard**: View all configured dynamic endpoints, their status, active versions, and authentication configurations.
2. **Visual Editor**: Drag connection lines to establish step dependencies on a canvas. Edit individual steps (downstream target, body mapping, retry parameters, JSONata transforms) in the side inspector panel.
3. **Global Config Inspector**: Click on the empty background grid of the canvas to edit global properties like **Request Validation Schema** (JSON Schema format) and **Response Mapping** structures directly.
4. **Live Test Console**: Paste a test JSON request in the sidebar console and click **Send request** to test your live API directly in the browser.
5. **API Keys Panel**: A dedicated page to view, check, and copy active API keys (used for `x-api-key` client headers) to your clipboard.

---

## 7. Mock Vendor APIs reference

The backend mounts mock endpoints under `/mock/*` to simulate paid KYC providers:
* `POST /mock/vendor-a/verify-pan`: Verifies PAN format. If the digit block ends in `0`, it returns `NOT_FOUND`.
* `POST /mock/vendor-b/gst-details`: Returns company legal name and Active status for any 15-character GSTIN.
* `POST /mock/aadhaar/validate`: Asserts valid 12-digit Aadhaar inputs.
* `POST /mock/ocr/extract`: Simulates OCR extraction.
* `POST /mock/fraud/check`: Detects fraud risks.
* `POST /mock/face-match/compare`: Asserts selfie match confidence.
* `POST /mock/flaky/echo`: Intentionally fails with a `503` for the first $N$ attempts (tracks via `attemptKey`) and then succeeds. Used to demonstrate the retry mechanism.

---

## 8. The Agentic AI Feature

Allows users to convert natural language descriptions into complete workflow configurations:
1. Click the **Generate from description** button on the editor page.
2. Enter a description: *"Create an API that validates a PAN using Vendor A, and if successful, fetches GST details from Vendor B."*
3. The prompt hits `/agent/generate-workflow` which utilizes Claude.
4. The generated JSON is validated against the AJV schema. If it fails, the error messages are fed back to the AI for a **self-correction pass** before returning the validated config to the UI canvas.

---

## 9. CI/CD Pipeline

The project features a complete CI/CD automation workflow powered by **GitHub Actions** (configured in [.github/workflows/ci.yml](.github/workflows/ci.yml)):
* Runs automatically on every push or pull request to the `main` branch.
* Installs dependencies, runs backend tests with `npm test`, and runs `npm run build` on the frontend to guarantee zero syntax or compilation errors before live deployment.
* Once the checks pass, Render (backend) and Vercel (frontend) deploy the updates automatically.

---

## 10. Postman API Testing Collection

To make testing local or deployed APIs effortless, a pre-configured **Postman Collection** is included directly in the repository:
* **Collection Configuration File**: [ConfigFlow.postman_collection.json](ConfigFlow.postman_collection.json)
* **Pre-configured Flows**: Includes grouped requests for Admin Authentication, CRUD configurations, execution log monitoring, mock partner APIs, and client-facing orchestrated gateways.
* **Automatic Auth Propagation**: The collection includes a custom JavaScript post-response validation script on the Login request. Once the admin logs in, Postman automatically captures the JWT token and binds it to all subsequent administrative requests, removing the need for manual copy-pasting.
