import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@aiops.sentinel';
const ADMIN_PASSWORD = 'sentinel-admin-1234';

test.describe('AIOps Sentinel Frontend Acceptance Tests', () => {
  test('TC-E2E-01: Authentication, Registration UI, and Session Management', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/AIOps Sentinel/i);

    // Verify Tab Switching between Sign In and Create Account using exact role names
    const signInTab = page.getByRole('button', { name: 'Sign In', exact: true });
    const registerTab = page.getByRole('button', { name: 'Create Account', exact: true });
    await expect(signInTab).toBeVisible();
    await expect(registerTab).toBeVisible();

    // Click Create Account tab
    await registerTab.click();
    await expect(page.locator('label:has-text("Display Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Confirm Password")')).toBeVisible();

    // Switch back to Sign In tab
    await signInTab.click();
    await expect(page.locator('label:has-text("Confirm Password")')).not.toBeVisible();

    // Invalid login attempt
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill('invalid-pass-999');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // Valid login
    await passwordInput.fill(ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to overview
    await page.waitForURL('**/overview', { timeout: 10000 });
    await expect(page.locator('body')).toContainText('AIOps Sentinel');
    await expect(page.locator('body')).toContainText('System Reliability Overview');
  });

  test('TC-E2E-02: Route Navigation across All Primary Views', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview');

    const routes = [
      '/services',
      '/incidents',
      '/topology',
      '/deployments',
      '/experiments',
      '/datasets',
      '/alert-rules',
      '/codebase-assessments',
      '/settings',
      '/profile',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const body = page.locator('body');
      await expect(body).toBeVisible();
      await expect(page.locator('text=Application error')).not.toBeVisible();
    }
  });

  test('TC-E2E-03: Codebase Assessment Workflow & Inspection View', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
    page.on('pageerror', err => console.log('[BROWSER UNCAUGHT]', err.message));
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview');

    // Navigate to Codebase Assessments listing
    await page.goto('/codebase-assessments');
    await page.waitForLoadState('networkidle');

    // Check "New Assessment" button
    const newBtn = page.locator('a[href="/codebase-assessments/new"]');
    await expect(newBtn.first()).toBeVisible();
    await newBtn.first().click();

    await page.waitForURL('**/codebase-assessments/new');
    await expect(page.locator('body')).toContainText('New Codebase Readiness Assessment');
    await expect(page.locator('body')).toContainText('Zero-Execution Static Sandbox Architecture');

    // Verify 3 distinct submission tabs exist
    await expect(page.getByRole('button', { name: 'ZIP Archive' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete Folder Selection' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Individual Files' })).toBeVisible();

    // Verify Profile & Execution Mode selectors exist inside the form
    await expect(page.locator('form select')).toHaveCount(2);

    // Switch between tabs
    await page.getByRole('button', { name: 'Complete Folder Selection' }).click();
    await expect(page.locator('body')).toContainText('Folder Selection');

    await page.getByRole('button', { name: 'Individual Files' }).click();
    await expect(page.locator('body')).toContainText('Choose multiple files');

    // Return to ZIP Archive tab
    await page.getByRole('button', { name: 'ZIP Archive' }).click();

    // Check listing has assessments and view details of first assessment
    await page.goto('/codebase-assessments');
    await page.waitForLoadState('networkidle');

    const viewDetailsLink = page.locator('a[href^="/codebase-assessments/"]:not([href$="/new"])').first();
    if (await viewDetailsLink.isVisible()) {
      await viewDetailsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toContainText('10-Dimension Production Scorecard');
      await expect(page.locator('body')).toContainText('Prioritized Remediation Action Plan');
      await expect(page.getByRole('button', { name: 'Export SARIF' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export HTML' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    }
  });

  test('TC-E2E-04: Deep Detail Pages (Service, Incident, Experiment)', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview');

    // Service listing & detail
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    const serviceLink = page.locator('a[href^="/services/"]').first();
    if (await serviceLink.isVisible()) {
      await serviceLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toContainText('Application error');
    }

    // Incidents listing & detail
    await page.goto('/incidents');
    await page.waitForLoadState('networkidle');
    const incidentLink = page.locator('a[href^="/incidents/"]').first();
    if (await incidentLink.isVisible()) {
      await incidentLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toContainText('Application error');
    }

    // Experiments listing & detail
    await page.goto('/experiments');
    await page.waitForLoadState('networkidle');
    const expLink = page.locator('a[href^="/experiments/"]').first();
    if (await expLink.isVisible()) {
      await expLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toContainText('Application error');
    }
  });

  test('TC-E2E-05: Responsive Viewport Adaptability', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview');

    // Test Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/overview');
    await expect(page.locator('body')).toBeVisible();

    // Test Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/overview');
    await expect(page.locator('body')).toBeVisible();

    // Test Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/overview');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-E2E-06: Administrator Console & Incident Remediation Interface', async ({ page }) => {
    // 1. Log in as Administrator
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview');

    // 2. Navigate to /admin
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Administration Console' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Administrator Governance' })).toBeVisible();
    await expect(page.locator('body')).toContainText('RBAC Role Hierarchy');
    await expect(page.locator('body')).toContainText('Inbound Inquiries Triage');
    await expect(page.locator('a[href="/settings/enquiries"]').first()).toBeVisible();

    // 3. Navigate to an active incident and inspect Remediation Card
    await page.goto('/incidents');
    await page.waitForLoadState('networkidle');
    const incidentLink = page.locator('a[href^="/incidents/"]').first();
    if (await incidentLink.isVisible()) {
      await incidentLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify Human-in-the-Loop Remediation Card
      await expect(page.locator('text=Human-in-the-Loop Remediation Runbooks')).toBeVisible();
      await expect(page.locator('text=Select Authorized Runbook')).toBeVisible();
      await expect(page.locator('text=Graceful Pod Restart')).toBeVisible();
      await expect(page.locator('#approval_checkbox')).toBeVisible();
      await expect(page.locator('textarea[placeholder*="Approved rolling restart"]')).toBeVisible();
      await expect(page.locator('button:has-text("Authorize & Execute Runbook")')).toBeVisible();
    }
  });
});
