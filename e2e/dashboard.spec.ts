import { test, expect } from '@playwright/test'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load dashboard page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/PDF SaaS/)

    // Check main heading
    await expect(page.locator('h1')).toContainText('PDF SaaS')
    await expect(page.locator('text=10x faster than Adobe')).toBeVisible()
  })

  test('should display navigation elements', async ({ page }) => {
    // Check navigation links
    await expect(page.locator('nav a[href="/"]')).toContainText('Dashboard')
    await expect(page.locator('nav a[href="/performance"]')).toContainText('Performance')

    // Check auth buttons for non-authenticated users
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
    await expect(page.locator('button:has-text("Get Started")')).toBeVisible()
  })

  test('should display key features section', async ({ page }) => {
    // Check for main feature cards
    await expect(page.locator('text=Lightning Fast Processing')).toBeVisible()
    await expect(page.locator('text=Enterprise Security')).toBeVisible()
    await expect(page.locator('text=API Integration')).toBeVisible()
  })

  test('should show PDF upload area', async ({ page }) => {
    // Check for file upload functionality
    await expect(page.locator('text=Drop your PDF here')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })

    // Check that content is still visible and accessible
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('button:has-text("Get Started")')).toBeVisible()
  })
})