import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * Test credentials for login testing
 */
export const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'testpassword123',
  schoolCode: 'testschool'
};

/**
 * Real-world test credentials - Update these with actual test account credentials
 */
export const REAL_TEST_CREDENTIALS = {
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

/**
 * Common page selectors - Updated for Ant Design form structure
 */
export const SELECTORS = {
  login: {
    emailInput: 'input[placeholder="Email Address"]',
    passwordInput: 'input[placeholder="Password"]',
    schoolCodeInput: 'input[placeholder="School Code (Optional)"]',
    submitButton: 'button:has-text("Log in")',
    loginForm: 'form',
    errorMessage: '[role="alert"], .ant-alert-error, .ant-message-error',
    successMessage: '.ant-alert-success, .ant-message-success',
    loginTitle: 'h2:has-text("School System Login")',
    loginInstructions: 'text="Login Instructions"'
  },
  dashboard: {
    welcomeMessage: '[data-testid="welcome-message"], .welcome, h1, h2, .ant-typography-title',
    userMenu: '[data-testid="user-menu"], .user-menu, .ant-dropdown-trigger, .ant-avatar',
    sidebar: '[data-testid="sidebar"], .sidebar, .ant-layout-sider, .ant-menu',
    content: '.ant-layout-content, main, [role="main"]'
  }
};

/**
 * Base URL for your application
 */
export const BASE_URL = 'http://localhost:9002';

/**
 * Browser and page setup utilities
 */
export class PuppeteerTestHelper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setup(headless: boolean = true): Promise<{ browser: Browser; page: Page }> {
    this.browser = await puppeteer.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    return { browser: this.browser, page: this.page };
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  async navigateToLogin(page: Page): Promise<void> {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await this.waitForPageLoad(page);
    
    // Verify we're on the login page
    const url = page.url();
    if (!url.includes('/login')) {
      throw new Error(`Expected to be on login page, but got: ${url}`);
    }
    
    // Wait for email input to be present
    await page.waitForSelector(SELECTORS.login.emailInput, { timeout: 10000 });
  }

  async waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
  }

  async fillLoginForm(page: Page, credentials: {
    email: string;
    password: string;
    schoolCode?: string;
  }): Promise<void> {
    console.log(`Filling login form with email: ${credentials.email}`);
    
    // Clear and fill email
    await page.click(SELECTORS.login.emailInput);
    await page.evaluate(() => document.execCommand('selectall', false, undefined));
    await page.type(SELECTORS.login.emailInput, credentials.email);
    
    // Clear and fill password
    await page.click(SELECTORS.login.passwordInput);
    await page.evaluate(() => document.execCommand('selectall', false, undefined));
    await page.type(SELECTORS.login.passwordInput, credentials.password);
    
    // Fill school code if provided
    if (credentials.schoolCode) {
      await page.click(SELECTORS.login.schoolCodeInput);
      await page.evaluate(() => document.execCommand('selectall', false, undefined));
      await page.type(SELECTORS.login.schoolCodeInput, credentials.schoolCode);
    }
    
    console.log('Login form filled successfully');
  }

  async submitLoginForm(page: Page): Promise<void> {
    console.log('Submitting login form...');
    
    // Click submit button
    await page.click(SELECTORS.login.submitButton);
    
    // Wait a moment for form submission
    await page.waitForTimeout(1000);
  }

  async takeScreenshot(page: Page, filename: string): Promise<void> {
    await page.screenshot({ 
      path: `tests/screenshots/${filename}`, 
      fullPage: true 
    });
    console.log(`Screenshot saved: ${filename}`);
  }

  async checkForLoginError(page: Page): Promise<string | null> {
    try {
      // Wait briefly for error message to appear
      await page.waitForSelector(SELECTORS.login.errorMessage, { timeout: 3000 });
      const errorElement = await page.$(SELECTORS.login.errorMessage);
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        return errorText?.trim() || null;
      }
    } catch (error) {
      // No error message found
    }
    return null;
  }

  async verifySuccessfulLogin(page: Page): Promise<boolean> {
    try {
      // Wait for navigation away from login page
      await page.waitForFunction(
        () => !window.location.pathname.includes('/login'),
        { timeout: 10000 }
      );
      
      // Check if we're on a dashboard or success page
      const url = page.url();
      const isOnDashboard = url.includes('/dashboard') || 
                           url.includes('/portal') || 
                           url.includes('/admin') || 
                           !url.includes('/login');
      
      if (isOnDashboard) {
        console.log(`Successfully redirected to: ${url}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login verification failed:', error);
      return false;
    }
  }

  async waitForNavigation(page: Page, timeout: number = 10000): Promise<void> {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout });
  }

  async expectUrl(page: Page, expectedPattern: string | RegExp): Promise<void> {
    const currentUrl = page.url();
    const matches = typeof expectedPattern === 'string' 
      ? currentUrl.includes(expectedPattern)
      : expectedPattern.test(currentUrl);
    
    if (!matches) {
      throw new Error(`Expected URL to match ${expectedPattern}, but got: ${currentUrl}`);
    }
  }

  async expectElementVisible(page: Page, selector: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    const isVisible = await element.isIntersectingViewport();
    if (!isVisible) {
      throw new Error(`Element not visible: ${selector}`);
    }
  }

  async expectElementText(page: Page, selector: string, expectedText: string): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    const actualText = await page.evaluate(el => el.textContent, element);
    if (!actualText?.includes(expectedText)) {
      throw new Error(`Expected element to contain "${expectedText}", but got: "${actualText}"`);
    }
  }
}

/**
 * Create a new test helper instance
 */
export function createTestHelper(): PuppeteerTestHelper {
  return new PuppeteerTestHelper();
}