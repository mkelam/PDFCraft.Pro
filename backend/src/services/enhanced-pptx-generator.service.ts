import { promises as fs } from 'fs';
import * as path from 'path';
import PptxGenJS from 'pptxgenjs';
import { PDFContent, PageContent, ExtractedImage, TextBlock } from './pdf-image-extraction.service';

export interface PPTXGenerationOptions {
  originalFilename?: string;
  slideWidth?: number;
  slideHeight?: number;
  maxQuality?: boolean;
  preserveAspectRatio?: boolean;
  enableBackgrounds?: boolean;
}

export interface CoordinateTransformResult {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * CRITICAL SERVICE - Enhanced PowerPoint Generation with Coordinate Transformation
 *
 * Addresses ROOT CAUSE #2: Incorrect PPTX Image Insertion
 * Addresses ROOT CAUSE #3: Missing Coordinate Transformation
 * - Converts PDF coordinates to PowerPoint coordinates with Y-axis flip
 * - Positions individual images instead of full-slide backgrounds
 * - Configures PptxGenJS for maximum quality (no compression)
 * - Handles proper scaling and aspect ratio preservation
 */
export class EnhancedPPTXGenerator {
  // PowerPoint standard slide dimensions (inches)
  private static readonly PPT_SLIDE_WIDTH = 10;
  private static readonly PPT_SLIDE_HEIGHT = 7.5;

  // PDF standard measurements
  private static readonly PDF_POINTS_PER_INCH = 72;
  private static readonly PDF_DEFAULT_PAGE_WIDTH = 612; // 8.5 inches
  private static readonly PDF_DEFAULT_PAGE_HEIGHT = 792; // 11 inches

  /**
   * Create PowerPoint from extracted PDF content with proper positioning
   */
  static async createPowerPoint(
    extractedContent: PDFContent,
    outputDir: string,
    options: PPTXGenerationOptions = {}
  ): Promise<string> {
    const {
      originalFilename,
      slideWidth = this.PPT_SLIDE_WIDTH,
      slideHeight = this.PPT_SLIDE_HEIGHT,
      maxQuality = true,
      preserveAspectRatio = true,
      enableBackgrounds = false
    } = options;

    console.log(`🎯 [ENHANCED-PPTX] Creating PowerPoint with ${extractedContent.totalImages} images`);

    // Initialize PptxGenJS with maximum quality settings
    const pptx = new PptxGenJS();
    this.configurePptxForMaxQuality(pptx, originalFilename);

    // Set custom slide dimensions if specified
    if (slideWidth !== this.PPT_SLIDE_WIDTH || slideHeight !== this.PPT_SLIDE_HEIGHT) {
      pptx.defineLayout({
        name: 'CUSTOM',
        width: slideWidth,
        height: slideHeight
      });
      pptx.layout = 'CUSTOM';
    }

    let totalImagesProcessed = 0;
    let totalTextBlocksProcessed = 0;

    // Process each page
    for (const pageContent of extractedContent.pages) {
      const slide = pptx.addSlide();

      console.log(`📄 [PAGE-${pageContent.pageNumber + 1}] Processing ${pageContent.images.length} images, ${pageContent.textBlocks.length} text blocks`);

      // Add background if available and enabled
      if (enableBackgrounds && pageContent.background) {
        slide.background = {
          data: pageContent.background,
          transparency: 0
        };
      }

      // Process images with exact positioning
      for (const image of pageContent.images) {
        try {
          const positioned = await this.addPositionedImage(slide, image, pageContent, slideWidth, slideHeight, preserveAspectRatio);
          if (positioned) {
            totalImagesProcessed++;
            console.log(`🖼️ [IMAGE-POSITIONED] Page ${pageContent.pageNumber + 1}: ${image.format} (${image.width}x${image.height}) at (${positioned.x.toFixed(2)}, ${positioned.y.toFixed(2)})`);
          }
        } catch (error) {
          console.error(`❌ [IMAGE-ERROR] Page ${pageContent.pageNumber + 1}:`, error instanceof Error ? error.message : String(error));
        }
      }

      // Process text blocks with positioning
      for (const textBlock of pageContent.textBlocks) {
        try {
          const positioned = await this.addPositionedText(slide, textBlock, pageContent, slideWidth, slideHeight);
          if (positioned) {
            totalTextBlocksProcessed++;
          }
        } catch (error) {
          console.error(`❌ [TEXT-ERROR] Page ${pageContent.pageNumber + 1}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }

    // Generate filename and save
    const filename = this.generateFilename(originalFilename);
    const fullPath = path.join(outputDir, filename);

    await pptx.writeFile({
      fileName: fullPath,
      compression: false // CRITICAL: No compression for maximum quality
    });

    console.log(`✅ [ENHANCED-PPTX] Generated: ${filename}`);
    console.log(`📊 [STATISTICS] Images: ${totalImagesProcessed}/${extractedContent.totalImages}, Text: ${totalTextBlocksProcessed}/${extractedContent.totalTextBlocks}`);

    return filename;
  }

  /**
   * Configure PptxGenJS for maximum quality
   */
  private static configurePptxForMaxQuality(pptx: PptxGenJS, originalFilename?: string): void {
    // CRITICAL: Disable compression to prevent image quality loss
    (pptx as any).compression = false;

    // Set document properties
    pptx.author = 'pdflab.pro';
    pptx.company = 'pdflab.pro';
    pptx.revision = '1';
    pptx.subject = 'PDF to PowerPoint Conversion';
    pptx.title = originalFilename || 'Converted Document';

    console.log(`⚙️ [PPTX-CONFIG] Configured for maximum quality (compression: false)`);
  }

  /**
   * Add image to slide with proper positioning and coordinate transformation
   */
  private static async addPositionedImage(
    slide: any,
    image: ExtractedImage,
    pageContent: PageContent,
    slideWidth: number,
    slideHeight: number,
    preserveAspectRatio: boolean
  ): Promise<CoordinateTransformResult | null> {
    try {
      // Validate image data
      if (!image.data || image.data.length === 0) {
        console.warn(`⚠️ [IMAGE-SKIP] Empty image data on page ${pageContent.pageNumber + 1}`);
        return null;
      }

      if (image.width <= 0 || image.height <= 0) {
        console.warn(`⚠️ [IMAGE-SKIP] Invalid dimensions: ${image.width}x${image.height}`);
        return null;
      }

      // Transform PDF coordinates to PowerPoint coordinates
      const pptCoords = this.pdfToPowerPointCoordinates(
        image.x,
        image.y,
        image.width,
        image.height,
        pageContent.width,
        pageContent.height,
        slideWidth,
        slideHeight
      );

      // Validate transformed coordinates
      if (!this.validateCoordinates(pptCoords, slideWidth, slideHeight)) {
        console.warn(`⚠️ [COORD-SKIP] Invalid coordinates:`, pptCoords);
        return null;
      }

      // Prepare image data for PowerPoint
      const imageDataUrl = `data:${image.mimeType};base64,${image.base64}`;

      // Configure image options for maximum quality
      const imageOptions: any = {
        data: imageDataUrl,
        x: pptCoords.x,
        y: pptCoords.y,
        w: pptCoords.width,
        h: pptCoords.height,
        rounding: false, // Prevent auto-rounding that reduces quality
        sizing: {
          type: 'contain',
          w: pptCoords.width,
          h: pptCoords.height
        }
      };

      // Handle transparency
      if (image.hasTransparency) {
        imageOptions.transparency = 0; // No additional transparency
        console.log(`🎭 [TRANSPARENCY] Preserving transparency for image on page ${pageContent.pageNumber + 1}`);
      }

      // Handle aspect ratio preservation
      if (preserveAspectRatio) {
        const aspectRatio = image.width / image.height;
        const targetAspectRatio = pptCoords.width / pptCoords.height;

        if (Math.abs(aspectRatio - targetAspectRatio) > 0.1) {
          // Adjust dimensions to preserve aspect ratio
          if (aspectRatio > targetAspectRatio) {
            // Image is wider - adjust height
            pptCoords.height = pptCoords.width / aspectRatio;
          } else {
            // Image is taller - adjust width
            pptCoords.width = pptCoords.height * aspectRatio;
          }

          imageOptions.w = pptCoords.width;
          imageOptions.h = pptCoords.height;
        }
      }

      // Add image to slide
      slide.addImage(imageOptions);

      return {
        x: pptCoords.x,
        y: pptCoords.y,
        width: pptCoords.width,
        height: pptCoords.height,
        scale: pptCoords.scale || 1
      };

    } catch (error) {
      console.error(`❌ [ADD-IMAGE] Error adding image:`, error);
      return null;
    }
  }

  /**
   * Add text to slide with proper positioning
   */
  private static async addPositionedText(
    slide: any,
    textBlock: TextBlock,
    pageContent: PageContent,
    slideWidth: number,
    slideHeight: number
  ): Promise<CoordinateTransformResult | null> {
    try {
      // Skip empty text
      if (!textBlock.content || textBlock.content.trim().length === 0) {
        return null;
      }

      // Transform coordinates for text
      const textCoords = this.pdfToPowerPointCoordinates(
        textBlock.x,
        textBlock.y,
        textBlock.width,
        textBlock.height,
        pageContent.width,
        pageContent.height,
        slideWidth,
        slideHeight
      );

      // Validate coordinates
      if (!this.validateCoordinates(textCoords, slideWidth, slideHeight)) {
        console.warn(`⚠️ [TEXT-COORD] Invalid text coordinates:`, textCoords);
        return null;
      }

      // Convert font size
      const fontSize = this.pdfToPointSize(textBlock.fontSize);

      // Configure text options
      const textOptions: any = {
        x: textCoords.x,
        y: textCoords.y,
        w: textCoords.width,
        h: textCoords.height,
        fontSize: fontSize,
        fontFace: textBlock.fontFamily || 'Arial',
        color: textBlock.color || '000000',
        bold: textBlock.isBold || false,
        italic: textBlock.isItalic || false,
        align: textBlock.alignment || 'left',
        valign: 'top'
      };

      // Add text to slide
      slide.addText(textBlock.content, textOptions);

      return {
        x: textCoords.x,
        y: textCoords.y,
        width: textCoords.width,
        height: textCoords.height,
        scale: textCoords.scale || 1
      };

    } catch (error) {
      console.error(`❌ [ADD-TEXT] Error adding text:`, error);
      return null;
    }
  }

  /**
   * Transform PDF coordinates to PowerPoint coordinates
   *
   * CRITICAL COORDINATE TRANSFORMATION:
   * - PDF: Origin bottom-left, measured in points (72 DPI)
   * - PowerPoint: Origin top-left, measured in inches
   * - Must flip Y-axis and convert units
   */
  private static pdfToPowerPointCoordinates(
    pdfX: number,
    pdfY: number,
    pdfWidth: number,
    pdfHeight: number,
    pageWidth: number,
    pageHeight: number,
    slideWidth: number,
    slideHeight: number
  ): {x: number, y: number, width: number, height: number, scale: number} {

    // Convert PDF points to inches
    const xInches = pdfX / this.PDF_POINTS_PER_INCH;
    const yInches = pdfY / this.PDF_POINTS_PER_INCH;
    const widthInches = pdfWidth / this.PDF_POINTS_PER_INCH;
    const heightInches = pdfHeight / this.PDF_POINTS_PER_INCH;
    const pageWidthInches = pageWidth / this.PDF_POINTS_PER_INCH;
    const pageHeightInches = pageHeight / this.PDF_POINTS_PER_INCH;

    // CRITICAL: Flip Y coordinate (PDF bottom-left to PowerPoint top-left)
    const flippedY = pageHeightInches - yInches - heightInches;

    // Calculate scaling to fit PowerPoint slide
    const scaleX = slideWidth / pageWidthInches;
    const scaleY = slideHeight / pageHeightInches;

    // Use uniform scaling to preserve aspect ratio
    const scale = Math.min(scaleX, scaleY);

    // Apply scaling and ensure coordinates are within slide bounds
    const scaledX = Math.max(0, Math.min(xInches * scale, slideWidth - 0.1));
    const scaledY = Math.max(0, Math.min(flippedY * scale, slideHeight - 0.1));
    const scaledWidth = Math.min(widthInches * scale, slideWidth - scaledX);
    const scaledHeight = Math.min(heightInches * scale, slideHeight - scaledY);

    return {
      x: scaledX,
      y: scaledY,
      width: scaledWidth,
      height: scaledHeight,
      scale
    };
  }

  /**
   * Validate coordinates are within slide bounds
   */
  private static validateCoordinates(
    coords: {x: number, y: number, width: number, height: number},
    slideWidth: number,
    slideHeight: number
  ): boolean {
    return (
      coords.x >= 0 &&
      coords.y >= 0 &&
      coords.width > 0 &&
      coords.height > 0 &&
      coords.x + coords.width <= slideWidth + 0.1 && // Allow small tolerance
      coords.y + coords.height <= slideHeight + 0.1
    );
  }

  /**
   * Convert PDF font size to PowerPoint point size
   */
  private static pdfToPointSize(pdfSize: number): number {
    // Clamp font size to reasonable PowerPoint range
    return Math.max(6, Math.min(72, pdfSize));
  }

  /**
   * Generate output filename
   */
  private static generateFilename(originalFilename?: string): string {
    const baseName = originalFilename
      ? path.basename(originalFilename, path.extname(originalFilename))
      : 'converted';

    const timestamp = Date.now();
    return `${baseName}_enhanced_${timestamp}.pptx`;
  }

  /**
   * Create PowerPoint from images only (simplified version)
   */
  static async createFromImagesOnly(
    images: ExtractedImage[],
    outputDir: string,
    originalFilename?: string
  ): Promise<string> {
    console.log(`🖼️ [IMAGES-ONLY] Creating PowerPoint from ${images.length} images`);

    const pptx = new PptxGenJS();
    this.configurePptxForMaxQuality(pptx, originalFilename);

    // Group images by page
    const imagesByPage = new Map<number, ExtractedImage[]>();
    for (const img of images) {
      if (!imagesByPage.has(img.page)) {
        imagesByPage.set(img.page, []);
      }
      imagesByPage.get(img.page)!.push(img);
    }

    // Create slides with positioned images
    for (const [pageNum, pageImages] of imagesByPage) {
      const slide = pptx.addSlide();

      for (const img of pageImages) {
        const pptCoords = this.pdfToPowerPointCoordinates(
          img.x, img.y, img.width, img.height,
          this.PDF_DEFAULT_PAGE_WIDTH, this.PDF_DEFAULT_PAGE_HEIGHT,
          this.PPT_SLIDE_WIDTH, this.PPT_SLIDE_HEIGHT
        );

        if (this.validateCoordinates(pptCoords, this.PPT_SLIDE_WIDTH, this.PPT_SLIDE_HEIGHT)) {
          slide.addImage({
            data: `data:${img.mimeType};base64,${img.base64}`,
            x: pptCoords.x,
            y: pptCoords.y,
            w: pptCoords.width,
            h: pptCoords.height,
            rounding: false,
            sizing: {
              type: 'contain',
              w: pptCoords.width,
              h: pptCoords.height
            }
          });
        }
      }
    }

    // Save PowerPoint
    const filename = this.generateFilename(originalFilename);
    const fullPath = path.join(outputDir, filename);

    await pptx.writeFile({
      fileName: fullPath,
      compression: false
    });

    console.log(`✅ [IMAGES-ONLY] Generated: ${filename} with ${images.length} images`);
    return filename;
  }

  /**
   * Diagnostic method to test coordinate transformation
   */
  static testCoordinateTransformation(
    pdfX: number,
    pdfY: number,
    pdfWidth: number,
    pdfHeight: number,
    pageWidth?: number,
    pageHeight?: number
  ): CoordinateTransformResult {
    return this.pdfToPowerPointCoordinates(
      pdfX, pdfY, pdfWidth, pdfHeight,
      pageWidth || this.PDF_DEFAULT_PAGE_WIDTH,
      pageHeight || this.PDF_DEFAULT_PAGE_HEIGHT,
      this.PPT_SLIDE_WIDTH,
      this.PPT_SLIDE_HEIGHT
    );
  }
}

export default EnhancedPPTXGenerator;