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
      // Load PDF to get page count
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

      // Convert file path to file:// URL
      const fileUrl = `file:///${inputPath.replace(/\\/g, '/')}`;

      console.log('📄 Loading PDF in browser...');

      // Create HTML to display PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            #pdf-container { width: 100vw; height: 100vh; }
            canvas { display: block; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div id="pdf-container"></div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            async function renderPage(pageNum) {
              const loadingTask = pdfjsLib.getDocument('${fileUrl}');
              const pdf = await loadingTask.promise;
              const page = await pdf.getPage(pageNum);

              const scale = 2.0; // High quality scale
              const viewport = page.getViewport({ scale });

              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;

              document.getElementById('pdf-container').innerHTML = '';
              document.getElementById('pdf-container').appendChild(canvas);

              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;

              return { width: viewport.width, height: viewport.height };
            }

            window.renderPage = renderPage;
          </script>
        </body>
        </html>
      `;

      // Load the HTML content
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

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

          console.log(`✅ Page ${pageNum} rendered successfully`);

        } catch (pageError) {
          console.warn(`⚠️ Failed to render page ${pageNum}, adding placeholder`);

          // Add placeholder slide for failed pages
          const slide = pptx.addSlide();
          slide.background = { color: 'FAFAFA' };

          slide.addText(`Page ${pageNum}`, {
            x: 0,
            y: 2,
            w: '100%',
            h: 1,
            fontSize: 48,
            bold: true,
            color: '666666',
            align: 'center'
          });

          slide.addText('Page rendering failed\nContent preserved in original PDF', {
            x: 0,
            y: 3,
            w: '100%',
            h: 1,
            fontSize: 18,
            color: '999999',
            align: 'center'
          });
        }
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
      // Load PDF
      const pdfBuffer = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
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