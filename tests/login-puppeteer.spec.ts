import { Browser, Page } from 'puppeteer';
import {
  REAL_TEST_CREDENTIALS,
  SELECTORS,
  BASE_URL,
  createTestHelper,
  PuppeteerTestHelper
} from './puppeteer-helpers';

describe('Real-World Login Tests with Puppeteer', () => {
  let testHelper: PuppeteerTestHelper;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    testHelper = createTestHelper();
    const setup = await testHelper.setup(false); // Set to true for headless mode
    browser = setup.browser;
    page = setup.page;
  });

  afterAll(async () => {
    await testHelper.cleanup();
  });

  beforeEach(async () => {
    // Navigate to login page before each test
    await testHelper.navigateToLogin(page);
  });

  test('should successfully login as Super Admin', async () => {
    console.log('Testing Super Admin login...');
    
    // Take screenshot before login
    await testHelper.takeScreenshot(page, 'before-superadmin-login.png');
    
    // Fill and submit login form
    await testHelper.fillLoginForm(page, REAL_TEST_CREDENTIALS.superAdmin);
    await testHelper.submitLoginForm(page);
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Take screenshot after login attempt
    await testHelper.takeScreenshot(page, 'after-superadmin-login.png');
    
    // Check for login success
    const loginSuccess = await testHelper.verifySuccessfulLogin(page);
    
    if (loginSuccess) {
      console.log('✅ Super Admin login successful');
      // Verify we're on the correct dashboard
      await testHelper.expectUrl(page, /\/(dashboard|admin|portal)/);
    } else {
      // Check for error message
      const errorMessage = await testHelper.checkForLoginError(page);
      if (errorMessage) {
        console.log(`❌ Super Admin login failed with error: ${errorMessage}`);
        throw new Error(`Super Admin login failed: ${errorMessage}`);
      } else {
        console.log('❌ Super Admin login failed - no error message found');
        throw new Error('Super Admin login failed - unknown error');
      }
    }
  }, 30000);

  test('should successfully login as School User', async () => {
    console.log('Testing School User login...');
    
    // Take screenshot before login
    await testHelper.takeScreenshot(page, 'before-school-user-login.png');
    
    // Fill and submit login form
    await testHelper.fillLoginForm(page, REAL_TEST_CREDENTIALS.schoolUser);
    await testHelper.submitLoginForm(page);
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Take screenshot after login attempt
    await testHelper.takeScreenshot(page, 'after-school-user-login.png');
    
    // Check for login success
    const loginSuccess = await testHelper.verifySuccessfulLogin(page);
    
    if (loginSuccess) {
      console.log('✅ School User login successful');
      // Verify we're on the correct dashboard
      await testHelper.expectUrl(page, /\/(dashboard|portal)/);
    } else {
      // Check for error message
      const errorMessage = await testHelper.checkForLoginError(page);
      if (errorMessage) {
        console.log(`❌ School User login failed with error: ${errorMessage}`);
        throw new Error(`School User login failed: ${errorMessage}`);
      } else {
        console.log('❌ School User login failed - no error message found');
        throw new Error('School User login failed - unknown error');
      }
    }
  }, 30000);

  test('should show error for invalid credentials', async () => {
    console.log('Testing invalid credentials...');
    
    // Take screenshot before login
    await testHelper.takeScreenshot(page, 'before-invalid-login.png');
    
    // Fill and submit login form with invalid credentials
    await testHelper.fillLoginForm(page, REAL_TEST_CREDENTIALS.invalid);
    await testHelper.submitLoginForm(page);
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Take screenshot after login attempt
    await testHelper.takeScreenshot(page, 'after-invalid-login.png');
    
    // Check for error message
    const errorMessage = await testHelper.checkForLoginError(page);
    
    if (errorMessage) {
      console.log(`✅ Invalid login correctly showed error: ${errorMessage}`);
      // Verify we're still on login page
      await testHelper.expectUrl(page, '/login');
    } else {
      console.log('❌ Invalid login should have shown an error message');
      throw new Error('Expected error message for invalid credentials');
    }
  }, 30000);

  test('should handle empty form submission', async () => {
    console.log('Testing empty form submission...');
    
    // Take screenshot before submission
    await testHelper.takeScreenshot(page, 'before-empty-form.png');
    
    // Try to submit empty form
    await testHelper.submitLoginForm(page);
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Take screenshot after submission
    await testHelper.takeScreenshot(page, 'after-empty-form.png');
    
    // Should still be on login page
    await testHelper.expectUrl(page, '/login');
    
    console.log('✅ Empty form submission handled correctly');
  }, 30000);

  test('should validate email format', async () => {
    console.log('Testing email format validation...');
    
    // Fill form with invalid email format
    await testHelper.fillLoginForm(page, {
      email: 'invalid-email',
      password: 'somepassword',
      schoolCode: ''
    });
    
    // Take screenshot
    await testHelper.takeScreenshot(page, 'invalid-email-format.png');
    
    // Try to submit
    await testHelper.submitLoginForm(page);
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Should still be on login page (form validation should prevent submission)
    await testHelper.expectUrl(page, '/login');
    
    console.log('✅ Email format validation working correctly');
  }, 30000);

  test('should handle network timeout gracefully', async () => {
    console.log('Testing network timeout handling...');
    
    // Simulate slow network by intercepting requests
    await page.setRequestInterception(true);
    
    page.on('request', async (request) => {
      if (request.url().includes('/api/auth')) {
        // Delay auth requests to simulate timeout
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      request.continue();
    });
    
    // Fill and submit login form
    await testHelper.fillLoginForm(page, REAL_TEST_CREDENTIALS.superAdmin);
    await testHelper.submitLoginForm(page);
    
    // Wait for timeout handling
    await page.waitForTimeout(8000);
    
    // Take screenshot
    await testHelper.takeScreenshot(page, 'network-timeout-test.png');
    
    // Disable request interception
    await page.setRequestInterception(false);
    
    console.log('✅ Network timeout test completed');
  }, 45000);

  test('should maintain session after page refresh', async () => {
    console.log('Testing session persistence...');
    
    // First, login successfully
    await testHelper.fillLoginForm(page, REAL_TEST_CREDENTIALS.superAdmin);
    await testHelper.submitLoginForm(page);
    
    // Wait for login to complete
    await page.waitForTimeout(3000);
    
    const loginSuccess = await testHelper.verifySuccessfulLogin(page);
    
    if (loginSuccess) {
      console.log('✅ Initial login successful');
      
      // Get current URL
      const currentUrl = page.url();
      
      // Refresh the page
      await page.reload({ waitUntil: 'networkidle2' });
      
      // Take screenshot after refresh
      await testHelper.takeScreenshot(page, 'after-page-refresh.png');
      
      // Should still be on the same page (not redirected to login)
      const newUrl = page.url();
      if (newUrl.includes('/login')) {
        console.log('❌ Session not maintained after refresh');
        throw new Error('Session was not maintained after page refresh');
      } else {
        console.log('✅ Session maintained after page refresh');
      }
    } else {
      throw new Error('Initial login failed, cannot test session persistence');
    }
  }, 45000);
});

// Helper function to run tests
export async function runPuppeteerTests() {
  console.log('Starting Puppeteer login tests...');
  
  // You can run this function directly or use a test runner like Jest
  // For now, this serves as the test suite definition
}