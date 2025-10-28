# data-testid Naming Conventions

## Overview

This document defines the standardized naming conventions for `data-testid` attributes across the PDFCraft.Pro application. These conventions ensure stable, predictable E2E test selectors using Playwright.

## Purpose

- **Test Stability**: Prevent test failures due to UI changes (text, classes, styling)
- **Maintainability**: Clear, consistent naming makes tests easier to read and maintain
- **Discoverability**: Developers can easily find test identifiers
- **Refactoring Safety**: UI refactors won't break tests as long as data-testid remains unchanged

## General Naming Rules

### Format
```
data-testid="[component]-[element-type]-[action/purpose]"
```

### Guidelines

1. **Use kebab-case**: All lowercase with hyphens
2. **Be descriptive**: Name should clearly indicate what element does
3. **Be specific**: Avoid generic names like "button" or "input"
4. **Keep consistent**: Use same patterns across similar components
5. **Include context**: Prefix with component/page name when needed

### Examples

✅ **Good**
```tsx
data-testid="signup-email-input"
data-testid="login-password-input"
data-testid="convert-mode-button"
data-testid="process-files-button"
```

❌ **Bad**
```tsx
data-testid="email"           // Too generic
data-testid="SignUpEmail"     // Wrong case
data-testid="btn1"            // Not descriptive
data-testid="the-email-input" // Unnecessary article
```

## Component-Specific Conventions

### Authentication Pages

#### Signup Page ([app/signup/page.tsx](app/signup/page.tsx))

**Form Inputs**
```tsx
data-testid="signup-first-name-input"
data-testid="signup-last-name-input"
data-testid="signup-email-input"
data-testid="signup-password-input"
data-testid="signup-confirm-password-input"
```

**Interactive Elements**
```tsx
data-testid="toggle-signup-password-visibility"       // Show/hide password
data-testid="toggle-confirm-password-visibility"      // Show/hide confirm password
data-testid="accept-terms-checkbox"                   // Terms acceptance checkbox
data-testid="create-account-button"                   // Main submit button
```

**Social Authentication**
```tsx
data-testid="social-signup-google"                    // Google OAuth button
data-testid="social-signup-github"                    // GitHub OAuth button
data-testid="social-signup-facebook"                  // Facebook OAuth button
```

**Error/Success Messages**
```tsx
data-testid="signup-error-message"                    // Error alert
data-testid="signup-success-message"                  // Success confirmation
```

#### Login Page ([app/login/page.tsx](app/login/page.tsx))

**Form Inputs**
```tsx
data-testid="login-email-input"
data-testid="login-password-input"
```

**Interactive Elements**
```tsx
data-testid="toggle-login-password-visibility"        // Show/hide password
data-testid="sign-in-button"                          // Main submit button
```

**Social Authentication**
```tsx
data-testid="social-login-google"
data-testid="social-login-github"
data-testid="social-login-facebook"
```

**Error Messages**
```tsx
data-testid="login-error-message"
```

### Conversion Interface

#### Unified Conversion Interface ([components/UnifiedConversionInterface.tsx](components/UnifiedConversionInterface.tsx))

**Mode Selection**
```tsx
data-testid="convert-mode-button"                     // Switch to convert mode
data-testid="merge-mode-button"                       // Switch to merge mode
```

**File Upload**
```tsx
data-testid="file-upload-dropzone"                    // Drag & drop area
data-testid="uploaded-file-item"                      // Individual file in list
data-testid="remove-file-button"                      // Remove file from list
```

**Output Format Selection**
```tsx
data-testid="output-format-dropdown"                  // Format selector dropdown
data-testid="output-format-option-image"              // Image format option
data-testid="output-format-option-powerpoint"         // PowerPoint format option
data-testid="output-format-option-word"               // Word format option
data-testid="output-format-option-excel"              // Excel format option
```

**Processing**
```tsx
data-testid="process-files-button"                    // Start conversion/merge
data-testid="conversion-progress-bar"                 // Progress indicator (if needed)
```

**Download & Reset**
```tsx
data-testid="download-button"                         // Download processed file
data-testid="reset-button"                            // Reset to start over
```

**Error Messages**
```tsx
data-testid="conversion-error-message"                // Conversion error alert
```

## Pattern Categories

### 1. Form Inputs
**Pattern**: `[page]-[field-name]-input`

Examples:
- `signup-email-input`
- `login-password-input`
- `profile-phone-input`

### 2. Buttons
**Pattern**: `[action]-[context]-button` or `[context]-button`

Examples:
- `create-account-button`
- `sign-in-button`
- `process-files-button`
- `download-button`
- `reset-button`

### 3. Toggle Buttons
**Pattern**: `toggle-[what]-[action]`

Examples:
- `toggle-signup-password-visibility`
- `toggle-login-password-visibility`
- `toggle-dark-mode`

### 4. Mode/Tab Buttons
**Pattern**: `[mode-name]-mode-button` or `[tab-name]-tab`

Examples:
- `convert-mode-button`
- `merge-mode-button`
- `settings-tab`

### 5. Dropdowns & Options
**Pattern**: `[purpose]-dropdown` for trigger, `[purpose]-option-[value]` for options

Examples:
- `output-format-dropdown`
- `output-format-option-powerpoint`
- `language-dropdown`
- `language-option-en`

### 6. Lists & List Items
**Pattern**: `[list-name]-list` for container, `[item-name]-item` for items

Examples:
- `uploaded-file-item`
- `conversion-history-item`
- `user-list-item`

### 7. Social Authentication
**Pattern**: `social-[action]-[provider]`

Examples:
- `social-login-google`
- `social-signup-github`
- `social-connect-facebook`

### 8. Error/Success Messages
**Pattern**: `[page/component]-[type]-message`

Examples:
- `signup-error-message`
- `login-error-message`
- `conversion-error-message`
- `payment-success-message`

### 9. Checkboxes & Radio Buttons
**Pattern**: `[purpose]-checkbox` or `[purpose]-radio`

Examples:
- `accept-terms-checkbox`
- `remember-me-checkbox`
- `plan-starter-radio`

## Special Cases

### Dynamic IDs with Variables
When elements are generated dynamically (e.g., in loops), include the variable in the testid:

```tsx
// Social auth buttons (provider changes)
data-testid={`social-signup-${provider.id}`}

// File format options (format changes)
data-testid={`output-format-option-${format}`}

// List items with IDs
data-testid={`file-item-${file.id}`}
```

### Conditional Elements
For elements that appear conditionally, use clear naming:

```tsx
// Success state
data-testid="signup-success-message"

// Error state
data-testid="signup-error-message"

// Loading state
data-testid="loading-spinner"
```

### Multi-Step Forms
Include step number or name:

```tsx
data-testid="checkout-step-1-next-button"
data-testid="checkout-step-2-payment-input"
data-testid="checkout-step-3-confirm-button"
```

## Testing Patterns

### Playwright Selector Examples

```typescript
// Wait for element
await page.waitForSelector('[data-testid="signup-email-input"]')

// Click button
await page.click('[data-testid="create-account-button"]')

// Fill input
await page.fill('[data-testid="login-email-input"]', 'user@example.com')

// Check visibility
await expect(page.locator('[data-testid="signup-error-message"]')).toBeVisible()

// Dynamic selector
const provider = 'google'
await page.click(`[data-testid="social-login-${provider}"]`)
```

### Best Practices for Tests

1. **Always use data-testid**: Never rely on classes, IDs, or text for E2E tests
2. **Wait for elements**: Use `waitForSelector` before interacting
3. **Use constants**: Define testids in constants file for reusability
4. **Avoid XPath**: Stick to data-testid selectors for simplicity
5. **Test error states**: Ensure error message testids are working

## Migration Guide

### Converting Existing Tests

**Before (Brittle)**
```typescript
await page.click('button:has-text("Create account")')
await page.fill('input[type="email"]', 'test@example.com')
await page.locator('.error-message').textContent()
```

**After (Stable)**
```typescript
await page.click('[data-testid="create-account-button"]')
await page.fill('[data-testid="signup-email-input"]', 'test@example.com')
await page.locator('[data-testid="signup-error-message"]').textContent()
```

## Maintenance

### Adding New data-testid Attributes

1. **Follow naming conventions**: Use patterns from this document
2. **Update this document**: Add new patterns if creating new categories
3. **Update tests**: Ensure corresponding tests use the new testid
4. **Document in PR**: Note which testids were added in pull request

### Deprecating data-testid Attributes

1. **Don't remove immediately**: Mark as deprecated in code comment
2. **Update tests first**: Migrate all tests to new testid
3. **Remove old testid**: After migration is complete

```tsx
// @deprecated Use "process-files-button" instead
data-testid="convert-button"  // Remove after migration
data-testid="process-files-button"
```

## Quick Reference

### Most Common Patterns

| Element Type | Pattern | Example |
|-------------|---------|---------|
| Text Input | `[page]-[field]-input` | `signup-email-input` |
| Button | `[action]-button` | `create-account-button` |
| Toggle | `toggle-[what]-[action]` | `toggle-password-visibility` |
| Dropdown | `[purpose]-dropdown` | `output-format-dropdown` |
| Dropdown Option | `[purpose]-option-[value]` | `output-format-option-powerpoint` |
| List Item | `[item-name]-item` | `uploaded-file-item` |
| Error Message | `[page]-error-message` | `signup-error-message` |
| Checkbox | `[purpose]-checkbox` | `accept-terms-checkbox` |
| Social Auth | `social-[action]-[provider]` | `social-login-google` |

## Complete Attribute List

### Authentication
- `signup-first-name-input`
- `signup-last-name-input`
- `signup-email-input`
- `signup-password-input`
- `signup-confirm-password-input`
- `toggle-signup-password-visibility`
- `toggle-confirm-password-visibility`
- `accept-terms-checkbox`
- `create-account-button`
- `signup-error-message`
- `social-signup-google`
- `social-signup-github`
- `login-email-input`
- `login-password-input`
- `toggle-login-password-visibility`
- `sign-in-button`
- `login-error-message`
- `social-login-google`
- `social-login-github`

### Conversion Interface
- `convert-mode-button`
- `merge-mode-button`
- `file-upload-dropzone`
- `uploaded-file-item`
- `remove-file-button`
- `output-format-dropdown`
- `output-format-option-image`
- `output-format-option-powerpoint`
- `output-format-option-word`
- `output-format-option-excel`
- `process-files-button`
- `download-button`
- `reset-button`
- `conversion-error-message`

---

**Last Updated**: January 2025
**Maintained By**: PDFCraft.Pro Development Team
**Related Docs**: E2E Testing Guide, Component Development Standards
