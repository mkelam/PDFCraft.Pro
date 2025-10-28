# ImageMagick Setup for pdflab.pro

## Overview

pdflab.pro uses ImageMagick for high-quality PDF page image extraction. While the system works without ImageMagick (using fallback services), installing it significantly improves conversion quality.

## Why ImageMagick?

- **High-Quality Image Extraction**: Converts PDF pages to high-resolution images (300+ DPI)
- **Visual Layout Preservation**: Maintains exact layout, fonts, and formatting
- **Better User Experience**: Output PPTX files include actual page images instead of text-only slides

## Installation Instructions

### Windows (Recommended for Development)

1. **Download ImageMagick**:
   - Visit: https://imagemagick.org/script/download.php#windows
   - Download the latest version (e.g., `ImageMagick-7.x.x-Q16-HDRI-x64-dll.exe`)

2. **Install with Correct Options**:
   ```
   ✅ Install development headers and libraries for C and C++
   ✅ Install ImageMagick for all users
   ✅ Add application directory to your system path
   ✅ Install FFmpeg
   ```

3. **Verify Installation**:
   ```cmd
   magick --version
   ```
   Should output ImageMagick version information.

4. **Test with pdflab.pro**:
   ```bash
   cd backend
   npm run dev
   # Upload a PDF and check logs for "ImageMagick available: true"
   ```

### Ubuntu/Debian (Production)

```bash
# Update package list
sudo apt update

# Install ImageMagick
sudo apt install imagemagick imagemagick-dev

# Configure for PDF processing
sudo sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

# Verify installation
magick --version
```

### CentOS/RHEL

```bash
# Install ImageMagick
sudo yum install ImageMagick ImageMagick-devel

# Or with dnf (newer versions)
sudo dnf install ImageMagick ImageMagick-devel

# Configure PDF policy
sudo sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml
```

### macOS

```bash
# Using Homebrew (recommended)
brew install imagemagick

# Using MacPorts
sudo port install ImageMagick

# Verify installation
magick --version
```

## Configuration

### PDF Policy Fix (Important!)

ImageMagick often has restrictive PDF policies by default. Update the policy file:

**Location**:
- Windows: `C:\Program Files\ImageMagick-7.x.x-Q16-HDRI\policy.xml`
- Linux: `/etc/ImageMagick-6/policy.xml` or `/etc/ImageMagick-7/policy.xml`
- macOS: `/usr/local/etc/ImageMagick-7/policy.xml`

**Change this line**:
```xml
<policy domain="coder" rights="none" pattern="PDF" />
```

**To this**:
```xml
<policy domain="coder" rights="read|write" pattern="PDF" />
```

### Environment Variables (Optional)

For custom installations, set environment variables:

```bash
# Windows (Command Prompt)
set IMAGEMAGICK_PATH="C:\path\to\magick.exe"

# Windows (PowerShell)
$env:IMAGEMAGICK_PATH="C:\path\to\magick.exe"

# Linux/macOS
export IMAGEMAGICK_PATH="/usr/local/bin/magick"
```

## Testing Installation

### Quick Test Script

Save as `test-imagemagick.js` in the backend directory:

```javascript
const { ImageMagickWrapper } = require('./dist/services/imagemagick-wrapper.service');

async function testImageMagick() {
  console.log('Testing ImageMagick installation...');

  const info = await ImageMagickWrapper.getInstallationInfo();
  console.log('Installation Info:', info);

  if (info.available) {
    console.log('✅ ImageMagick is properly installed!');
    console.log(`Version: ${info.version}`);
    console.log(`Path: ${info.path}`);
  } else {
    console.log('❌ ImageMagick not available');
    console.log(`Error: ${info.error}`);
  }
}

testImageMagick().catch(console.error);
```

Run with:
```bash
cd backend
npm run build
node test-imagemagick.js
```

## Troubleshooting

### Common Issues

1. **"magick: command not found"**
   - ImageMagick not in PATH
   - Restart terminal/command prompt after installation
   - On Windows, ensure "Add to system path" was checked during installation

2. **"not authorized" error**
   - PDF policy is too restrictive
   - Follow the PDF Policy Fix steps above

3. **"library not found" errors**
   - Missing dependencies
   - Install development packages (`imagemagick-dev`, etc.)

4. **Path issues on Windows**
   - Use quotes around paths with spaces
   - Check both `magick.exe` and `convert.exe` are available

### Debug Commands

```bash
# Check ImageMagick installation
magick --version

# Check PDF support
magick identify sample.pdf

# Test PDF to image conversion
magick sample.pdf[0] test-output.png

# Check policy configuration
magick -list policy
```

## Service Behavior

### With ImageMagick Available
- **Fixed Enhanced PDF Service**: Uses pdf2pic with ImageMagick backend
- **Working PDF Service**: Extracts high-quality page images
- **Enhanced PDF Quality Service**: Publication-grade 300-600 DPI output

### Without ImageMagick
- **Enhanced Fallback PDF Service**: Text-based conversion with intelligent structure detection
- **Mock PDF Service**: Basic text extraction and slide creation
- No visual layout preservation, but content is still preserved

## Performance Optimization

For production environments:

1. **Increase Memory Limits**:
   ```xml
   <!-- In policy.xml -->
   <policy domain="resource" name="memory" value="2GiB"/>
   <policy domain="resource" name="disk" value="8GiB"/>
   ```

2. **Optimize for Server Use**:
   ```bash
   # Disable GUI components (Linux)
   export MAGICK_HOME=/usr/local/ImageMagick
   export DISPLAY=""
   ```

3. **Monitor Resource Usage**:
   - ImageMagick can be memory-intensive for large PDFs
   - Consider implementing queue limits for concurrent conversions

## Support

If you encounter issues:

1. Check the backend logs for specific error messages
2. Verify ImageMagick installation with debug commands
3. Test with a simple PDF file first
4. Check system resources (memory, disk space)

The system is designed to gracefully degrade without ImageMagick, so basic functionality will always work even if installation fails.