import { test, expect } from '@playwright/test'

test.describe('API Key Management', () => {
  // Helper function to simulate login
  async function login(page) {
    await page.goto('/')
    await page.click('button:has-text("Sign In")')
    await page.fill('input[type="email"]', 'demo@pdfsaas.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]:has-text("Sign In")')
    // Wait for login to complete
    await page.waitForTimeout(1000)
  }

  test('should require authentication to access API keys page', async ({ page }) => {
    // Try to access API keys page directly without auth
    await page.goto('/api-keys')

    // Should redirect to login or show auth modal
    await expect(page.url()).toMatch(/\/(login)?/)
    // Or check if we're redirected to dashboard
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
  })

  test('should show API keys navigation for authenticated users', async ({ page }) => {
    // Login first
    await login(page)

    // Check if API Keys link is visible in navigation
    await expect(page.locator('nav a[href="/api-keys"]')).toBeVisible()
    await expect(page.locator('nav a[href="/api-keys"]')).toContainText('API Keys')
  })

  test('should display API keys dashboard', async ({ page }) => {
    // Login and navigate to API keys
    await login(page)
    await page.click('a[href="/api-keys"]')

    // Check page elements
    await expect(page.locator('h1:has-text("API Key Management")')).toBeVisible()
    await expect(page.locator('text=Create and manage API keys')).toBeVisible()

    // Check main dashboard components
    await expect(page.locator('text=Your API Keys')).toBeVisible()
    await expect(page.locator('button:has-text("Create New API Key")')).toBeVisible()
  })

  test('should open create API key modal', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')

    // Click create button
    await page.click('button:has-text("Create New API Key")')

    // Check modal is open
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('h2:has-text("Create API Key")')).toBeVisible()

    // Check form elements
    await expect(page.locator('input[placeholder*="Production API Key"]')).toBeVisible()
    await expect(page.locator('textarea[placeholder*="Optional description"]')).toBeVisible()
  })

  test('should show API key creation form fields', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')
    await page.click('button:has-text("Create New API Key")')

    // Check basic information section
    await expect(page.locator('text=Basic Information')).toBeVisible()
    await expect(page.locator('label:has-text("Key Name")')).toBeVisible()
    await expect(page.locator('label:has-text("Description")')).toBeVisible()

    // Check permissions section
    await expect(page.locator('text=Permissions')).toBeVisible()
    await expect(page.locator('text=Read')).toBeVisible()
    await expect(page.locator('text=Write')).toBeVisible()
    await expect(page.locator('text=Admin')).toBeVisible()
    await expect(page.locator('text=Webhook')).toBeVisible()

    // Check rate limiting section
    await expect(page.locator('text=Rate Limiting')).toBeVisible()
    await expect(page.locator('text=100/hour - Development')).toBeVisible()
    await expect(page.locator('text=1,000/hour - Production')).toBeVisible()

    // Check expiration section
    await expect(page.locator('text=Expiration')).toBeVisible()
    await expect(page.locator('input[type="date"]')).toBeVisible()
  })

  test('should validate API key creation form', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')
    await page.click('button:has-text("Create New API Key")')

    // Try to submit empty form
    await page.click('button:has-text("Create API Key")')

    // Should show validation error
    await expect(page.locator('text=API key name is required')).toBeVisible()
  })

  test('should create API key successfully', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')
    await page.click('button:has-text("Create New API Key")')

    // Fill form
    await page.fill('input[placeholder*="Production API Key"]', 'Test API Key')
    await page.fill('textarea[placeholder*="Optional description"]', 'Test description')

    // Select permissions (Read and Write should be selected by default)
    await expect(page.locator('input[type="checkbox"][value="read"]')).toBeChecked()
    await expect(page.locator('input[type="checkbox"][value="write"]')).toBeChecked()

    // Submit form
    await page.click('button:has-text("Create API Key")')

    // Should show success state
    await expect(page.locator('text=API Key Created!')).toBeVisible()
    await expect(page.locator('text=Your API key has been generated')).toBeVisible()

    // Should show the generated key
    await expect(page.locator('text=Your API Key')).toBeVisible()
    await expect(page.locator('text=pdfsaas_')).toBeVisible()

    // Should show copy button
    await expect(page.locator('button[title="Copy to clipboard"]')).toBeVisible()

    // Should show quick start example
    await expect(page.locator('text=Quick Start')).toBeVisible()
    await expect(page.locator('text=curl -X POST')).toBeVisible()
  })

  test('should display API usage analytics', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')

    // Check overview cards
    await expect(page.locator('text=Total Monthly Requests')).toBeVisible()
    await expect(page.locator('text=Average Daily')).toBeVisible()
    await expect(page.locator('text=Active Keys Today')).toBeVisible()

    // Check usage analytics section
    await expect(page.locator('text=API Usage Analytics')).toBeVisible()
    await expect(page.locator('text=Weekly Usage Pattern')).toBeVisible()

    // Check recent activity section
    await expect(page.locator('text=Recent Activity')).toBeVisible()
  })

  test('should show usage charts for each API key', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')

    // If there are API keys, check their usage displays
    const keyCards = page.locator('[data-testid="api-key-card"], .border.rounded-lg')

    if (await keyCards.count() > 0) {
      // Check first key card has usage info
      await expect(keyCards.first().locator('text=requests this month')).toBeVisible()
      await expect(keyCards.first().locator('text=Today')).toBeVisible()
      await expect(keyCards.first().locator('text=Weekly Avg')).toBeVisible()
      await expect(keyCards.first().locator('text=Rate Limit')).toBeVisible()
      await expect(keyCards.first().locator('text=Daily Usage')).toBeVisible()
    }
  })

  test('should handle API key actions', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')

    // Look for API key action buttons
    const actionButtons = page.locator('button:has-text("Copy"), button:has-text("Regenerate"), button:has-text("Delete")')

    if (await actionButtons.count() > 0) {
      // Test copy functionality (would need to mock clipboard)
      await expect(page.locator('button:has-text("Copy")')).toBeVisible()

      // Test other action buttons are present
      await expect(page.locator('button:has-text("...")')).toBeVisible()
    }
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')

    // Test mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })

    // Check key elements are still visible
    await expect(page.locator('h1:has-text("API Key Management")')).toBeVisible()
    await expect(page.locator('button:has-text("Create New API Key")')).toBeVisible()

    // Overview cards should stack on mobile
    const overviewCards = page.locator('.grid.grid-cols-1.md\\:grid-cols-3')
    await expect(overviewCards).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('h1:has-text("API Key Management")')).toBeVisible()
  })

  test('should close modal when clicking cancel or outside', async ({ page }) => {
    await login(page)
    await page.goto('/api-keys')
    await page.click('button:has-text("Create New API Key")')

    // Modal should be open
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Click cancel button
    await page.click('button:has-text("Cancel")')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    // Open again and click outside
    await page.click('button:has-text("Create New API Key")')
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Click backdrop
    await page.click('.fixed.inset-0.bg-black.bg-opacity-50')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})