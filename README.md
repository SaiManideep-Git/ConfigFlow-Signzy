# ConfigFlow

A configuration-driven API orchestration platform: define an API endpoint as a JSON
document (request validation, one or more downstream calls, conditional/parallel
execution, retries, response transforms) and it goes live immediately - no code, no
redeploy. Built for the "Low-Code API Orchestration Platform" assignment on the **MERN**
stack (MongoDB, Express, React, Node).

```
POST /verify-pan  ->  looked up in Mongo  ->  validate  ->  call Vendor A  ->  transform  ->  standardized response
```

See [`docs/architecture.md`](docs/architecture.md) for the full architecture diagram and
request lifecycle.

## Why MongoDB (and why this isn't just files-on-disk)

Workflow "steps" have a shape that varies by type (`callApi` vs `transform`), and
configs need to be created/edited/versioned live via the admin API. Mongo's flexible
schema fits that variability naturally, while an AJV meta-schema
(`backend/src/engine/workflowConfigSchema.js`) enforces correctness of every config at
the API boundary - so you get both flexibility and validation, without forcing
everything into rigid SQL tables.

## Features

- **Dynamic API creation** - `POST /admin/workflows` defines a new live endpoint; no restart.
- **Request validation** - JSON Schema (AJV) per workflow.
- **Request/response field mapping** - declarative `"$.input.x"` dot-path mapping, plus
  JSONata expressions for complex transforms/merges.
- **Multi-API orchestration** - steps form a DAG (`dependsOn`); independent branches
  run in parallel automatically.
- **Conditional execution** - per-step `runIf` (JSONata boolean expression).
- **Retry mechanism** - per-step attempts/backoff/retryable-status-codes.
- **Error handling** - per-step `onError: abort|skip|continue`, centralized error
  middleware, standardized `{ success, data, error, meta }` envelope everywhere.
- **Execution logging** - every request's full step-by-step trace persisted to Mongo.
- **Workflow versioning** - publish new versions, roll back/forward, only one active
  version serves traffic at a time.
- **Auth** - JWT for the admin API, API-key (`x-api-key`) for generated endpoints that
  opt into `authRequired: true`.
- **Rate limiting**, **Swagger/OpenAPI docs** (`/docs`), **Docker support**.
- **Visual workflow editor** - React Flow canvas: drag a connection between two steps
  to wire a dependency, edit each step's config in a side panel, test the live endpoint
  from the same screen.
- **Agentic AI** - `/agent/generate-workflow` converts a plain-English description
  ("Create an API that validates a PAN using Vendor A and, if successful, fetches GST
  details from Vendor B.") into a validated workflow config via Claude, with one
  self-correction pass if the model's first attempt fails schema validation.

## Repository layout

```
backend/            Express API (orchestration engine, admin API, mock vendors)
  src/engine/        validator, mapper, jsonata eval, HTTP invoker, DAG executor
  src/models/        Mongoose models (WorkflowConfig, ExecutionLog, User, ApiKey)
  src/routes/        admin (auth/workflows/logs), agent (AI generator), dynamic (dispatcher)
  src/mock-vendors/  fake PAN/GST/Aadhaar/OCR/fraud/face-match APIs for demos
frontend/            React (Vite) admin UI + visual workflow editor
sample-configs/      The 3 assignment example workflows + a retry-mechanism demo
sample-requests/     curl examples + a Postman collection
docs/architecture.md Architecture diagram and design rationale
docker-compose.yml   mongo + backend + frontend
```

## Quick start (Docker)

```bash
docker-compose up --build
```

Then, once containers are up, seed the admin user / demo API key / sample workflows:

```bash
docker-compose exec backend npm run seed
```

- Backend: http://localhost:4000 (Swagger docs at `/docs`)
- Frontend: http://localhost:5173
- Login with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults: `admin@configflow.local` /
  `ChangeMe123!` - override via a `.env` file next to `docker-compose.yml`, see below).

## Quick start (manual, no Docker)

Requires Node 18+ and a MongoDB instance reachable at `mongodb://localhost:27017`.

```bash
# backend
cd backend
cp .env.example .env      # edit JWT_SECRET etc. if you like
npm install
npm run seed               # creates admin user, demo API key, loads sample-configs/*
npm run dev                 # http://localhost:4000, docs at /docs

# frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Try the seeded examples immediately:

```bash
curl -X POST http://localhost:4000/verify-pan -H "Content-Type: application/json" \
  -d '{"pan":"ABCDE1234F"}'
```

More requests (including the auth-protected and retry-demo endpoints) are in
[`sample-requests/README.md`](sample-requests/README.md), plus a ready-to-import
Postman collection.

## The Agentic AI feature

`POST /agent/generate-workflow` (admin-authenticated) takes `{ "description": "..." }`
and asks Claude to produce a workflow config matching ConfigFlow's schema, wired to the
mock vendor endpoints where applicable. The generated config is validated with the same
AJV schema used everywhere else; if it fails validation, the errors are fed back to the
model for one corrective attempt before giving up. This is exposed in the UI as the
"Generate from description" button on the workflow editor.

To enable it, set `ANTHROPIC_API_KEY` in `backend/.env` (or as an env var for the
`backend` service in `docker-compose.yml`). Without a key, every other feature works
normally - only this one endpoint responds with a clear 503 explaining it isn't
configured.

## Defining a new API via configuration

A workflow config is a single JSON document - create it via `POST
/admin/workflows`, via the UI's "New Workflow" screen, or by asking the AI generator.
Minimal shape:

```jsonc
{
  "name": "verify-pan",
  "method": "POST",
  "path": "/verify-pan",
  "requestSchema": { "type": "object", "required": ["pan"], "properties": { "pan": { "type": "string" } } },
  "steps": [
    {
      "id": "vendorA",
      "type": "callApi",
      "api": {
        "url": "http://localhost:4000/mock/vendor-a/verify-pan",
        "method": "POST",
        "bodyMapping": { "pan": "$.input.pan" },
        "retry": { "attempts": 2, "backoffMs": 300, "retryOnStatus": [502, 503, 504] }
      }
    },
    {
      "id": "formatResult",
      "type": "transform",
      "dependsOn": ["vendorA"],
      "transform": { "expression": "{ \"verified\": steps.vendorA.output.status = 'SUCCESS' }" }
    }
  ],
  "response": { "mapping": { "result": "$.steps.formatResult.output" } }
}
```

See `sample-configs/*.json` for the three fully-worked assignment examples (PAN
verification, conditional Aadhaar+GST orchestration, parallel OCR/fraud/face-match KYC),
plus a retry-mechanism demo. Full field-by-field reference:
`backend/src/engine/workflowConfigSchema.js`.

## Testing notes

The core engine (schema validation, field mapping, JSONata transforms, the DAG
executor's parallel waves/conditional skipping/retry-with-backoff) was exercised
directly against the live mock vendor APIs for all four sample configs, including
failure and skip paths. The Express app, Swagger docs, and non-DB routes were verified
against a running server; the React UI (login, the visual step editor's drag-to-connect
and edge-deletion sync, layout) was verified in a real headless browser. Full
DB-backed click-through (login -> create workflow -> call it) needs a reachable
MongoDB instance, which the sandbox this was built in could not provision - run
`docker-compose up` in an environment with Docker/Mongo access to exercise that path
end-to-end.

## Known limitations

- Path matching supports literal segments and `:param` placeholders, not wildcards/regex.
- Step node positions in the visual editor are session-only (not persisted with the config).
- The in-memory active-workflow cache is per-process; a multi-instance deployment would
  need a shared cache invalidation signal (e.g. pub/sub) instead of the current
  in-process cache.
