import { test, expect } from '@playwright/test';

test.describe('AIOps Sentinel - Signup & Registration End-to-End Tests', () => {
  test('TC-SIGNUP-01: Direct navigation to /signup renders Create Account view', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveTitle(/AIOps Sentinel/i);

    // Verify Create Account tab is active and form fields are present
    await expect(page.locator('label:has-text("Full Name / Display Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email Address")')).toBeVisible();
    await expect(page.getByText('Password', { exact: true })).toBeVisible();
    await expect(page.locator('label:has-text("Confirm Password")')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account & Sign In' })).toBeVisible();
  });

  test('TC-SIGNUP-02: Direct navigation to /register renders Create Account view', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/AIOps Sentinel/i);
    await expect(page.locator('label:has-text("Full Name / Display Name")')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account & Sign In' })).toBeVisible();
  });

  test('TC-SIGNUP-03: Client-side validation for empty fields and weak passwords', async ({ page }) => {
    await page.goto('/signup');

    // 1. Submit with empty fields
    await page.fill('input[placeholder="e.g. Ashis Pradhan"]', 'John Doe');
    await page.fill('input[placeholder="analyst@domain.com"]', 'invalid-email');
    await page.fill('input[placeholder="Min. 8 characters"]', 'Weak1!');
    await page.fill('input[placeholder="Confirm password"]', 'Weak1!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();

    // 2. Submit with password less than 8 characters
    await page.fill('input[placeholder="analyst@domain.com"]', 'valid@domain.com');
    await page.fill('input[placeholder="Min. 8 characters"]', 'Short1!');
    await page.fill('input[placeholder="Confirm password"]', 'Short1!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 8 characters long')).toBeVisible();

    // 3. Submit with password lacking uppercase
    await page.fill('input[placeholder="Min. 8 characters"]', 'lowercase123!');
    await page.fill('input[placeholder="Confirm password"]', 'lowercase123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must contain at least one uppercase letter')).toBeVisible();

    // 4. Submit with password lacking lowercase
    await page.fill('input[placeholder="Min. 8 characters"]', 'UPPERCASE123!');
    await page.fill('input[placeholder="Confirm password"]', 'UPPERCASE123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must contain at least one lowercase letter')).toBeVisible();

    // 5. Submit with password lacking digit
    await page.fill('input[placeholder="Min. 8 characters"]', 'LettersOnly!');
    await page.fill('input[placeholder="Confirm password"]', 'LettersOnly!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must contain at least one numerical digit')).toBeVisible();

    // 6. Submit with mismatched passwords
    await page.fill('input[placeholder="Min. 8 characters"]', 'ValidPass123!');
    await page.fill('input[placeholder="Confirm password"]', 'DifferentPass123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('TC-SIGNUP-04: Successful user account creation and automatic login', async ({ page }) => {
    const uniqueEmail = `test_user_${Date.now()}@sentinel.io`;
    const strongPassword = 'StrongPassword123!';

    await page.goto('/signup');
    await page.fill('input[placeholder="e.g. Ashis Pradhan"]', 'Sentinel QA Engineer');
    await page.fill('input[placeholder="analyst@domain.com"]', uniqueEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', strongPassword);
    await page.fill('input[placeholder="Confirm password"]', strongPassword);

    await page.click('button[type="submit"]');

    // Expect success message and redirect
    await expect(page.locator('text=Account created successfully')).toBeVisible();
    await page.waitForURL('**/overview', { timeout: 10000 });

    // Verify token stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('aiops_token'));
    expect(token).toBeTruthy();
    expect(token?.length).toBeGreaterThan(20);
  });

  test('TC-SIGNUP-05: Duplicate email registration returns clean conflict error', async ({ page }) => {
    const existingEmail = `dup_user_${Date.now()}@sentinel.io`;
    const password = 'StrongPassword123!';

    // First registration
    await page.goto('/signup');
    await page.fill('input[placeholder="e.g. Ashis Pradhan"]', 'Original User');
    await page.fill('input[placeholder="analyst@domain.com"]', existingEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', password);
    await page.fill('input[placeholder="Confirm password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview', { timeout: 10000 });

    // Clear token and try registering with the exact same email
    await page.evaluate(() => localStorage.removeItem('aiops_token'));
    await page.goto('/signup');
    await page.fill('input[placeholder="e.g. Ashis Pradhan"]', 'Duplicate Attempt');
    await page.fill('input[placeholder="analyst@domain.com"]', existingEmail);
    await page.fill('input[placeholder="Min. 8 characters"]', password);
    await page.fill('input[placeholder="Confirm password"]', password);
    await page.click('button[type="submit"]');

    // Expect conflict error in UI banner without 500
    await expect(page.locator('text=An account with this email already exists')).toBeVisible();
  });
});
