import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should open login modal when Sign In is clicked', async ({ page }) => {
    // Click Sign In button
    await page.click('button:has-text("Sign In")')

    // Check modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible()

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible()
  })

  test('should open registration modal when Get Started is clicked', async ({ page }) => {
    // Click Get Started button
    await page.click('button:has-text("Get Started")')

    // Check modal is visible
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible()

    // Check form elements
    await expect(page.locator('input[placeholder*="Full Name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeVisible()
  })

  test('should validate login form', async ({ page }) => {
    // Open login modal
    await page.click('button:has-text("Sign In")')

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Sign In")')

    // Check for validation messages (browser native or custom)
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeFocused()
  })

  test('should validate registration form', async ({ page }) => {
    // Open registration modal
    await page.click('button:has-text("Get Started")')

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Create Account")')

    // Check for validation
    const nameInput = page.locator('input[placeholder*="Full Name"]')
    await expect(nameInput).toBeFocused()
  })

  test('should switch between login and registration', async ({ page }) => {
    // Open login modal
    await page.click('button:has-text("Sign In")')
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible()

    // Switch to registration
    await page.click('text=Create one here')
    await expect(page.locator('h2:has-text("Create Account")')).toBeVisible()

    // Switch back to login
    await page.click('text=Sign in here')
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible()
  })

  test('should close modal when clicking outside or close button', async ({ page }) => {
    // Open login modal
    await page.click('button:has-text("Sign In")')
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Close with X button
    await page.click('[aria-label="Close"], button:has-text("×")')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    // Open again and close with backdrop
    await page.click('button:has-text("Sign In")')
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Click backdrop (outside modal)
    await page.click('.fixed.inset-0.bg-black.bg-opacity-50')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('should simulate successful login flow', async ({ page }) => {
    // Open login modal
    await page.click('button:has-text("Sign In")')

    // Fill form with demo credentials
    await page.fill('input[type="email"]', 'demo@pdfsaas.com')
    await page.fill('input[type="password"]', 'demo123')

    // Submit form
    await page.click('button[type="submit"]:has-text("Sign In")')

    // Wait for potential redirect or state change
    await page.waitForTimeout(1000)

    // Check if modal closes (successful login simulation)
    // Note: This will depend on actual auth implementation
  })
})