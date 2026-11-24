import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'admin@aiops.sentinel';
const DEMO_PASSWORD = 'SentinelAdmin1234!';

test.describe('Dashboard Feature Performance & Statistics Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate into operator console
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    await emailInput.fill(DEMO_EMAIL);
    await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/overview', { timeout: 15000 });
  });

  test('TS-STAT-01: Reliability Overview Metrics & Anomaly Trends', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    // Assert executive overview header & telemetry status
    await expect(page.locator('body')).toContainText('System Reliability Overview');
    await expect(page.locator('body')).toContainText('Production Telemetry');

    // Verify key statistics summary metrics
    const body = page.locator('body');
    await expect(body).toContainText('Monitored Services');
    await expect(body).toContainText('Active Incidents');
    await expect(body).toContainText('Anomaly & Incident Trend');

    // Verify service health summary cards are rendered
    await expect(body).toContainText('checkout');
    await expect(body).toContainText('payment');
    await expect(body).toContainText('frontend');
  });

  test('TS-STAT-02: Microservice Catalog & Golden Signals Detail', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Verify microservices are listed with golden signals
    const body = page.locator('body');
    await expect(body).toContainText('checkout');
    await expect(body).toContainText('payment');
    await expect(body).toContainText('frontend');

    // Click into service details
    const serviceLink = page.locator('a[href^="/services/"]').first();
    await expect(serviceLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/services\/[a-zA-Z0-9-]+/),
      serviceLink.click(),
    ]);

    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).toContainText('Latency');
  });

  test('TS-STAT-03: Incident Investigation, Topological RCA & Runbooks', async ({ page }) => {
    await page.goto('/incidents');
    await page.waitForLoadState('networkidle');

    // Verify incident listing KPI cards
    await expect(page.locator('body')).toContainText('Total Incidents');
    await expect(page.locator('body')).toContainText('Active & In-Flight');

    // Click into first incident investigation and wait for URL
    const incidentLink = page.locator('a[href^="/incidents/"]').first();
    await expect(incidentLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/incidents\/[a-zA-Z0-9-]+/),
      incidentLink.click(),
    ]);

    // Wait until incident investigation finishes loading
    await expect(page.locator('text=Loading incident investigation...')).not.toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Assert Root Cause Candidates & Runbooks
    await expect(page.locator('text=Remediation Runbooks')).toBeVisible();
    await expect(page.locator('text=Ranked Root Cause Candidates')).toBeVisible();
    await expect(page.locator('text=Runbook Parameters')).toBeVisible();
  });

  test('TS-STAT-04: Service Dependency Topology Graph', async ({ page }) => {
    await page.goto('/topology');
    await page.waitForLoadState('networkidle');

    // Verify topology page renders graph canvas and service nodes
    await expect(page.locator('body')).toContainText('Topology');
    await expect(page.locator('body')).not.toContainText('Application error');

    // Check that graph elements or canvas exist
    const canvasOrNodes = page.locator('canvas, svg, div[class*="react-flow"], div[class*="node"]');
    await expect(canvasOrNodes.first()).toBeVisible();
  });

  test('TS-STAT-05: Machine Learning Benchmarks & RCAEval Evaluation Metrics', async ({ page }) => {
    await page.goto('/experiments');
    await page.waitForLoadState('networkidle');

    // Verify benchmark experiment runs are present
    await expect(page.locator('body')).toContainText('Robust-ZScore-RCAEval-RE1');

    // Click into experiment run and wait for navigation
    const expLink = page.locator('a[href^="/experiments/"]').first();
    await expect(expLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/experiments\/[a-zA-Z0-9-]+/),
      expLink.click(),
    ]);

    // Wait until experiment run detail finishes loading
    await expect(page.locator('text=Loading experiment run detail...')).not.toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify MRR and Top-k accuracy metrics are displayed
    const body = page.locator('body');
    const expText = await body.innerText();
    expect(expText).toMatch(/Accuracy|MRR|Top-1|Precision/i);
  });

  test('TS-STAT-06: ArchMind Codebase Production Readiness Scorecard', async ({ page }) => {
    await page.goto('/codebase-assessments');
    await page.waitForLoadState('networkidle');

    // Verify assessed project is displayed
    await expect(page.locator('body')).toContainText('ecommerce-platform-core');

    // Click into assessment scorecard and wait for navigation
    const assessLink = page.locator('a[href^="/codebase-assessments/"]:not([href$="/new"])').first();
    await expect(assessLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/codebase-assessments\/[a-zA-Z0-9-]+/),
      assessLink.click(),
    ]);
    await page.waitForLoadState('networkidle');

    // Verify 10-dimension scorecard and findings
    await expect(page.locator('body')).toContainText('Scorecard');
    await expect(page.locator('body')).toContainText('Remediation');
  });
});
