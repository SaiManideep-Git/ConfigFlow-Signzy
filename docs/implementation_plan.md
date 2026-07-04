# Implementation Plan: Dynamic Swagger Spec Injection

This plan details how we will modify the backend Swagger endpoint to query MongoDB at runtime. This will dynamically inject all active user-configured workflows (including their custom Request Validation Schemas) into the OpenAPI spec, displaying them inside the Swagger UI (`/docs`).

---

## Proposed Changes

### Backend Changes

#### [MODIFY] [app.js](file:///d:/Projects/ConfigFlow-Signzy/backend/src/app.js)
We will rewrite how `/docs` and `/docs.json` are served:
1. Configure Swagger UI to load its specification dynamically from `/docs.json` rather than rendering a static object at startup.
2. Update the `/docs.json` endpoint to:
   - Query all active `WorkflowConfig` documents from MongoDB.
   - Inject their method, path, description, request JSON schema, and envelope responses into the OpenAPI paths object in-memory.
   - Return the dynamically compiled specification.

```diff
-app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
-app.get('/docs.json', (req, res) => {
-  res.setHeader('Content-Type', 'application/json');
-  res.send(swaggerSpec);
-});
+app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/docs.json' } }));
+app.get('/docs.json', async (req, res, next) => {
+  try {
+    const WorkflowConfig = require('./models/WorkflowConfig');
+    const activeWorkflows = await WorkflowConfig.find({ isActive: true });
+    
+    // Deep clone the compiled base spec
+    const spec = JSON.parse(JSON.stringify(swaggerSpec));
+    
+    activeWorkflows.forEach((wf) => {
+      const method = wf.method.toLowerCase();
+      if (!spec.paths[wf.path]) {
+        spec.paths[wf.path] = {};
+      }
+      
+      spec.paths[wf.path][method] = {
+        summary: `Dynamic Workflow: ${wf.name}`,
+        tags: ['Dynamic Client APIs'],
+        description: wf.description || 'Config-driven custom API endpoint.',
+        requestBody: wf.requestSchema ? {
+          required: true,
+          content: {
+            'application/json': {
+              schema: wf.requestSchema
+            }
+          }
+        } : undefined,
+        responses: {
+          200: {
+            description: 'Successful Execution',
+            content: {
+              'application/json': {
+                schema: {
+                  type: 'object',
+                  properties: {
+                    success: { type: 'boolean', example: true },
+                    data: { type: 'object' },
+                    error: { type: 'object', nullable: true },
+                    meta: { type: 'object' }
+                  }
+                }
+              }
+            }
+          }
+        }
+      };
+    });
+    
+    res.json(spec);
+  } catch (err) {
+    next(err);
+  }
+});
```

---

## Verification Plan

### Manual Verification
1. Deploy the changes to Render.
2. Open your Swagger UI: `https://configflow-signzy.onrender.com/docs`.
3. Verify that a new tag section **`Dynamic Client APIs`** appears.
4. Verify that endpoints like `/company-kyc` and `/verify-pan` are listed.
5. Expand `/company-kyc` and verify that the request body schema matches the JSON Schema we configured in the editor.
6. Click **"Try it out"**, fill in the parameters, and verify it executes successfully against the live backend database.
