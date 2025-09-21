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
  static async convertPDFToPPT(inputPath: string, outputDir: string): Promise<string> {
    const startTime = Date.now();
    const jobId = uuidv4();

    console.log(`🚀 [PUPPETEER] Starting high-fidelity PDF→PPT conversion`);
    console.log(`📄 Input: ${path.basename(inputPath)}`);

    let page: Page | null = null;

    try {
      // Load PDF to get page count and prepare data
      const pdfBuffer = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      console.log(`📊 Document has ${pageCount} pages`);

      // Create PowerPoint presentation
      const pptx = new PptxGenJS();

      // Set presentation properties for professional output
      pptx.author = 'PDFCraft.Pro';
      pptx.company = 'PDFCraft.Pro Premium';
      pptx.revision = '1.0';
      pptx.subject = 'High-Fidelity PDF Conversion';
      pptx.title = path.basename(inputPath, '.pdf');
      pptx.layout = 'LAYOUT_16x9'; // Use standard 16:9 layout

      // Get browser instance
      const browser = await this.getBrowser();
      page = await browser.newPage();

      // Set viewport for high-quality rendering
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2 // 2x resolution for quality
      });

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

          // Optimize the image with sharp
          const optimizedBuffer = await sharp(screenshotBuffer)
            .resize(3840, 2160, { // 4K resolution
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

          // Add subtle page number
          slide.addText(`${pageNum}`, {
            x: 9.4,
            y: 5.2,
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
        `Engine: PDFCraft.Pro Puppeteer Engine v2.0`
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
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const images: string[] = [];

    try {
      // Load PDF for image conversion
      const pdfImageBuffer = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfImageBuffer);
      const pageCount = pdfDoc.getPageCount();

      // Set high-quality viewport
      await page.setViewport({
        width: 2560,
        height: 1440,
        deviceScaleFactor: 2
      });

      for (let i = 1; i <= pageCount; i++) {
        // Render each page and capture as image
        const imageBuffer = await page.screenshot({
          type: 'png',
          fullPage: true
        });

        const imagePath = path.join(config.upload.tempDir, `page_${i}.png`);
        await fs.writeFile(imagePath, imageBuffer);
        images.push(imagePath);
      }

      return images;

    } finally {
      await page.close();
    }
  }
}