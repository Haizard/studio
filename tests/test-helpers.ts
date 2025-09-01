import { Page, expect } from '@playwright/test';

/**
 * Test credentials for login testing
 */
export const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'testpassword123',
  schoolCode: 'testschool'
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
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Fill login form with provided credentials
 */
export async function fillLoginForm(page: Page, credentials: {
  email: string;
  password: string;
  schoolCode?: string;
}): Promise<void> {
  // Fill email
  await page.fill(SELECTORS.login.emailInput, credentials.email);
  
  // Fill password
  await page.fill(SELECTORS.login.passwordInput, credentials.password);
  
  // Fill school code if provided
  if (credentials.schoolCode) {
    await page.fill(SELECTORS.login.schoolCodeInput, credentials.schoolCode);
  }
}

/**
 * Submit login form
 */
export async function submitLoginForm(page: Page): Promise<void> {
  await page.click(SELECTORS.login.submitButton);
}

/**
 * Check if user is successfully logged in by looking for dashboard elements
 */
export async function verifySuccessfulLogin(page: Page): Promise<void> {
  // Wait for navigation after login
  await page.waitForURL(/.*\/(portal|dashboard).*/, { timeout: 10000 });
  
  // Check for dashboard elements
  const dashboardElements = [
    SELECTORS.dashboard.welcomeMessage,
    SELECTORS.dashboard.userMenu,
    SELECTORS.dashboard.sidebar
  ];
  
  // At least one dashboard element should be visible
  let foundDashboardElement = false;
  for (const selector of dashboardElements) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      foundDashboardElement = true;
      break;
    } catch (error) {
      // Continue to next selector
    }
  }
  
  expect(foundDashboardElement).toBeTruthy();
}

/**
 * Check for login error messages
 */
export async function checkForLoginError(page: Page): Promise<string | null> {
  try {
    const errorElement = await page.waitForSelector(SELECTORS.login.errorMessage, { timeout: 3000 });
    return await errorElement.textContent();
  } catch (error) {
    return null;
  }
}

/**
 * Navigate to login page
 */
export async function navigateToLogin(page: Page): Promise<void> {
  await page.goto('/login');
  await waitForPageLoad(page);
  
  // Verify we're on the login page
  await expect(page).toHaveURL(/.*\/login.*/);
  await page.waitForSelector(SELECTORS.login.emailInput);
}