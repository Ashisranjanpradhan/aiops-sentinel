import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@aiops.sentinel';
const ADMIN_PASSWORD = 'sentinel-admin-1234';

test.describe('AIOps Sentinel Public SaaS & Theme System', () => {
  test('TC-PUB-01: Public Homepage loads without redirecting to login', async ({ page }) => {
    await page.goto('/');
    // Must remain on root path, not redirected to /login
    await expect(page).toHaveURL(/.*:\d+\/$/);
    await expect(page).toHaveTitle(/AIOps Sentinel/i);

    // Verify Hero content
    await expect(page.locator('h1')).toContainText('Verify Code Before Deployment');
    await expect(page.locator('text=Unified Reliability Intelligence')).toBeVisible();

    // Verify Dual Pillars
    await expect(page.locator('text=Codebase Production-Readiness')).toBeVisible();
    await expect(page.locator('text=Runtime Reliability Intelligence')).toBeVisible();

    // Verify Dynamic Visuals & Showcase are mounted
    await expect(page.locator('text=Interactive Microservice Topology & Telemetry')).toBeVisible();
    await expect(page.locator('text=The Unified Reliability Workflow')).toBeVisible();
    await expect(page.locator('text=6-Layer Modular Architecture')).toBeVisible();
    await expect(page.locator('text=Experience the Sentinel Console')).toBeVisible();
  });

  test('TC-PUB-02: Public Navigation Header and Page Routing', async ({ page, isMobile }) => {
    await page.goto('/');

    const openNavIfMobile = async () => {
      if (isMobile) {
        const toggleBtn = page.locator('button[aria-label="Toggle navigation menu"]');
        if (await toggleBtn.isVisible()) {
          const isExpanded = await toggleBtn.getAttribute('aria-expanded');
          if (isExpanded !== 'true') {
            await toggleBtn.click();
            await page.waitForTimeout(200);
          }
        }
      }
    };

    // Navigate to About
    await openNavIfMobile();
    await page.locator('a:has-text("About")').locator('visible=true').first().click();
    await page.waitForURL('**/about');
    await expect(page.locator('h1')).toContainText('Bridging Static Code Quality & Runtime Observability');

    // Navigate to Features
    await openNavIfMobile();
    await page.locator('a:has-text("Features")').locator('visible=true').first().click();
    await page.waitForURL('**/features');
    await expect(page.locator('h1')).toContainText('Complete Feature Deep-Dive');
    await expect(page.locator('text=The 10-Dimension Evaluation Rubric')).toBeVisible();

    // Navigate to Research
    await openNavIfMobile();
    await page.locator('a:has-text("Research")').locator('visible=true').first().click();
    await page.waitForURL('**/research');
    await expect(page.locator('h1')).toContainText('Research & Methodology');
    await expect(page.locator('text=Median Absolute Deviation (MAD)')).toBeVisible();
    await expect(page.locator('text=Official RCAEval Benchmark vs. Internal Synthetic Scenarios')).toBeVisible();

    // Navigate to Documentation
    await openNavIfMobile();
    await page.locator('a:has-text("Documentation")').locator('visible=true').first().click();
    await page.waitForURL('**/docs');
    await expect(page.locator('h1')).toContainText('Platform Documentation & Quick Start');

    // Navigate to Contact Us
    await openNavIfMobile();
    await page.locator('a:has-text("Contact Us")').locator('visible=true').first().click();
    await page.waitForURL('**/contact');
    await expect(page.locator('h1')).toContainText('Contact AIOps Sentinel');
  });

  test('TC-PUB-03: Global Theme Toggle System & Persistence', async ({ page }) => {
    await page.goto('/');

    const htmlTag = page.locator('html');
    const themeBtn = page.locator('button[aria-label*="Toggle display theme"]').locator('visible=true').first();
    await expect(themeBtn).toBeVisible();

    // Open Theme Dropdown
    await themeBtn.click();
    const darkOption = page.getByRole('menuitem', { name: 'Dark' });
    const lightOption = page.getByRole('menuitem', { name: 'Light' });
    const systemOption = page.getByRole('menuitem', { name: 'System' });

    await expect(darkOption).toBeVisible();
    await expect(lightOption).toBeVisible();
    await expect(systemOption).toBeVisible();

    // Select Dark Mode
    await darkOption.click();
    await expect(htmlTag).toHaveClass(/dark/);
    await expect(htmlTag).toHaveAttribute('data-theme', 'dark');

    // Verify localStorage persistence
    const storedTheme = await page.evaluate(() => localStorage.getItem('aiops_theme'));
    expect(storedTheme).toBe('dark');

    // Select Light Mode
    const themeBtnAfter = page.locator('button[aria-label*="Toggle display theme"]').locator('visible=true').first();
    await themeBtnAfter.click();
    await lightOption.click();
    await expect(htmlTag).not.toHaveClass(/dark/);
    await expect(htmlTag).toHaveAttribute('data-theme', 'light');

    const storedLight = await page.evaluate(() => localStorage.getItem('aiops_theme'));
    expect(storedLight).toBe('light');

    // Reload page and verify light theme persists
    await page.reload();
    await expect(htmlTag).not.toHaveClass(/dark/);
    await expect(htmlTag).toHaveAttribute('data-theme', 'light');
  });

  test('TC-PUB-04: Contact Form Validation & Submission Workflow', async ({ page }) => {
    await page.goto('/contact');

    // 1. Submit empty form to trigger validation
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Full name must be at least 2 characters')).toBeVisible();
    await expect(page.locator('text=Please enter a valid business email address')).toBeVisible();

    // 2. Invalid email check
    await page.fill('input[name="name"]', 'Dr. Evelyn Reed');
    await page.fill('input[name="email"]', 'notanemail');
    await page.fill('input[name="subject"]', 'Inquiry on microservice anomaly models');
    await page.fill('textarea[name="message"]', 'Short');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Please enter a valid business email address')).toBeVisible();
    await expect(page.locator('text=Message must be at least 10 characters')).toBeVisible();

    // 3. Valid form submission (wait 1.2s to satisfy anti-bot typing threshold)
    const testEmail = `evelyn.reed.${Date.now()}@research-inst.org`;
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="category"]', 'Research Collaboration');
    await page.fill('textarea[name="message"]', 'We are interested in evaluating AIOps Sentinel against our autonomous service cluster.');
    
    // Legitimate typing pause
    await page.waitForTimeout(1200);
    await page.click('button[type="submit"]');

    // Verify success confirmation view
    await expect(page.locator('text=Enquiry Successfully Received')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Dr. Evelyn Reed')).toBeVisible();
    await expect(page.locator('text=Research Collaboration')).toBeVisible();
  });

  test('TC-PUB-05: Authenticated Administrative Enquiries Management', async ({ page }) => {
    // 1. Log in as Administrator
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview', { timeout: 10000 });

    // 2. Navigate to Settings -> Enquiries
    await page.goto('/settings/enquiries');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Contact Enquiries Management' })).toBeVisible({ timeout: 10000 });

    // 3. Verify enquiry console and list load
    await expect(page.locator('span:has-text("Enquiries (")')).toBeVisible({ timeout: 10000 });

    // 4. Verify selecting enquiry
    const enquiryButtons = page.locator('[data-testid="enquiry-item"]');
    await expect(enquiryButtons.first()).toBeVisible({ timeout: 10000 });
    await enquiryButtons.first().click();
    await expect(page.locator('text=Original Message Body')).toBeVisible({ timeout: 5000 });

    // Update triage status
    await page.selectOption('select#triage-status', 'in_review');
    await page.fill('textarea[placeholder*="Add operational notes"]', 'Automated QA triage note.');

    await page.click('button:has-text("Save Triage Updates")');
    await expect(page.locator('text=Updates saved successfully!')).toBeVisible({ timeout: 5000 });
  });

  test('TC-PUB-06: Privacy and Terms Legal Governance Pages', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1')).toContainText('Privacy & Data Retention Policy');
    await expect(page.locator('text=Zero Source Code Retention')).toBeVisible();

    await page.goto('/terms');
    await expect(page.locator('h1')).toContainText('Terms of Service');
    await expect(page.locator('text=Permitted Use & Software Boundaries')).toBeVisible();
  });
});
