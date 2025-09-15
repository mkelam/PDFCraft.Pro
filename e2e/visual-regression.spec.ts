import { test, expect } from '@playwright/test'
import { TestHelpers } from './utils/test-helpers'

test.describe('Visual Regression Testing', () => {
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
    await page.goto('/')
  })

  test('should match dashboard homepage screenshot', async ({ page }) => {
    // Wait for page to fully load
    await helpers.waitForPageLoad()
    await page.waitForTimeout(1000)

    // Take full page screenshot
    await expect(page).toHaveScreenshot('dashboard-homepage.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000
    })
  })

  test('should match mobile dashboard layout', async ({ page }) => {
    await helpers.setMobile()
    await helpers.waitForPageLoad()
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      threshold: 0.2
    })
  })

  test('should match tablet dashboard layout', async ({ page }) => {
    await helpers.setTablet()
    await helpers.waitForPageLoad()
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      threshold: 0.2
    })
  })

  test('should match login modal appearance', async ({ page }) => {
    await page.click('button:has-text("Sign In")')
    await page.waitForSelector('[role="dialog"]')

    // Screenshot just the modal
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toHaveScreenshot('login-modal.png', {
      threshold: 0.1
    })
  })

  test('should match registration modal appearance', async ({ page }) => {
    await page.click('button:has-text("Get Started")')
    await page.waitForSelector('[role="dialog"]')

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toHaveScreenshot('registration-modal.png', {
      threshold: 0.1
    })
  })

  test('should match performance page layout', async ({ page }) => {
    await page.goto('/performance')
    await helpers.waitForPageLoad()
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('performance-page.png', {
      fullPage: true,
      threshold: 0.2
    })
  })

  test('should match speed visualization component', async ({ page }) => {
    // Focus on the speed comparison section
    const speedSection = page.locator('text=6s').locator('..')
    if (await speedSection.isVisible()) {
      await expect(speedSection).toHaveScreenshot('speed-visualization.png', {
        threshold: 0.1
      })
    }
  })

  test('should match PDF upload area states', async ({ page }) => {
    // Default state
    const uploadArea = page.locator('text=Drop your PDF here').locator('..')
    await expect(uploadArea).toHaveScreenshot('upload-area-default.png')

    // Hover state
    await uploadArea.hover()
    await page.waitForTimeout(300)
    await expect(uploadArea).toHaveScreenshot('upload-area-hover.png')
  })

  test('should match processing options layout', async ({ page }) => {
    const optionsSection = page.locator('text=Compress').locator('..').locator('..')
    await expect(optionsSection).toHaveScreenshot('processing-options.png')

    // Test different option selected
    await page.click('input[value="convert"]')
    await page.waitForTimeout(300)
    await expect(optionsSection).toHaveScreenshot('processing-options-convert.png')
  })

  test('should match header component across states', async ({ page }) => {
    const header = page.locator('header, .header, nav').first()

    // Default state
    await expect(header).toHaveScreenshot('header-default.png')

    // Mobile state
    await helpers.setMobile()
    await expect(header).toHaveScreenshot('header-mobile.png')

    // After potential auth (if implemented)
    await helpers.setDesktop()
    await helpers.login().catch(() => {}) // Ignore if login fails
    await expect(header).toHaveScreenshot('header-authenticated.png')
  })

  test('should match error states', async ({ page }) => {
    // Test form validation error
    await page.click('button:has-text("Sign In")')
    await page.click('button[type="submit"]:has-text("Sign In")')

    // Look for error styling
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveScreenshot('form-validation-error.png')
  })

  test('should match success states', async ({ page }) => {
    // This would test success notifications, completed uploads, etc.
    // For now, we'll test the static success styling if available

    await page.click('button:has-text("Get Started")')
    await helpers.fillForm({
      'Full Name': 'Test User',
      'email': 'test@example.com',
      'password': 'testpassword123'
    })

    // Submit might show success state
    await page.click('button[type="submit"]:has-text("Create Account")')
    await page.waitForTimeout(1000)

    // Capture any success state that appears
    const successElement = page.locator('text=Success, text=Created, text=Welcome').first()
    if (await successElement.isVisible()) {
      await expect(successElement.locator('..')).toHaveScreenshot('success-state.png')
    }
  })

  test('should match loading states', async ({ page }) => {
    // Test loading spinners, progress bars, etc.
    await page.click('button:has-text("Process PDF")')

    // Look for loading indicators
    const loadingElements = page.locator('.animate-spin, .loading, [data-loading="true"]')
    const loadingCount = await loadingElements.count()

    if (loadingCount > 0) {
      await expect(loadingElements.first()).toHaveScreenshot('loading-state.png')
    }
  })

  test('should match focus states for accessibility', async ({ page }) => {
    // Test focus rings on key interactive elements
    const mainButton = page.locator('button:has-text("Get Started")')

    await mainButton.focus()
    await page.waitForTimeout(100)
    await expect(mainButton).toHaveScreenshot('button-focus-state.png')

    // Test input focus
    await page.click('button:has-text("Sign In")')
    const emailInput = page.locator('input[type="email"]')
    await emailInput.focus()
    await expect(emailInput).toHaveScreenshot('input-focus-state.png')
  })

  test('should match dark mode if available', async ({ page }) => {
    // Check if dark mode toggle exists
    const darkModeToggle = page.locator('[aria-label*="dark"], [data-theme="dark"], .dark-mode-toggle')

    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click()
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
        fullPage: true,
        threshold: 0.3
      })
    }
  })

  test('should match component states with animations disabled', async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `
    })

    await page.reload()
    await helpers.waitForPageLoad()

    await expect(page).toHaveScreenshot('dashboard-no-animations.png', {
      fullPage: true,
      threshold: 0.1
    })
  })

  test('should match high contrast mode if supported', async ({ page }) => {
    // Test with forced high contrast
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.reload()

    await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
      fullPage: true,
      threshold: 0.3
    })
  })

  test('should capture cross-browser consistency', async ({ page, browserName }) => {
    await helpers.waitForPageLoad()

    // Take browser-specific screenshots
    await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 2000
    })
  })
})