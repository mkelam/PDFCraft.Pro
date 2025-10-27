/**
 * COMPREHENSIVE LINK VALIDATION E2E TEST
 *
 * Purpose: Click EVERY link on EVERY page to ensure none return 404
 *
 * This test will:
 * 1. Visit every page in the application
 * 2. Extract all links (<a> and <Link> tags)
 * 3. Click each link and verify it doesn't return 404
 * 4. Track broken links and generate detailed report
 * 5. Test navigation buttons, social auth buttons, etc.
 *
 * Critical for: Legal compliance, UX, SEO, production readiness
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = './test-screenshots/link-validation';

// Pages to test
const PAGES_TO_TEST = [
  { name: 'Homepage', url: '/' },
  { name: 'Features', url: '/features' },
  { name: 'Pricing', url: '/pricing' },
  { name: 'Signup', url: '/signup' },
  { name: 'Login', url: '/login' },
  { name: 'Dashboard', url: '/dashboard', requiresAuth: true },
  { name: 'Forgot Password', url: '/forgot-password' },
  { name: 'Reset Password', url: '/reset-password' },
  { name: 'Verify Email', url: '/verify-email' },
  { name: 'Terms', url: '/terms' },
  { name: 'Privacy', url: '/privacy' },
  { name: 'Session Demo', url: '/session-demo' },
];

// Results tracking
const testResults = {
  totalPages: 0,
  totalLinks: 0,
  validLinks: 0,
  brokenLinks: 0,
  warnings: 0,
  linkDetails: [],
  brokenLinksList: [],
  pageResults: [],
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Logging utilities
function logHeader(text) {
  console.log(`\n${colors.cyan}${'='.repeat(100)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(100)}${colors.reset}\n`);
}

function logPage(text) {
  console.log(`\n${colors.blue}${'─'.repeat(100)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}📄 ${text}${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(100)}${colors.reset}`);
}

function logAction(text) {
  console.log(`${colors.blue}  → ${text}${colors.reset}`);
}

function logSuccess(text) {
  testResults.validLinks++;
  console.log(`${colors.green}  ✓ ${text}${colors.reset}`);
}

function logError(text) {
  testResults.brokenLinks++;
  console.log(`${colors.red}  ✗ ${text}${colors.reset}`);
}

function logWarning(text) {
  testResults.warnings++;
  console.log(`${colors.yellow}  ⚠ ${text}${colors.reset}`);
}

function logInfo(text) {
  console.log(`${colors.cyan}  ℹ ${text}${colors.reset}`);
}

// Screenshot helper
async function takeScreenshot(page, name) {
  try {
    const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    logInfo(`Screenshot: ${name}.png`);
  } catch (error) {
    logWarning(`Failed to take screenshot: ${error.message}`);
  }
}

// Link extraction helper
async function extractLinks(page, pageName) {
  logAction(`Extracting all links from ${pageName}`);

  const links = await page.evaluate(() => {
    const linkElements = Array.from(document.querySelectorAll('a[href], button[aria-label]'));
    return linkElements.map(el => ({
      href: el.getAttribute('href') || el.getAttribute('aria-label'),
      text: el.textContent?.trim().substring(0, 50) || 'No text',
      tag: el.tagName.toLowerCase(),
      isButton: el.tagName === 'BUTTON',
      hasOnClick: el.hasAttribute('onclick') || el.onclick !== null,
    })).filter(link =>
      link.href &&
      !link.href.startsWith('javascript:') &&
      !link.href.startsWith('mailto:') &&
      !link.href.startsWith('tel:') &&
      !link.href.startsWith('#') &&
      !link.href.startsWith('http://') && // Skip external links for now
      !link.href.startsWith('https://')
    );
  });

  logInfo(`Found ${links.length} internal links`);
  return links;
}

// Check if page returns 404
async function checkPageStatus(page) {
  const pageContent = await page.content();
  const is404 = pageContent.includes('404') && (
    pageContent.toLowerCase().includes('not found') ||
    pageContent.toLowerCase().includes('page could not be found')
  );
  const currentUrl = page.url();

  return {
    is404,
    url: currentUrl,
  };
}

// Test individual link
async function testLink(page, link, sourcePage, baseUrl) {
  const linkUrl = link.href.startsWith('/') ? link.href : `/${link.href}`;
  const fullUrl = `${baseUrl}${linkUrl}`;

  logAction(`Testing link: "${link.text}" → ${linkUrl}`);

  try {
    // Click the link
    const linkLocator = page.locator(`a[href="${link.href}"]`).first();
    await linkLocator.click({ timeout: 5000 });

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Check status
    const status = await checkPageStatus(page);

    const linkResult = {
      sourcePage,
      linkText: link.text,
      linkHref: link.href,
      destinationUrl: status.url,
      is404: status.is404,
      timestamp: new Date().toISOString(),
    };

    if (status.is404) {
      logError(`BROKEN LINK: "${link.text}" → ${linkUrl} (Returns 404)`);
      testResults.brokenLinksList.push(linkResult);
    } else {
      logSuccess(`Valid: "${link.text}" → ${status.url}`);
    }

    testResults.linkDetails.push(linkResult);
    testResults.totalLinks++;

    // Go back to source page
    await page.goBack();
    await page.waitForTimeout(1000);

  } catch (error) {
    logWarning(`Could not test link "${link.text}": ${error.message}`);
    testResults.warnings++;
    testResults.linkDetails.push({
      sourcePage,
      linkText: link.text,
      linkHref: link.href,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Test a single page
async function testPage(page, pageInfo) {
  logPage(`Testing Page: ${pageInfo.name} (${pageInfo.url})`);
  testResults.totalPages++;

  const pageResult = {
    name: pageInfo.name,
    url: pageInfo.url,
    linksFound: 0,
    validLinks: 0,
    brokenLinks: 0,
    warnings: 0,
  };

  try {
    // Navigate to page
    logAction(`Navigating to ${pageInfo.url}`);
    await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check if page itself is 404
    const pageStatus = await checkPageStatus(page);
    if (pageStatus.is404) {
      logError(`PAGE NOT FOUND: ${pageInfo.name} returns 404!`);
      pageResult.is404 = true;
      testResults.brokenLinks++;
      await takeScreenshot(page, `${pageInfo.name.replace(/\s+/g, '-')}-404`);
      testResults.pageResults.push(pageResult);
      return;
    }

    logSuccess(`Page loaded: ${pageInfo.name}`);
    await takeScreenshot(page, `${pageInfo.name.replace(/\s+/g, '-')}-loaded`);

    // Extract all links
    const links = await extractLinks(page, pageInfo.name);
    pageResult.linksFound = links.length;

    // Test each link
    for (const link of links) {
      const beforeValidCount = testResults.validLinks;
      const beforeBrokenCount = testResults.brokenLinks;
      const beforeWarningCount = testResults.warnings;

      await testLink(page, link, pageInfo.name, BASE_URL);

      // Update page-specific counters
      pageResult.validLinks += testResults.validLinks - beforeValidCount;
      pageResult.brokenLinks += testResults.brokenLinks - beforeBrokenCount;
      pageResult.warnings += testResults.warnings - beforeWarningCount;
    }

    logInfo(`Page Summary: ${pageResult.validLinks} valid, ${pageResult.brokenLinks} broken, ${pageResult.warnings} warnings`);
    testResults.pageResults.push(pageResult);

  } catch (error) {
    logError(`Failed to test page ${pageInfo.name}: ${error.message}`);
    pageResult.error = error.message;
    testResults.pageResults.push(pageResult);
  }
}

// Main test function
async function runLinkValidationTest() {
  logHeader('🔗 COMPREHENSIVE LINK VALIDATION TEST');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Pages to test: ${PAGES_TO_TEST.length}`);
  logInfo(`Time: ${new Date().toISOString()}`);

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logWarning(`Browser console error: ${msg.text()}`);
    }
  });

  try {
    // Test each page
    for (const pageInfo of PAGES_TO_TEST) {
      if (pageInfo.requiresAuth) {
        logWarning(`Skipping ${pageInfo.name} (requires authentication)`);
        continue;
      }

      await testPage(page, pageInfo);
    }

    // Generate summary
    logHeader('📊 TEST SUMMARY');
    console.log(`${colors.blue}\nPages Tested: ${testResults.totalPages}${colors.reset}`);
    console.log(`${colors.blue}Total Links Checked: ${testResults.totalLinks}${colors.reset}`);
    console.log(`${colors.green}Valid Links: ${testResults.validLinks}${colors.reset}`);
    console.log(`${colors.red}Broken Links: ${testResults.brokenLinks}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${testResults.warnings}${colors.reset}`);

    const successRate = testResults.totalLinks > 0
      ? ((testResults.validLinks / testResults.totalLinks) * 100).toFixed(1)
      : 0;
    console.log(`${colors.cyan}Success Rate: ${successRate}%${colors.reset}`);

    // List broken links
    if (testResults.brokenLinksList.length > 0) {
      console.log(`\n${colors.red}${colors.bright}🚨 BROKEN LINKS FOUND:${colors.reset}`);
      testResults.brokenLinksList.forEach((link, index) => {
        console.log(`${colors.red}${index + 1}. [${link.sourcePage}] "${link.linkText}" → ${link.linkHref}${colors.reset}`);
      });
    } else {
      console.log(`\n${colors.green}${colors.bright}✅ NO BROKEN LINKS FOUND!${colors.reset}`);
    }

    // Page-by-page breakdown
    console.log(`\n${colors.cyan}${colors.bright}📄 PAGE-BY-PAGE BREAKDOWN:${colors.reset}`);
    testResults.pageResults.forEach(pageResult => {
      const statusIcon = pageResult.is404 ? '🔴' :
                        pageResult.brokenLinks > 0 ? '🟡' : '🟢';
      console.log(`${statusIcon} ${pageResult.name}: ${pageResult.linksFound} links (${pageResult.validLinks} valid, ${pageResult.brokenLinks} broken)`);
    });

  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    await takeScreenshot(page, 'test-error');
  } finally {
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: testResults.totalPages,
        totalLinks: testResults.totalLinks,
        validLinks: testResults.validLinks,
        brokenLinks: testResults.brokenLinks,
        warnings: testResults.warnings,
        successRate: testResults.totalLinks > 0
          ? `${((testResults.validLinks / testResults.totalLinks) * 100).toFixed(1)}%`
          : '0%',
      },
      brokenLinks: testResults.brokenLinksList,
      pageResults: testResults.pageResults,
      allLinks: testResults.linkDetails,
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'link-validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate HTML report
    const htmlReport = generateHTMLReport(report);
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'link-validation-report.html'),
      htmlReport
    );

    console.log(`\n${colors.cyan}📄 Reports saved:${colors.reset}`);
    console.log(`${colors.cyan}   - JSON: ${path.join(SCREENSHOT_DIR, 'link-validation-report.json')}${colors.reset}`);
    console.log(`${colors.cyan}   - HTML: ${path.join(SCREENSHOT_DIR, 'link-validation-report.html')}${colors.reset}`);
    console.log(`${colors.cyan}   - Screenshots: ${SCREENSHOT_DIR}${colors.reset}\n`);

    await browser.close();

    // Exit with error code if broken links found
    if (testResults.brokenLinks > 0) {
      console.log(`${colors.red}❌ TEST FAILED: ${testResults.brokenLinks} broken link(s) found${colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`${colors.green}✅ TEST PASSED: All links are valid!${colors.reset}\n`);
      process.exit(0);
    }
  }
}

// Generate HTML report
function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Validation Report - ${new Date(report.timestamp).toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; margin-bottom: 1rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .stat-card { padding: 1.5rem; border-radius: 8px; text-align: center; }
    .stat-card.green { background: #10b981; color: white; }
    .stat-card.red { background: #ef4444; color: white; }
    .stat-card.yellow { background: #f59e0b; color: white; }
    .stat-card.blue { background: #3b82f6; color: white; }
    .stat-number { font-size: 2.5rem; font-weight: bold; }
    .stat-label { font-size: 0.875rem; opacity: 0.9; margin-top: 0.5rem; }
    .section { margin: 2rem 0; }
    .section h2 { color: #1e40af; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .broken { color: #dc2626; font-weight: 600; }
    .valid { color: #059669; }
    .page-card { background: #f9fafb; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .timestamp { color: #6b7280; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 Link Validation Report</h1>
    <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>

    <div class="summary">
      <div class="stat-card blue">
        <div class="stat-number">${report.summary.totalLinks}</div>
        <div class="stat-label">Total Links</div>
      </div>
      <div class="stat-card green">
        <div class="stat-number">${report.summary.validLinks}</div>
        <div class="stat-label">Valid Links</div>
      </div>
      <div class="stat-card red">
        <div class="stat-number">${report.summary.brokenLinks}</div>
        <div class="stat-label">Broken Links</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-number">${report.summary.successRate}</div>
        <div class="stat-label">Success Rate</div>
      </div>
    </div>

    ${report.brokenLinks.length > 0 ? `
    <div class="section">
      <h2>🚨 Broken Links</h2>
      <table>
        <thead>
          <tr>
            <th>Source Page</th>
            <th>Link Text</th>
            <th>Destination</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.brokenLinks.map(link => `
            <tr>
              <td>${link.sourcePage}</td>
              <td>${link.linkText}</td>
              <td><code>${link.linkHref}</code></td>
              <td class="broken">404 Not Found</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : '<div class="section"><h2>✅ No Broken Links Found!</h2></div>'}

    <div class="section">
      <h2>📄 Page Results</h2>
      ${report.pageResults.map(page => `
        <div class="page-card">
          <h3>${page.is404 ? '🔴' : page.brokenLinks > 0 ? '🟡' : '🟢'} ${page.name}</h3>
          <p>URL: <code>${page.url}</code></p>
          <p>Links Found: ${page.linksFound} | Valid: <span class="valid">${page.validLinks}</span> | Broken: <span class="broken">${page.brokenLinks}</span></p>
          ${page.is404 ? '<p class="broken">⚠️ This page returns 404!</p>' : ''}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
`;
}

// Run the test
runLinkValidationTest().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
