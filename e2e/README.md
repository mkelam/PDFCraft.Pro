# End-to-End Testing Suite

## Overview

This comprehensive E2E testing suite uses Playwright to validate the entire PDF SaaS platform user experience, including UI/UX, performance, accessibility, and cross-browser compatibility.

## Test Structure

### Core Test Suites

1. **Dashboard Tests** (`dashboard.spec.ts`)
   - Homepage loading and navigation
   - Feature presentation and layout
   - PDF upload area functionality
   - Responsive behavior

2. **Authentication Tests** (`authentication.spec.ts`)
   - Login/registration modal interactions
   - Form validation and submission
   - Modal state management
   - Auth flow simulation

3. **PDF Processing Tests** (`pdf-processing.spec.ts`)
   - File upload workflow
   - Processing option selection
   - Quality settings and format conversion
   - Progress tracking and results

4. **API Key Management Tests** (`api-keys.spec.ts`)
   - Protected route access
   - API key creation workflow
   - Usage analytics display
   - Permission and rate limit configuration

5. **Performance Dashboard Tests** (`performance-dashboard.spec.ts`)
   - Benchmark result display
   - Speed comparison visualization
   - Real-time metrics updates
   - Performance chart interactions

6. **Responsive Design Tests** (`responsive-design.spec.ts`)
   - Multi-viewport testing (mobile, tablet, desktop)
   - Touch target accessibility
   - Layout reflow validation
   - Typography scaling

7. **Visual Regression Tests** (`visual-regression.spec.ts`)
   - Screenshot comparison testing
   - Component state variations
   - Cross-browser visual consistency
   - Animation and interaction states

## Test Utilities

### TestHelpers Class (`utils/test-helpers.ts`)

Comprehensive utility class providing:

- **Authentication**: `login()` - Simulate user authentication
- **Viewport Management**: `setMobile()`, `setTablet()`, `setDesktop()`
- **Performance Monitoring**: `getPerformanceMetrics()`, `checkMemoryUsage()`
- **Accessibility Checks**: `checkBasicAccessibility()`, `testKeyboardNavigation()`
- **Form Interactions**: `fillForm()`, `submitFormAndValidate()`
- **Network Simulation**: `simulateSlowNetwork()`, `mockAPIResponse()`
- **Visual Testing**: `takeScreenshot()`, `checkColorContrast()`

## Configuration

### Playwright Config (`playwright.config.ts`)

- **Multi-browser testing**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:5174`
- **Retry Logic**: 2 retries in CI, 0 locally
- **Reporting**: HTML reports with traces and screenshots
- **Performance**: Parallel execution with smart workers

### Viewport Testing

- **Mobile Portrait**: 390x844
- **Mobile Landscape**: 844x390
- **Tablet Portrait**: 768x1024
- **Tablet Landscape**: 1024x768
- **Desktop Small**: 1366x768
- **Desktop Large**: 1920x1080

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# View test reports
npm run test:e2e:report
```

### Specific Test Suites

```bash
# Run only dashboard tests
npx playwright test dashboard.spec.ts

# Run authentication tests in debug mode
npx playwright test authentication.spec.ts --debug

# Run responsive tests on specific browser
npx playwright test responsive-design.spec.ts --project="Mobile Chrome"

# Run with specific tag
npx playwright test --grep "@smoke"
```

## Test Categories

### Functional Testing
- User workflow validation
- Form submission and validation
- Navigation and routing
- Feature integration testing

### Performance Testing
- Page load times
- Animation smoothness
- Memory usage monitoring
- Network condition simulation

### Accessibility Testing
- Keyboard navigation
- Focus management
- Color contrast validation
- Screen reader compatibility

### Visual Testing
- Screenshot comparison
- Cross-browser consistency
- Responsive layout validation
- Component state variations

### Security Testing
- Input sanitization
- Authentication boundaries
- Protected route access
- API endpoint security

## Best Practices

### Test Organization
- One test file per major feature/page
- Descriptive test names with clear intent
- Grouped tests with `describe` blocks
- Shared setup in `beforeEach` hooks

### Selector Strategy
- Prefer data-testid attributes
- Use semantic selectors when possible
- Avoid brittle CSS selectors
- Leverage accessible role attributes

### Wait Strategies
- Use `waitForSelector` for dynamic content
- Leverage `waitForLoadState` for network completion
- Implement custom wait conditions
- Avoid arbitrary `setTimeout` calls

### Error Handling
- Comprehensive error screenshots
- Console error monitoring
- Network failure simulation
- Graceful degradation testing

## Continuous Integration

### CI Pipeline Integration
- Automated test runs on PR creation
- Cross-browser test matrix
- Performance regression detection
- Visual diff approval workflow

### Test Reports
- HTML reports with trace viewer
- Screenshot galleries for failures
- Performance metrics tracking
- Accessibility audit results

## Debugging

### Common Issues
- **Flaky Tests**: Add proper waits and stable selectors
- **Timeout Issues**: Increase timeout or improve wait conditions
- **Visual Regressions**: Review screenshot diffs and update baselines
- **Network Issues**: Mock external dependencies

### Debug Tools
- Playwright Inspector for step-by-step debugging
- Trace viewer for post-execution analysis
- Console logs and error monitoring
- Network request/response inspection

## Contributing

### Adding New Tests
1. Create test file in appropriate category
2. Follow naming convention: `feature-name.spec.ts`
3. Use TestHelpers for common operations
4. Add visual regression tests for UI changes
5. Update this README with new test descriptions

### Test Maintenance
- Regularly update selectors for UI changes
- Review and update visual baselines
- Monitor test execution times
- Remove or update obsolete tests

## Metrics and Reporting

### Key Metrics Tracked
- Test execution time
- Pass/fail rates by browser
- Performance benchmarks
- Accessibility compliance scores
- Visual regression detection rates

### Reports Generated
- HTML test reports with interactive traces
- Performance metrics dashboard
- Accessibility audit summaries
- Cross-browser compatibility matrix

This E2E testing suite ensures the PDF SaaS platform delivers a consistent, performant, and accessible user experience across all supported browsers and devices.