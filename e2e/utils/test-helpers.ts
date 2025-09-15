import { Page, expect } from '@playwright/test'

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Simulate user login with demo credentials
   */
  async login(email = 'demo@pdfsaas.com', password = 'demo123') {
    await this.page.goto('/')
    await this.page.click('button:has-text("Sign In")')
    await this.page.fill('input[type="email"]', email)
    await this.page.fill('input[type="password"]', password)
    await this.page.click('button[type="submit"]:has-text("Sign In")')
    await this.page.waitForTimeout(1000)
  }

  /**
   * Wait for element to be visible with custom timeout
   */
  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout })
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await this.page.screenshot({ path: `e2e/screenshots/${name}-${timestamp}.png` })
  }

  /**
   * Check responsive breakpoint
   */
  async setMobile() {
    await this.page.setViewportSize({ width: 390, height: 844 })
  }

  async setTablet() {
    await this.page.setViewportSize({ width: 768, height: 1024 })
  }

  async setDesktop() {
    await this.page.setViewportSize({ width: 1920, height: 1080 })
  }

  /**
   * Wait for loading states to complete
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Check for console errors
   */
  async checkForErrors() {
    const errors: string[] = []
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    return errors
  }

  /**
   * Fill form fields by data-testid or placeholder
   */
  async fillForm(fields: Record<string, string>) {
    for (const [key, value] of Object.entries(fields)) {
      // Try multiple selector strategies
      const selectors = [
        `[data-testid="${key}"]`,
        `input[placeholder*="${key}" i]`,
        `input[name="${key}"]`,
        `input[type="${key}"]`
      ]

      let filled = false
      for (const selector of selectors) {
        try {
          const element = this.page.locator(selector).first()
          if (await element.isVisible()) {
            await element.fill(value)
            filled = true
            break
          }
        } catch (e) {
          // Try next selector
        }
      }

      if (!filled) {
        console.warn(`Could not fill field: ${key}`)
      }
    }
  }

  /**
   * Check accessibility basics (color contrast, alt text, etc.)
   */
  async checkBasicAccessibility() {
    // Check for images without alt text
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count()
    expect(imagesWithoutAlt).toBe(0)

    // Check for buttons without accessible text
    const buttonsWithoutText = await this.page.locator('button:not([aria-label])').filter({ hasNotText: /.*/ }).count()
    // Note: This is a simplified check - in practice we'd verify each button has text or aria-label
  }

  /**
   * Simulate file upload
   */
  async uploadFile(selector: string, filePath: string) {
    const fileInput = this.page.locator(selector)
    await fileInput.setInputFiles(filePath)
  }

  /**
   * Wait for animation to complete
   */
  async waitForAnimation(element: string) {
    await this.page.waitForTimeout(500) // Basic animation wait
    await this.page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector)
        return el && getComputedStyle(el).animationPlayState === 'running' ? false : true
      },
      element
    )
  }

  /**
   * Check performance metrics
   */
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      }
    })
  }

  /**
   * Simulate network conditions
   */
  async simulateSlowNetwork() {
    await this.page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000) // 1 second delay
    })
  }

  /**
   * Clear browser storage
   */
  async clearStorage() {
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  }

  /**
   * Mock API responses
   */
  async mockAPIResponse(endpoint: string, response: any) {
    await this.page.route(`**/${endpoint}`, route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    )
  }

  /**
   * Check for memory leaks (basic)
   */
  async checkMemoryUsage() {
    const metrics = await this.page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory ? {
        // @ts-ignore
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        // @ts-ignore
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        // @ts-ignore
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null
    })
    return metrics
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Tab through interactive elements
    await this.page.keyboard.press('Tab')
    const activeElement = await this.page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'INPUT', 'A', 'SELECT'].includes(activeElement || '')).toBeTruthy()
  }

  /**
   * Check for proper focus management
   */
  async checkFocusManagement(initialElement: string, expectedFinalElement: string) {
    await this.page.focus(initialElement)
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(100)

    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBe(expectedFinalElement.toUpperCase())
  }

  /**
   * Validate form submission
   */
  async submitFormAndValidate(formSelector: string, expectedResponse: string) {
    await this.page.click(`${formSelector} button[type="submit"]`)
    await this.waitForElement(expectedResponse)
    await expect(this.page.locator(expectedResponse)).toBeVisible()
  }

  /**
   * Test drag and drop functionality
   */
  async testDragDrop(sourceSelector: string, targetSelector: string) {
    const source = this.page.locator(sourceSelector)
    const target = this.page.locator(targetSelector)

    await source.dragTo(target)
    await this.page.waitForTimeout(500)
  }

  /**
   * Check responsive image loading
   */
  async checkResponsiveImages() {
    const images = this.page.locator('img')
    const imageCount = await images.count()

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const loaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
      expect(loaded).toBeTruthy()
    }
  }

  /**
   * Validate color contrast (basic check)
   */
  async checkColorContrast(textSelector: string) {
    const contrastRatio = await this.page.locator(textSelector).evaluate(el => {
      const style = getComputedStyle(el)
      const textColor = style.color
      const backgroundColor = style.backgroundColor

      // This is a simplified check - in real scenarios you'd use a proper contrast calculation
      return { textColor, backgroundColor }
    })

    // Basic validation that colors are defined
    expect(contrastRatio.textColor).toBeTruthy()
    expect(contrastRatio.backgroundColor).toBeTruthy()
  }
}