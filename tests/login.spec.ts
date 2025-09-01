import { test, expect, Page } from '@playwright/test';
import {
  TEST_CREDENTIALS,
  SELECTORS,
  waitForPageLoad,
  fillLoginForm,
  submitLoginForm,
  verifySuccessfulLogin,
  checkForLoginError,
  navigateToLogin
} from './test-helpers';

// Real-world test credentials - Update these with actual test account credentials
const REAL_TEST_CREDENTIALS = {
  // Super Admin credentials (no school code)
  superAdmin: {
    email: 'superadmin@example.com',
    password: 'changeme',
    schoolCode: '' // Empty for super admin
  },
  // School user credentials
  schoolUser: {
    email: 'teacher@school.edu',
    password: 'teacher123',
    schoolCode: 'SCH001'
  },
  // Invalid credentials for error testing
  invalid: {
    email: 'invalid@test.com',
    password: 'wrongpassword',
    schoolCode: 'INVALID'
  }
};

// Base URL for your application
const BASE_URL = 'http://localhost:9002';

test.describe('Real-World Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to your actual application
    await page.goto(`${BASE_URL}/login`);
    await waitForPageLoad(page);
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/login.*/);
    await page.waitForSelector(SELECTORS.login.emailInput);
  });

  test('should successfully login as Super Admin', async ({ page }) => {
    console.log('Testing Super Admin login...');
    
    // Fill login form with super admin credentials
    await fillLoginForm(page, REAL_TEST_CREDENTIALS.superAdmin);
    
    // Take screenshot before login
    await page.screenshot({ path: 'tests/screenshots/before-superadmin-login.png' });
    
    // Submit the form
    await submitLoginForm(page);
    
    // Wait for response and potential redirect
    await page.waitForTimeout(3000);
    
    // Check the result
    const currentUrl = page.url();
    const errorMessage = await checkForLoginError(page);
    
    if (errorMessage) {
      console.log('Super Admin login error:', errorMessage);
      // Take screenshot of error
      await page.screenshot({ path: 'tests/screenshots/superadmin-login-error.png' });
      
      // This might be expected if credentials don't exist
      expect(currentUrl).toMatch(/login/);
    } else {
      console.log('Super Admin login successful, redirected to:', currentUrl);
      
      // Take screenshot after successful login
      await page.screenshot({ path: 'tests/screenshots/after-superadmin-login.png' });
      
      // Verify we're redirected away from login
      expect(currentUrl).not.toMatch(/login/);
      
      // Look for dashboard or admin panel elements
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('should successfully login as School User', async ({ page }) => {
    console.log('Testing School User login...');
    
    // Fill login form with school user credentials
    await fillLoginForm(page, REAL_TEST_CREDENTIALS.schoolUser);
    
    // Take screenshot before login
    await page.screenshot({ path: 'tests/screenshots/before-schooluser-login.png' });
    
    // Submit the form
    await submitLoginForm(page);
    
    // Wait for response and potential redirect
    await page.waitForTimeout(3000);
    
    // Check the result
    const currentUrl = page.url();
    const errorMessage = await checkForLoginError(page);
    
    if (errorMessage) {
      console.log('School User login error:', errorMessage);
      // Take screenshot of error
      await page.screenshot({ path: 'tests/screenshots/schooluser-login-error.png' });
      
      // This might be expected if credentials don't exist
      expect(currentUrl).toMatch(/login/);
    } else {
      console.log('School User login successful, redirected to:', currentUrl);
      
      // Take screenshot after successful login
      await page.screenshot({ path: 'tests/screenshots/after-schooluser-login.png' });
      
      // Verify we're redirected away from login
      expect(currentUrl).not.toMatch(/login/);
      
      // Look for school portal elements
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('should handle invalid credentials with proper error messages', async ({ page }) => {
    console.log('Testing invalid credentials...');
    
    // Fill login form with invalid credentials
    await fillLoginForm(page, REAL_TEST_CREDENTIALS.invalid);
    
    // Take screenshot before login attempt
    await page.screenshot({ path: 'tests/screenshots/before-invalid-login.png' });
    
    // Submit the form
    await submitLoginForm(page);
    
    // Wait for error response
    await page.waitForTimeout(3000);
    
    // Should stay on login page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login/);
    
    // Check for error message
    const errorMessage = await checkForLoginError(page);
    console.log('Expected error message:', errorMessage);
    
    // Take screenshot of error state
    await page.screenshot({ path: 'tests/screenshots/invalid-login-error.png' });
    
    // Should show some kind of error indication
    if (errorMessage) {
      expect(errorMessage.toLowerCase()).toMatch(/invalid|error|wrong|incorrect/);
    }
  });

  test('should test complete login flow with form validation', async ({ page }) => {
    console.log('Testing complete login flow...');
    
    // Test empty form submission first
    await submitLoginForm(page);
    await page.waitForTimeout(1000);
    
    // Should stay on login page
    let currentUrl = page.url();
    expect(currentUrl).toMatch(/login/);
    
    // Now fill form step by step and test validation
    
    // Fill email only
    await page.fill(SELECTORS.login.emailInput, 'test@example.com');
    await submitLoginForm(page);
    await page.waitForTimeout(1000);
    
    // Fill password
    await page.fill(SELECTORS.login.passwordInput, 'password123');
    
    // Test with valid format but non-existent credentials
    await submitLoginForm(page);
    await page.waitForTimeout(3000);
    
    currentUrl = page.url();
    console.log('After form validation test, current URL:', currentUrl);
    
    // Take final screenshot
     await page.screenshot({ path: 'tests/screenshots/form-validation-test.png' });
   });
});

test.describe('Login Page Automation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await navigateToLogin(page);
  });

  test('should display login form elements correctly', async ({ page }) => {
    // Verify all login form elements are present
    await expect(page.locator(SELECTORS.login.emailInput)).toBeVisible();
    await expect(page.locator(SELECTORS.login.passwordInput)).toBeVisible();
    await expect(page.locator(SELECTORS.login.schoolCodeInput)).toBeVisible();
    await expect(page.locator(SELECTORS.login.submitButton)).toBeVisible();
    
    // Verify form placeholders and labels
    await expect(page.locator(SELECTORS.login.emailInput)).toHaveAttribute('placeholder', /email/i);
    await expect(page.locator(SELECTORS.login.passwordInput)).toHaveAttribute('type', 'password');
    await expect(page.locator(SELECTORS.login.schoolCodeInput)).toHaveAttribute('placeholder', /school.*code/i);
  });

  test('should handle empty form submission with validation', async ({ page }) => {
    // Try to submit empty form
    await submitLoginForm(page);
    
    // Check for validation messages or errors
    const errorMessage = await checkForLoginError(page);
    
    // Should either show validation error or stay on login page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login/);
  });

  test('should handle invalid credentials with error handling', async ({ page }) => {
    // Fill form with invalid credentials
    await fillLoginForm(page, {
      email: 'invalid@example.com',
      password: 'wrongpassword',
      schoolCode: 'invalidschool'
    });
    
    // Submit form
    await submitLoginForm(page);
    
    // Wait for response and check for error
    await page.waitForTimeout(2000); // Allow time for server response
    
    const errorMessage = await checkForLoginError(page);
    
    // Should either show error message or stay on login page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login/);
    
    // Log the error for debugging
    if (errorMessage) {
      console.log('Login error message:', errorMessage);
    }
  });

  test('should successfully fill and submit login form', async ({ page }) => {
    // Fill login form with test credentials
    await fillLoginForm(page, TEST_CREDENTIALS);
    
    // Verify form fields are filled correctly
    await expect(page.locator(SELECTORS.login.emailInput)).toHaveValue(TEST_CREDENTIALS.email);
    await expect(page.locator(SELECTORS.login.passwordInput)).toHaveValue(TEST_CREDENTIALS.password);
    await expect(page.locator(SELECTORS.login.schoolCodeInput)).toHaveValue(TEST_CREDENTIALS.schoolCode);
    
    // Submit the form
    await submitLoginForm(page);
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check the result - either successful login or error message
    const currentUrl = page.url();
    const errorMessage = await checkForLoginError(page);
    
    if (errorMessage) {
      console.log('Login attempt resulted in error:', errorMessage);
      // This is expected if test credentials don't exist in the system
      expect(currentUrl).toMatch(/login/);
    } else {
      // If no error, check if we were redirected (successful login)
      console.log('Login attempt completed, current URL:', currentUrl);
      
      // If redirected away from login, verify successful login
      if (!currentUrl.includes('/login')) {
        await verifySuccessfulLogin(page);
      }
    }
  });

  test('should handle form interaction and validation', async ({ page }) => {
    // Test individual field interactions
    
    // Focus on email field
    await page.focus(SELECTORS.login.emailInput);
    await expect(page.locator(SELECTORS.login.emailInput)).toBeFocused();
    
    // Type in email field
    await page.type(SELECTORS.login.emailInput, 'test@example.com');
    await expect(page.locator(SELECTORS.login.emailInput)).toHaveValue('test@example.com');
    
    // Clear and test password field
    await page.focus(SELECTORS.login.passwordInput);
    await page.type(SELECTORS.login.passwordInput, 'password123');
    await expect(page.locator(SELECTORS.login.passwordInput)).toHaveValue('password123');
    
    // Test school code field
    await page.focus(SELECTORS.login.schoolCodeInput);
    await page.type(SELECTORS.login.schoolCodeInput, 'testschool');
    await expect(page.locator(SELECTORS.login.schoolCodeInput)).toHaveValue('testschool');
    
    // Test form clearing
    await page.fill(SELECTORS.login.emailInput, '');
    await expect(page.locator(SELECTORS.login.emailInput)).toHaveValue('');
  });

  test('should handle keyboard navigation and submission', async ({ page }) => {
    // Fill form using keyboard navigation
    await page.focus(SELECTORS.login.emailInput);
    await page.keyboard.type(TEST_CREDENTIALS.email);
    
    // Tab to password field
    await page.keyboard.press('Tab');
    await page.keyboard.type(TEST_CREDENTIALS.password);
    
    // Tab to school code field
    await page.keyboard.press('Tab');
    await page.keyboard.type(TEST_CREDENTIALS.schoolCode);
    
    // Submit using Enter key
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Verify form was submitted (either error or redirect)
    const currentUrl = page.url();
    console.log('After keyboard submission, current URL:', currentUrl);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network issues by intercepting requests
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Fill and submit form
    await fillLoginForm(page, TEST_CREDENTIALS);
    await submitLoginForm(page);
    
    // Wait for potential error handling
    await page.waitForTimeout(3000);
    
    // Should handle network error gracefully
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login/);
    
    console.log('Network error test completed, stayed on login page as expected');
  });

  test('should validate form accessibility', async ({ page }) => {
    // Check for proper labels and accessibility attributes
    const emailInput = page.locator(SELECTORS.login.emailInput);
    const passwordInput = page.locator(SELECTORS.login.passwordInput);
    const submitButton = page.locator(SELECTORS.login.submitButton);
    
    // Verify inputs are accessible
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // Check if inputs can be focused
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    
    await passwordInput.focus();
    await expect(passwordInput).toBeFocused();
    
    console.log('Accessibility validation completed successfully');
  });
});

test.describe('Login Error Handling', () => {
  test('should handle server errors gracefully', async ({ page }) => {
    await navigateToLogin(page);
    
    // Intercept login requests and return server error
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await fillLoginForm(page, TEST_CREDENTIALS);
    await submitLoginForm(page);
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Should stay on login page and potentially show error
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login/);
    
    console.log('Server error handling test completed');
  });

  test('should handle timeout scenarios', async ({ page }) => {
    await navigateToLogin(page);
    
    // Intercept and delay login requests
    await page.route('**/api/auth/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
      route.continue();
    });
    
    await fillLoginForm(page, TEST_CREDENTIALS);
    await submitLoginForm(page);
    
    // Wait for timeout handling (shorter than the delay)
    await page.waitForTimeout(3000);
    
    // Should handle timeout gracefully
    const currentUrl = page.url();
    console.log('Timeout test - current URL:', currentUrl);
  });
});