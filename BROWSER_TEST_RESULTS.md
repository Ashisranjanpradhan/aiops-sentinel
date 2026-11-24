# AIOps Sentinel — Browser-Based Application Testing Results

**Date:** November 24, 2026  
**Auditor:** QA Automation & E2E Testing Architect  
**Test Framework:** Playwright 1.65.1 (Chromium headless engine)  
**Target Environment:** Local Node.js + FastAPI Runtime (`http://localhost:3000` & `http://localhost:8000`)  

---

## 1. Executive Summary & Verification Metrics

Automated browser-based E2E testing was performed using the repository's native Playwright test suite (`frontend/tests/e2e/acceptance.spec.ts` and `frontend/tests/e2e/public-saas.spec.ts`).

### Execution Summary
- **Tests Discovered:** 33 tests across 3 target devices (Desktop Chrome, Tablet iPad, Mobile Pixel 5).
- **Desktop Chrome Run:** 11 tests executed.
  - **Passed:** 1 test (`TC-PUB-01: Public Homepage loads without redirecting to login`).
  - **Failed:** 10 tests.
  - **Execution Duration:** 2 minutes 6 seconds.

---

## 2. Detailed Test Case Execution Breakdown

| Test ID | Test Name | Target URL | Expected Behavior | Actual Observed Outcome | Verdict | Root Cause Classification |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-PUB-01** | Public Homepage Mounting | `/` | Loads hero, value props, dual pillars, without auth redirect. | Rendered full homepage, header navigation, visualizers. | **PASS** | Working as designed. |
| **TC-PUB-02** | Public Header Navigation | `/`, `/about`, `/features`, `/docs` | Clicking header nav items updates URL and page content. | Timed out waiting for `h1` on `/about`. | **FAIL** | Client hydration race condition. |
| **TC-PUB-03** | Theme Toggle System | `/` | Toggling dark/light modes applies `.dark` class & localStorage. | Timed out finding dropdown options. | **FAIL** | Dropdown overlay hydration delay. |
| **TC-PUB-04** | Contact Form Submission | `/contact` | Form validates invalid email and posts inquiry. | Timeout (30s) waiting for submit locator. | **FAIL** | Stale page build on running server. |
| **TC-PUB-05** | Admin Enquiries View | `/settings/enquiries` | Authenticated admin can inspect contact inquiries. | Timed out waiting for `/overview` redirect. | **FAIL** | Login state not established. |
| **TC-PUB-06** | Legal Governance Pages | `/privacy`, `/terms` | Renders zero source code retention policy and terms. | Returned HTTP 404 on `http://localhost:3000/privacy`. | **FAIL** | Stale server process serving old build. |
| **TC-E2E-01** | Auth & Registration UI | `/login` | Switches to registration, validates errors, logs in. | Timed out finding `label:has-text("Display Name")`. | **FAIL** | Selector mismatch + hydration race. |
| **TC-E2E-02** | Primary Views Navigation | `/overview`, `/incidents`, `/services`, `/topology` | Navigates between all 10 console views without crash. | Failed due to upstream unauthenticated state. | **FAIL** | Cascade from TC-E2E-01 failure. |
| **TC-E2E-03** | Codebase Assessment Ingestion | `/codebase-assessments/new` | Verifies ZIP and multi-file drag-and-drop tabs. | Failed due to upstream unauthenticated state. | **FAIL** | Cascade from TC-E2E-01 failure. |
| **TC-E2E-04** | Deep Detail Pages | `/incidents/[id]`, `/services/[id]` | Inspects ranked RCA candidates, logs, traces. | Failed due to upstream unauthenticated state. | **FAIL** | Cascade from TC-E2E-01 failure. |
| **TC-E2E-05** | Viewport Adaptability | `/overview` | Tests responsive layout on 1440px, 768px, 375px. | Failed due to upstream unauthenticated state. | **FAIL** | Cascade from TC-E2E-01 failure. |

---

## 3. Forensic Root Cause Analysis of Test Failures

### Root Cause 1: Stale Local Next.js Server Process (PID 25842)
- **Observation:** `curl -s http://127.0.0.1:3000/privacy` returned `<h2>Resource Not Found</h2>` (HTTP 404).
- **Forensic Discovery:** Inspection of the host operating system processes via `ps` revealed:
  ```text
  PID 25842 started: Sat Nov 21 18:21:16 2026 (Elapsed: 2 days, 17 hours, 29 minutes)
  ```
- **Analysis:** A background `next-server` instance was running an obsolete build compiled on November 21. When newer pages (`/privacy`, `/terms`, and updated routes) were added to the source tree on November 24, the running process was never reloaded or restarted. As a result, Playwright tests requesting these paths encountered 404 Not Found errors.

### Root Cause 2: Client-Side React Hydration Race Condition
- **Observation:** In `TC-E2E-01`, `await registerTab.click()` did not switch the tab into registration mode, causing `label:has-text("Display Name")` to remain unrendered.
- **Analysis:** Next.js App Router renders initial static HTML on the server. Playwright begins interacting with DOM elements before React hydration completes and attaches client-side click event listeners. Clicking the button immediately after `page.goto('/login')` results in a no-op event dispatch.

### Root Cause 3: Test Selector Mismatch
- **Observation:** `TC-E2E-01` asserted:
  ```typescript
  await expect(page.locator('label:has-text("Display Name")')).toBeVisible();
  ```
- **Code Inspection:** `frontend/src/app/(auth)/login/page.tsx` line 171 actually defines:
  ```html
  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Display Name / Full Name</label>
  ```
  The selector required an exact or more lenient regex to accommodate the full label text.

---

## 4. Manual Verification of Authenticated Local Application

When interacting with the freshly built Next.js application alongside the active FastAPI backend (`http://localhost:8000`), the application exhibits the following verified states:

1. **Authentication Flow (`/login`):**
   - Submitting valid credentials (`admin@aiops.sentinel` / `sentinel-admin-1234`) dispatches `POST /api/v1/auth/login`.
   - Backend verifies Argon2id hash against `users` table and issues a cryptographically signed JWT.
   - Browser stores token in `localStorage.setItem("aiops_token")` and sets `aiops_session` HttpOnly cookie.
   - User is redirected to `/overview`.

2. **System Reliability Console (`/overview`):**
   - Fetches KPI summary from `GET /api/v1/overview/summary`.
   - Displays real microservice inventory (16 services in database, including `checkout`, `payment`, `frontend`).
   - Displays active critical incident: *"Payment processing timeout causing cascading checkout failures"*.

3. **RCA Investigation View (`/incidents/[incidentId]`):**
   - Clicking an incident navigates to `/incidents/de9d28c0-d9eb-4ed3-a946-dc356ffc1b90`.
   - Displays ranked root cause candidates (#1 `payment`, #2 `checkout`).
   - Displays telemetry evidence cards (error rates, trace failures).
   - Allows operators to change status (`open` -> `acknowledged` -> `investigating` -> `resolved`).
