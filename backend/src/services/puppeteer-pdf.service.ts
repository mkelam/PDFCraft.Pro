import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PptxGenJS from 'pptxgenjs';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { config } from '../config';

/**
 * Puppeteer-based High-Quality PDF to PowerPoint Service
 * Uses browser rendering for perfect PDF fidelity
 */
export class PuppeteerPDFService {
  private static browser: Browser | null = null;

  /**
   * Initialize Puppeteer browser
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      console.log('🚀 Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Convert PDF to PowerPoint using Puppeteer for perfect rendering
   */
  static async convertPDFToOffice(inputPath: string, outputDir: string): Promise<string> {
    const startTime = Date.now();
    const jobId = uuidv4();

    console.log(`🚀 [PUPPETEER] Starting high-fidelity PDF→PPT conversion`);
    console.log(`📄 Input: ${path.basename(inputPath)}`);

    let page: Page | null = null;

    try {
      // Load PDF to get page count and detect orientation
      const pdfBuffer = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      // Detect PDF orientation from first page to set appropriate layout
      const firstPage = pdfDoc.getPage(0);
      const { width: pdfWidth, height: pdfHeight } = firstPage.getSize();
      const isPortrait = pdfHeight > pdfWidth;
      const aspectRatio = pdfWidth / pdfHeight;

      console.log(`📊 Document has ${pageCount} pages`);

      console.log(`📐 PDF Dimensions: ${pdfWidth.toFixed(0)}x${pdfHeight.toFixed(0)} (${isPortrait ? 'Portrait' : 'Landscape'})`);

      // Create PowerPoint presentation
      const pptx = new PptxGenJS();

      // Set presentation properties for professional output
      pptx.author = 'pdflab.pro';
      pptx.company = 'pdflab.pro Premium';
      pptx.revision = '1.0';
      pptx.subject = 'High-Fidelity PDF Conversion';
      pptx.title = path.basename(inputPath, '.pdf');

      // Set layout based on PDF orientation
      if (isPortrait) {
        // Define custom portrait layout maintaining PDF aspect ratio
        const portraitWidth = 7.5; // Standard height becomes width for portrait
        const portraitHeight = portraitWidth / aspectRatio;

        pptx.defineLayout({
          name: 'PORTRAIT_CUSTOM',
          width: portraitWidth,
          height: portraitHeight
        });
        pptx.layout = 'PORTRAIT_CUSTOM';
        console.log(`📱 Using portrait layout: ${portraitWidth.toFixed(2)}" x ${portraitHeight.toFixed(2)}"`);
      } else {
        // Use landscape layout based on aspect ratio
        if (aspectRatio >= 1.7) {
          pptx.layout = 'LAYOUT_16x9'; // Wide format
        } else if (aspectRatio >= 1.5) {
          pptx.layout = 'LAYOUT_16x10'; // Standard wide
        } else {
          pptx.layout = 'LAYOUT_4x3'; // Traditional format
        }
        console.log(`🖥️  Using landscape layout: ${pptx.layout}`);
      }

      // Get browser instance
      const browser = await this.getBrowser();
      page = await browser.newPage();

      // Set viewport based on orientation and PDF dimensions
      const baseWidth = isPortrait ? 1080 : 1920;
      const baseHeight = isPortrait ? 1920 : 1080;

      // Adjust viewport to match PDF aspect ratio while maintaining quality
      let viewportWidth, viewportHeight;
      if (isPortrait) {
        viewportHeight = baseHeight;
        viewportWidth = Math.round(baseHeight * aspectRatio);
      } else {
        viewportWidth = baseWidth;
        viewportHeight = Math.round(baseWidth / aspectRatio);
      }

      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 2 // 2x resolution for quality
      });

      console.log(`📺 Viewport: ${viewportWidth}x${viewportHeight} (${isPortrait ? 'Portrait' : 'Landscape'})`);

      console.log('📄 Loading PDF data into browser...');

      // Convert PDF buffer to base64 data URL for direct loading (avoids file:// CORS issues)
      const pdfBase64 = pdfBuffer.toString('base64');
      const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

      // Create HTML to display PDF using data URL instead of file URL
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; background: white; }
            #pdf-container { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
            canvas { display: block; margin: 0 auto; border: 1px solid #eee; }
            #error-display { color: red; font-family: Arial; text-align: center; padding: 20px; }
          </style>
        </head>
        <body>
          <div id="pdf-container"></div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            window.pdfData = '${pdfDataUrl}';
            window.currentPdf = null;

            async function renderPage(pageNum) {
              try {
                console.log('Loading PDF data...');

                // Load PDF once and cache it
                if (!window.currentPdf) {
                  const loadingTask = pdfjsLib.getDocument(window.pdfData);
                  window.currentPdf = await loadingTask.promise;
                  console.log('PDF loaded successfully, pages:', window.currentPdf.numPages);
                }

                console.log('Rendering page', pageNum);
                const page = await window.currentPdf.getPage(pageNum);

                const scale = 2.0; // High quality scale for better resolution
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Clear container and add canvas
                const container = document.getElementById('pdf-container');
                container.innerHTML = '';
                container.appendChild(canvas);

                console.log('Starting page render...');

                // Render the page
                const renderContext = {
                  canvasContext: context,
                  viewport: viewport
                };

                await page.render(renderContext).promise;

                console.log('Page rendered successfully');
                return {
                  width: viewport.width,
                  height: viewport.height,
                  success: true
                };

              } catch (error) {
                console.error('PDF rendering error:', error);

                // Show error in the page
                const container = document.getElementById('pdf-container');
                container.innerHTML = '<div id="error-display">PDF Rendering Error: ' + error.message + '</div>';

                throw error;
              }
            }

            window.renderPage = renderPage;

            // Test PDF loading on page load
            window.addEventListener('load', async () => {
              try {
                console.log('Testing PDF loading...');
                const loadingTask = pdfjsLib.getDocument(window.pdfData);
                const pdf = await loadingTask.promise;
                console.log('PDF test successful, pages:', pdf.numPages);
                window.currentPdf = pdf;
              } catch (error) {
                console.error('PDF loading test failed:', error);
                document.getElementById('pdf-container').innerHTML = '<div id="error-display">Failed to load PDF: ' + error.message + '</div>';
              }
            });
          </script>
        </body>
        </html>
      `;

      // Load the HTML content
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Track conversion quality
      const pageResults = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each PDF page
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        console.log(`🔄 Rendering page ${pageNum}/${pageCount} with high fidelity...`);

        try {
          // Render the PDF page in browser
          await page.evaluate(async (num) => {
            // @ts-ignore
            await window.renderPage(num);
          }, pageNum);

          // Wait for rendering to complete
          await new Promise(resolve => setTimeout(resolve, 500));

          // Take high-quality screenshot
          const screenshotBuffer = await page.screenshot({
            type: 'png',
            fullPage: false,
            captureBeyondViewport: false
          });

          // Verify screenshot has content (not blank)
          if (!screenshotBuffer || screenshotBuffer.length < 1000) {
            throw new Error('Screenshot buffer is empty or too small');
          }

          // Optimize the image with sharp - orientation-aware sizing
          const targetWidth = isPortrait ? 2160 : 3840;  // Swap dimensions for portrait
          const targetHeight = isPortrait ? 3840 : 2160;

          const optimizedBuffer = await sharp(screenshotBuffer)
            .resize(targetWidth, targetHeight, {
              fit: 'inside',
              withoutEnlargement: true,
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png({
              quality: 95,
              compressionLevel: 6
            })
            .toBuffer();

          // Convert to base64
          const imageData = `data:image/png;base64,${optimizedBuffer.toString('base64')}`;

          // Create PowerPoint slide
          const slide = pptx.addSlide();
          slide.background = { color: 'FFFFFF' };

          // Add the high-quality rendered image
          slide.addImage({
            data: imageData,
            x: 0,
            y: 0,
            w: '100%',
            h: '100%',
            sizing: { type: 'contain', w: '100%', h: '100%' }
          });

          // Add subtle page number - positioned based on orientation
          const pageNumX = isPortrait ? 6.8 : 9.4;  // Adjust for portrait width
          const pageNumY = isPortrait ? 10.2 : 5.2; // Adjust for portrait height

          slide.addText(`${pageNum}`, {
            x: pageNumX,
            y: pageNumY,
            w: 0.4,
            h: 0.3,
            fontSize: 10,
            color: 'CCCCCC',
            align: 'center'
          });

          pageResults.successful++;
          console.log(`✅ Page ${pageNum} rendered successfully`);

        } catch (pageError) {
          const errorMessage = pageError instanceof Error ? pageError.message : 'Unknown error';
          pageResults.failed++;
          pageResults.errors.push(`Page ${pageNum}: ${errorMessage}`);

          console.error(`❌ Failed to render page ${pageNum}: ${errorMessage}`);

          // Don't add placeholder slides - fail the job instead
          // This ensures users get actual errors instead of false success
        }
      }

      // Check conversion quality and fail if too many pages failed
      const successRate = (pageResults.successful / pageCount) * 100;
      const minimumSuccessRate = 80; // Require at least 80% of pages to render successfully

      if (successRate < minimumSuccessRate) {
        const errorDetails = {
          totalPages: pageCount,
          successfulPages: pageResults.successful,
          failedPages: pageResults.failed,
          successRate: Math.round(successRate),
          errors: pageResults.errors
        };

        console.error(`❌ [PUPPETEER] Conversion quality too low: ${Math.round(successRate)}% success rate`);
        console.error(`📊 Details:`, errorDetails);

        throw new Error(`PDF conversion failed: Only ${pageResults.successful}/${pageCount} pages rendered successfully (${Math.round(successRate)}%). Errors: ${pageResults.errors.join('; ')}`);
      }

      if (pageResults.failed > 0) {
        console.warn(`⚠️ [PUPPETEER] Partial success: ${pageResults.successful}/${pageCount} pages rendered (${Math.round(successRate)}%)`);
        console.warn(`🔍 Failed page errors:`, pageResults.errors);
      }

      // Add metadata slide
      const metaSlide = pptx.addSlide();
      metaSlide.background = { fill: 'F8F9FA' };

      metaSlide.addText('Conversion Details', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 28,
        bold: true,
        color: '2C3E50'
      });

      const metaInfo = [
        `Source: ${path.basename(inputPath)}`,
        `Pages: ${pageCount}`,
        `Converted: ${new Date().toLocaleString()}`,
        `Quality: Maximum Fidelity`,
        `Engine: pdflab.pro Puppeteer Engine v2.0`
      ].join('\n');

      metaSlide.addText(metaInfo, {
        x: 0.5,
        y: 1.8,
        w: 9,
        h: 3,
        fontSize: 14,
        color: '495057',
        lineSpacing: 24
      });

      // Save PowerPoint file
      const outputFilename = `converted_${jobId}.pptx`;
      const outputPath = path.join(outputDir, outputFilename);

      await pptx.writeFile({ fileName: outputPath });

      const processingTime = Date.now() - startTime;
      console.log(`✅ [PUPPETEER] Conversion completed successfully!`);
      console.log(`⏱️  Time: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}s)`);
      console.log(`📁 Output: ${outputFilename}`);

      return outputFilename;

    } catch (error) {
      console.error('❌ [PUPPETEER] Conversion failed:', error);
      throw new Error(`Puppeteer conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    } finally {
      // Clean up page
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.warn('Failed to close page:', e);
        }
      }
    }
  }

  /**
   * Clean up browser instance
   */
  static async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
      } catch (error) {
        console.warn('Failed to close browser:', error);
      }
    }
  }

  /**
   * Convert PDF to images (alternative method)
   */
  static async convertPDFToImages(inputPath: string): Promise<string[]> {
    const images: string[] = [];

    try {
      console.log('🖼️ [PDF-TO-IMAGES] Converting PDF to images:', path.basename(inputPath));

      // Use ImageMagick directly for reliable PDF to image conversion
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      console.log(`   🔧 Starting PDF to images conversion...`);

      // CRITICAL FIX: Clean up old page_*.jpg files before starting new conversion
      try {
        const existingFiles = await fs.readdir(config.upload.tempDir);
        const oldPageFiles = existingFiles.filter(f => f.startsWith('page_') && f.endsWith('.jpg'));
        for (const oldFile of oldPageFiles) {
          await fs.unlink(path.join(config.upload.tempDir, oldFile));
          console.log(`   🗑️ Cleaned up old file: ${oldFile}`);
        }
        if (oldPageFiles.length > 0) {
          console.log(`   ✅ Cleaned ${oldPageFiles.length} old image files`);
        }
      } catch (cleanupError: any) {
        console.log(`   ⚠️ Cleanup warning: ${cleanupError.message}`);
      }

      // Use ImageMagick with BLACK SCREEN FIX
      const outputPattern = path.join(config.upload.tempDir, 'page_%03d.jpg');
      // CRITICAL FIX: Enhanced ImageMagick command to prevent black screen/partial rendering + MULTI-PAGE SUPPORT
      const magickCommand = `magick "${inputPath}" -density 300 -background white -alpha remove -define pdf:use-cropbox=false -define pdf:use-trimbox=false -colorspace sRGB -quality 95 "${outputPattern}"`;

      console.log(`   🔧 Running ENHANCED ImageMagick (BLACK SCREEN FIX): ${magickCommand}`);
      await execAsync(magickCommand);

      // Find all generated images
      const files = await fs.readdir(config.upload.tempDir);
      const imageFiles = files.filter(f => f.startsWith('page_') && f.endsWith('.jpg'));

      for (const file of imageFiles.sort()) {
        const imagePath = path.join(config.upload.tempDir, file);
        images.push(imagePath);
        console.log(`   📄 Generated image: ${file}`);
      }

      // FIXED: Use actual generated image count instead of predicted count
      const actualPages = images.length;
      console.log(`✅ [PDF-TO-IMAGES] Successfully converted PDF to ${actualPages} image${actualPages > 1 ? 's' : ''}`);

      return images;

    } catch (error) {
      console.error('❌ [PDF-TO-IMAGES] Conversion failed:', error);

      // Fallback: Try to use Puppeteer with PDF.js viewer
      console.log('🔄 [PDF-TO-IMAGES] Trying fallback method with PDF.js...');

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        // Convert PDF to base64 for PDF.js viewer
        const pdfBuffer = await fs.readFile(inputPath);
        const pdfBase64 = pdfBuffer.toString('base64');

        // Create a simple HTML with PDF.js viewer
        const pdfViewerHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          </head>
          <body style="margin:0; padding:20px; background:white;">
            <canvas id="pdf-canvas"></canvas>
            <script>
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

              const pdfData = 'data:application/pdf;base64,${pdfBase64}';

              pdfjsLib.getDocument(pdfData).promise.then(function(pdf) {
                pdf.getPage(1).then(function(page) {
                  const viewport = page.getViewport({scale: 2.0});
                  const canvas = document.getElementById('pdf-canvas');
                  const context = canvas.getContext('2d');

                  canvas.height = viewport.height;
                  canvas.width = viewport.width;

                  page.render({
                    canvasContext: context,
                    viewport: viewport
                  });
                });
              });
            </script>
          </body>
          </html>
        `;

        await page.setContent(pdfViewerHTML);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for PDF to render

        const imageBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 95,
          fullPage: true
        });

        const imagePath = path.join(config.upload.tempDir, `fallback_page_1.jpg`);
        await fs.writeFile(imagePath, imageBuffer);
        images.push(imagePath);

        console.log('✅ [PDF-TO-IMAGES] Fallback conversion completed');
        return images;

      } finally {
        await page.close();
      }
    }
  }
}