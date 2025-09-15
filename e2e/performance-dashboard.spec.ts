import { test, expect } from '@playwright/test'

test.describe('Performance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/performance')
  })

  test('should load performance dashboard successfully', async ({ page }) => {
    // Check page title and main heading
    await expect(page).toHaveTitle(/Performance/)
    await expect(page.locator('h1:has-text("Performance Benchmarks")')).toBeVisible()
    await expect(page.locator('text=Real-world performance comparison')).toBeVisible()
  })

  test('should display navigation and return to dashboard', async ({ page }) => {
    // Check navigation elements
    await expect(page.locator('nav a[href="/"]')).toContainText('Dashboard')
    await expect(page.locator('nav a[href="/performance"]')).toContainText('Performance')

    // Test navigation back to dashboard
    await page.click('nav a[href="/"]')
    await expect(page.url()).toMatch(/\/$/)
  })

  test('should display speed comparison section', async ({ page }) => {
    // Check speed comparison title
    await expect(page.locator('text=Processing Speed Comparison')).toBeVisible()
    await expect(page.locator('text=PDF SaaS vs Adobe Acrobat')).toBeVisible()

    // Check speed metrics
    await expect(page.locator('text=PDF SaaS')).toBeVisible()
    await expect(page.locator('text=Adobe Acrobat')).toBeVisible()
    await expect(page.locator('text=6s')).toBeVisible()
    await expect(page.locator('text=45s')).toBeVisible()
    await expect(page.locator('text=10x faster')).toBeVisible()
  })

  test('should show benchmark results section', async ({ page }) => {
    // Check benchmark results
    await expect(page.locator('text=Live Benchmark Results')).toBeVisible()
    await expect(page.locator('text=Latest performance tests')).toBeVisible()

    // Check benchmark metrics
    await expect(page.locator('text=Compression')).toBeVisible()
    await expect(page.locator('text=PDF to DOCX')).toBeVisible()
    await expect(page.locator('text=PDF to Images')).toBeVisible()

    // Check status indicators
    await expect(page.locator('text=Excellent')).toBeVisible()
    await expect(page.locator('text=Good')).toBeVisible()
  })

  test('should display file size categories', async ({ page }) => {
    // Check different file size categories in benchmarks
    await expect(page.locator('text=Small (< 5MB)')).toBeVisible()
    await expect(page.locator('text=Medium (5-20MB)')).toBeVisible()
    await expect(page.locator('text=Large (20MB+)')).toBeVisible()
  })

  test('should show processing time metrics', async ({ page }) => {
    // Check various time metrics are displayed
    const timePattern = /\d+\.?\d*[smμ]/  // Matches time like "2.3s", "450ms", "12μs"

    // Look for time measurements in the benchmark results
    await expect(page.locator(`text=${timePattern.source}`).first()).toBeVisible()
  })

  test('should display performance improvement percentages', async ({ page }) => {
    // Check improvement percentages
    await expect(page.locator('text=faster')).toBeVisible()
    await expect(page.locator('text=10x')).toBeVisible()

    // Look for percentage improvements
    const percentPattern = /\d+%/
    await expect(page.locator(`text=${percentPattern.source}`).first()).toBeVisible()
  })

  test('should show quality metrics', async ({ page }) => {
    // Check quality preservation metrics
    await expect(page.locator('text=Quality')).toBeVisible()
    await expect(page.locator('text=Compression Ratio')).toBeVisible()
    await expect(page.locator('text=File Size Reduction')).toBeVisible()
  })

  test('should display real-time status indicators', async ({ page }) => {
    // Check status indicators for different operations
    const statusIndicators = page.locator('.bg-green-100, .bg-yellow-100, .bg-red-100')
    await expect(statusIndicators.first()).toBeVisible()

    // Check status text
    await expect(page.locator('text=Operational')).toBeVisible()
  })

  test('should show system performance metrics', async ({ page }) => {
    // Check system performance indicators
    await expect(page.locator('text=CPU Usage')).toBeVisible()
    await expect(page.locator('text=Memory Usage')).toBeVisible()
    await expect(page.locator('text=Processing Queue')).toBeVisible()
  })

  test('should display benchmark comparison charts', async ({ page }) => {
    // Check for chart/visualization elements
    await expect(page.locator('.bg-blue-500, .bg-gradient-to-r')).toBeVisible()

    // Check chart labels and legends
    await expect(page.locator('text=Our Platform')).toBeVisible()
    await expect(page.locator('text=Competitor')).toBeVisible()
  })

  test('should show technology stack information', async ({ page }) => {
    // Check technology details
    await expect(page.locator('text=Powered by')).toBeVisible()
    await expect(page.locator('text=Advanced Algorithms')).toBeVisible()
    await expect(page.locator('text=Cloud Infrastructure')).toBeVisible()
  })

  test('should display refresh functionality', async ({ page }) => {
    // Look for refresh or reload buttons for live data
    const refreshButtons = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"], button[title*="refresh"]')

    if (await refreshButtons.count() > 0) {
      await expect(refreshButtons.first()).toBeVisible()
    }
  })

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })

    // Key elements should still be visible
    await expect(page.locator('h1:has-text("Performance Benchmarks")')).toBeVisible()
    await expect(page.locator('text=PDF SaaS vs Adobe Acrobat')).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('text=10x faster')).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('text=Processing Speed Comparison')).toBeVisible()
  })

  test('should handle loading states gracefully', async ({ page }) => {
    // Reload page to check loading states
    await page.reload()

    // Check that content loads properly
    await expect(page.locator('h1:has-text("Performance Benchmarks")')).toBeVisible()

    // Wait for dynamic content to load
    await page.waitForTimeout(1000)
    await expect(page.locator('text=Live Benchmark Results')).toBeVisible()
  })

  test('should display accurate benchmark data format', async ({ page }) => {
    // Check that benchmark data follows expected formats
    // File sizes should be in MB/KB format
    await expect(page.locator('text=MB')).toBeVisible()

    // Processing times should be in seconds/milliseconds
    await expect(page.locator('text=seconds')).toBeVisible()

    // Percentages should be properly formatted
    const percentageElements = page.locator('text=/\\d+%/')
    if (await percentageElements.count() > 0) {
      await expect(percentageElements.first()).toBeVisible()
    }
  })

  test('should show performance comparison tooltips or details', async ({ page }) => {
    // Check for interactive elements that show more details
    const interactiveElements = page.locator('[title], [data-tooltip], .hover\\:bg-')

    if (await interactiveElements.count() > 0) {
      // Hover over elements to check for tooltips or additional info
      await interactiveElements.first().hover()
      await page.waitForTimeout(500)
    }
  })

  test('should validate benchmark result authenticity indicators', async ({ page }) => {
    // Check for elements that indicate real vs simulated data
    await expect(page.locator('text=Real-time')).toBeVisible()
    await expect(page.locator('text=Live')).toBeVisible()

    // Check timestamp or last updated information
    const timestampPattern = /\d{1,2}:\d{2}|Updated|Last run/
    await expect(page.locator(`text=${timestampPattern.source}`).first()).toBeVisible()
  })
})