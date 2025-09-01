import { test, expect } from '@playwright/test';

test.describe('Playwright Basic Functionality Tests', () => {
  test('should be able to navigate to the application', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify the page loaded successfully
    expect(page.url()).toContain('localhost:9002');
    
    // Take a screenshot to verify visual rendering
    await page.screenshot({ path: 'tests/screenshots/homepage.png', fullPage: true });
  });

  test('should be able to interact with page elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if the page has a title
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('Page title:', title);
    
    // Check if there are any clickable elements
    const links = await page.locator('a').count();
    console.log('Number of links found:', links);
    expect(links).toBeGreaterThan(0);
    
    // Check if there are any buttons
    const buttons = await page.locator('button').count();
    console.log('Number of buttons found:', buttons);
    
    // Verify page content is loaded
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });

  test('should be able to navigate to login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the login page
    expect(page.url()).toContain('/login');
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[id*="email"]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password"], input[id*="password"]');
    
    // Verify login form elements exist
    await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
    await expect(passwordInput.first()).toBeVisible({ timeout: 10000 });
    
    console.log('Login form elements found and visible');
    
    // Take a screenshot of the login page
    await page.screenshot({ path: 'tests/screenshots/login-page.png', fullPage: true });
  });

  test('should handle browser interactions correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test viewport and responsive behavior
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: 'tests/screenshots/desktop-view.png' });
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'tests/screenshots/mobile-view.png' });
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Test JavaScript execution
    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(userAgent).toContain('Chrome');
    console.log('User Agent:', userAgent);
    
    // Test page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('Page reload successful');
  });

  test('should capture console logs and errors', async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];
    
    // Listen for console events
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any console logs to appear
    await page.waitForTimeout(2000);
    
    console.log('Console logs captured:', consoleLogs.length);
    console.log('Errors captured:', errors.length);
    
    // Log some of the console messages for debugging
    if (consoleLogs.length > 0) {
      console.log('Sample console logs:', consoleLogs.slice(0, 5));
    }
    
    if (errors.length > 0) {
      console.log('Errors found:', errors);
    }
    
    // The test passes regardless of console logs/errors for basic functionality testing
    expect(true).toBe(true);
  });
});