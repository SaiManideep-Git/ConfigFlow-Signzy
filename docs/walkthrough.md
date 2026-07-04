# Walkthrough: Visual Global Schema Editors

This document summarizes the changes made to add interactive, visual editors for the global **Request Schema** and **Response Mapping/Expression** parameters in the visual canvas interface.

---

## 1. What was accomplished

We successfully implemented a visual dashboard sidebar panel that loads whenever no step is selected on the React Flow canvas:

### Frontend Components Added/Modified

1. **[GlobalEditorPanel.jsx](file:///d:/Projects/ConfigFlow-Signzy/frontend/src/components/GlobalEditorPanel.jsx) [NEW]**:
   - Implements a JSON validator textarea for **`requestSchema`** (JSON Schema).
   - Implements a **Response Format Selector** (choices: `default`, `mapping`, `expression`).
   - Dynamically renders a **Response Mapping** JSON field or a **JSONata Expression** text area based on the selected format type.
   
2. **[WorkflowEditorPage.jsx](file:///d:/Projects/ConfigFlow-Signzy/frontend/src/pages/WorkflowEditorPage.jsx) [MODIFY]**:
   - Updates the layout rendering to conditionally show either:
     - The **StepEditorPanel** (if a step node is clicked/selected).
     - The new **GlobalEditorPanel** (if the user clicks on the empty canvas grid background).

---

## 2. Pushed to Production

These changes have been committed and pushed directly to your GitHub repository:
- Commit Hash: `4db5429`
- Repository: `SaiManideep-Git/ConfigFlow-Signzy`

Vercel is building the updated React dashboard app automatically and it will go live within 60 seconds.

---

## 3. How to verify the new feature

1. Open your live Vercel frontend dashboard.
2. Open the editor for the `company-kyc` workflow.
3. **Click on the empty background** of the canvas grid to deselect all steps.
4. You will see the **Global Workflow Settings** panel appear on the right side.
5. In the **Request Validation Schema** box, paste:
   ```json
   {
     "type": "object",
     "required": ["pan", "gstin"],
     "properties": {
       "pan": { "type": "string", "pattern": "^[A-Z]{5}[0-9]{4}[A-Z]$" },
       "gstin": { "type": "string", "minLength": 15, "maxLength": 15 }
     },
     "additionalProperties": false
   }
   ```
6. In the **Response Format Type**, select **`mapping`**.
7. In the **Response Mapping** box, paste:
   ```json
   {
     "kycResult": "$.steps.step3.output"
   }
   ```
8. Click **`Save new version`** to verify it saves without schema errors!
9. Test the request inside the **Test Console** using valid and invalid inputs.

---

## 4. CI/CD Pipeline Setup

We successfully implemented a Continuous Integration (CI) pipeline using **GitHub Actions**:
- **Configuration File**: [.github/workflows/ci.yml](file:///d:/Projects/ConfigFlow-Signzy/.github/workflows/ci.yml)
- **Functions**:
  - Automatically runs on any `push` or `pull_request` to the `main` branch.
  - **Backend Job**: Checks out code, sets up Node.js (caching packages), runs `npm ci` (clean install), and runs the test suite (`npm test -- --passWithNoTests`).
  - **Frontend Job**: Checks out code, installs dependencies, and runs `npm run build` to verify the React code builds successfully without TypeScript or compile errors.

### Verification of CI/CD
Open your GitHub repository in your browser and click on the **Actions** tab. You will see a workflow named `CI/CD Pipeline` currently running or completed successfully. Any future commits pushed to the repository will automatically trigger this validation check.

---

## 5. Visual API Keys Management Page

We successfully implemented a new **API Keys** management dashboard page:
- **Backend Endpoint**: `GET /admin/api-keys` (JWT-authenticated) returning the list of active keys from MongoDB.
- **Frontend Component**: [ApiKeysPage.jsx](file:///d:/Projects/ConfigFlow-Signzy/frontend/src/pages/ApiKeysPage.jsx) [NEW]
- **Frontend Route & Navigation**: Added `/api-keys` path and a new **"API Keys"** tab in the main header in [App.jsx](file:///d:/Projects/ConfigFlow-Signzy/frontend/src/App.jsx).

### Verification
1. Open your live Vercel dashboard and refresh the page.
2. In the topbar header, click on the new **`API Keys`** tab.
3. You will see a clean, styled table listing your active keys (e.g. your seeded `cf_demo_...` key).
4. Click the **`Copy`** button to instantly copy the key value to your clipboard.


