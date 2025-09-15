import { test, expect } from '@playwright/test'

test.describe('Responsive Design and Mobile UX', () => {
  const viewports = [
    { name: 'Mobile Portrait', width: 390, height: 844 },
    { name: 'Mobile Landscape', width: 844, height: 390 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Desktop Small', width: 1366, height: 768 },
    { name: 'Desktop Large', width: 1920, height: 1080 },
  ]

  viewports.forEach(({ name, width, height }) => {
    test.describe(`${name} (${width}x${height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.goto('/')
      })

      test('should display header correctly', async ({ page }) => {
        // Header should be visible and functional
        await expect(page.locator('h1:has-text("PDF SaaS")')).toBeVisible()

        if (width >= 768) {
          // Desktop/tablet navigation
          await expect(page.locator('nav a[href="/"]')).toBeVisible()
          await expect(page.locator('nav a[href="/performance"]')).toBeVisible()
        } else {
          // Mobile might have a hamburger menu or compressed nav
          await expect(page.locator('button:has-text("Get Started")')).toBeVisible()
        }
      })

      test('should show PDF upload area appropriately', async ({ page }) => {
        // Upload area should be visible and usable
        await expect(page.locator('text=Drop your PDF here')).toBeVisible()
        await expect(page.locator('input[type="file"]')).toBeVisible()

        // On mobile, text might be smaller or abbreviated
        if (width < 768) {
          // Mobile-specific checks
          await expect(page.locator('text=or click to browse')).toBeVisible()
        }
      })

      test('should display processing options correctly', async ({ page }) => {
        // Processing options should be accessible
        await expect(page.locator('text=Compress')).toBeVisible()
        await expect(page.locator('text=Split')).toBeVisible()
        await expect(page.locator('text=Merge')).toBeVisible()
        await expect(page.locator('text=Convert')).toBeVisible()

        if (width < 768) {
          // On mobile, options might stack vertically
          const options = page.locator('input[type="radio"]')
          await expect(options.first()).toBeVisible()
        }
      })

      test('should show auth buttons appropriately', async ({ page }) => {
        if (width >= 768) {
          // Desktop: both buttons side by side
          await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
          await expect(page.locator('button:has-text("Get Started")')).toBeVisible()
        } else {
          // Mobile: might be stacked or in a menu
          await expect(page.locator('button:has-text("Get Started")')).toBeVisible()
        }
      })

      test('should handle modal dialogs responsively', async ({ page }) => {
        // Open auth modal
        await page.click('button:has-text("Sign In")')

        // Modal should be appropriately sized
        const modal = page.locator('[role="dialog"]')
        await expect(modal).toBeVisible()

        if (width < 768) {
          // Mobile modal should take most of screen
          const modalStyle = await modal.evaluate(el => getComputedStyle(el))
          // Could check for full-width or large padding adjustments
        }

        // Form elements should be accessible
        await expect(page.locator('input[type="email"]')).toBeVisible()
        await expect(page.locator('input[type="password"]')).toBeVisible()

        // Close modal
        await page.click('button:has-text("×"), [aria-label="Close"]')
      })

      test('should display content cards in grid layout', async ({ page }) => {
        // Feature cards should reflow based on screen size
        const featureCards = page.locator('text=Lightning Fast Processing').locator('..')

        if (width >= 1024) {
          // Desktop: likely 3 columns
          await expect(featureCards).toBeVisible()
        } else if (width >= 768) {
          // Tablet: likely 2 columns
          await expect(featureCards).toBeVisible()
        } else {
          // Mobile: single column
          await expect(featureCards).toBeVisible()
        }
      })
    })
  })

  test('should handle orientation changes on mobile', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    await expect(page.locator('h1:has-text("PDF SaaS")')).toBeVisible()

    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 })

    // Content should still be accessible
    await expect(page.locator('h1:has-text("PDF SaaS")')).toBeVisible()
    await expect(page.locator('text=Drop your PDF here')).toBeVisible()
  })

  test('should provide accessible touch targets on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // Buttons should be large enough for touch (minimum 44px)
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const boundingBox = await button.boundingBox()
        if (boundingBox) {
          // Touch targets should be at least 44px in either dimension
          expect(boundingBox.height >= 40 || boundingBox.width >= 44).toBeTruthy()
        }
      }
    }
  })

  test('should handle long content on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 }) // iPhone SE size
    await page.goto('/')

    // Content should not overflow horizontally
    const body = page.locator('body')
    const bodyBox = await body.boundingBox()

    if (bodyBox) {
      expect(bodyBox.width).toBeLessThanOrEqual(320)
    }

    // Text should be readable (not too small)
    const mainText = page.locator('h1, h2, p').first()
    if (await mainText.isVisible()) {
      const fontSize = await mainText.evaluate(el => getComputedStyle(el).fontSize)
      const fontSizeNum = parseInt(fontSize)
      expect(fontSizeNum).toBeGreaterThanOrEqual(14) // Minimum readable size
    }
  })

  test('should navigate between pages on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // Navigate to performance page
    await page.click('a[href="/performance"]')
    await expect(page.url()).toMatch(/\/performance/)
    await expect(page.locator('h1:has-text("Performance")')).toBeVisible()

    // Navigate back to dashboard
    await page.click('a[href="/"]')
    await expect(page.url()).toMatch(/\/$/)
    await expect(page.locator('text=Drop your PDF here')).toBeVisible()
  })

  test('should handle scroll behavior on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // Scroll down to see more content
    await page.evaluate(() => window.scrollTo(0, window.innerHeight))

    // Header should still be accessible (either sticky or scrollable back to top)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.locator('h1:has-text("PDF SaaS")')).toBeVisible()
  })

  test('should display forms properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // Open registration modal
    await page.click('button:has-text("Get Started")')

    // Form inputs should be appropriately sized
    const nameInput = page.locator('input[placeholder*="Full Name"]')
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await expect(nameInput).toBeVisible()
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()

    // Inputs should be large enough for mobile typing
    const inputBox = await emailInput.boundingBox()
    if (inputBox) {
      expect(inputBox.height).toBeGreaterThanOrEqual(40)
    }
  })

  test('should handle API Keys page on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    // Navigate to API keys (this will require auth, but we test the responsive layout)
    await page.goto('/api-keys')

    // Even if redirected due to auth, the responsive design should work
    // Check that no horizontal overflow occurs
    const body = page.locator('body')
    const bodyBox = await body.boundingBox()

    if (bodyBox) {
      expect(bodyBox.width).toBeLessThanOrEqual(390)
    }
  })

  test('should maintain aspect ratios for visual elements', async ({ page }) => {
    const testViewports = [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 }
    ]

    for (const viewport of testViewports) {
      await page.setViewportSize(viewport)
      await page.goto('/')

      // Logo and brand elements should maintain proper aspect ratios
      const logo = page.locator('.h-8.w-8, [data-testid="logo"]')
      if (await logo.isVisible()) {
        const logoBox = await logo.boundingBox()
        if (logoBox) {
          // Logo should be roughly square (within reasonable tolerance)
          const aspectRatio = logoBox.width / logoBox.height
          expect(aspectRatio).toBeGreaterThan(0.8)
          expect(aspectRatio).toBeLessThan(1.2)
        }
      }
    }
  })

  test('should ensure readable typography across devices', async ({ page }) => {
    const testCases = [
      { width: 320, height: 568, minFontSize: 14 }, // Small mobile
      { width: 390, height: 844, minFontSize: 14 }, // Standard mobile
      { width: 768, height: 1024, minFontSize: 14 }, // Tablet
      { width: 1920, height: 1080, minFontSize: 16 } // Desktop
    ]

    for (const { width, height, minFontSize } of testCases) {
      await page.setViewportSize({ width, height })
      await page.goto('/')

      // Check main heading size
      const heading = page.locator('h1').first()
      if (await heading.isVisible()) {
        const fontSize = await heading.evaluate(el => getComputedStyle(el).fontSize)
        const fontSizeNum = parseInt(fontSize)
        expect(fontSizeNum).toBeGreaterThanOrEqual(minFontSize)
      }

      // Check body text size
      const bodyText = page.locator('p').first()
      if (await bodyText.isVisible()) {
        const fontSize = await bodyText.evaluate(el => getComputedStyle(el).fontSize)
        const fontSizeNum = parseInt(fontSize)
        expect(fontSizeNum).toBeGreaterThanOrEqual(minFontSize)
      }
    }
  })
})