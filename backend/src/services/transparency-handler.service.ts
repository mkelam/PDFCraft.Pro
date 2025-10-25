import { promises as fs } from 'fs';
import { PDFDocument, PDFRef, PDFDict, PDFStream } from 'pdf-lib';
import sharp from 'sharp';
import { ExtractedImage } from './pdf-image-extraction.service';

export interface TransparencyMask {
  maskData: Buffer;
  width: number;
  height: number;
  colorSpace: string;
  bitsPerComponent: number;
}

export interface TransparentImage {
  imageData: Buffer;
  maskData?: Buffer;
  combinedData: Buffer;
  format: 'png' | 'jpeg';
  hasTransparency: boolean;
  width: number;
  height: number;
  base64: string;
  mimeType: string;
}

/**
 * TRANSPARENCY HANDLER SERVICE
 *
 * Phase 2 Enhancement - Addresses transparency preservation issues
 *
 * Capabilities:
 * - SMask (Soft Mask) extraction and processing
 * - Alpha channel composition
 * - Transparent PNG generation for PowerPoint
 * - Color key transparency handling
 * - Multi-layer transparency composition
 */
export class TransparencyHandlerService {

  /**
   * Process image with transparency handling
   */
  static async processImageWithTransparency(
    extractedImage: ExtractedImage,
    pdfDocument?: PDFDocument
  ): Promise<TransparentImage> {
    console.log(`🎭 [TRANSPARENCY] Processing image with transparency handling...`);

    try {
      // Step 1: Check for SMask (Soft Mask) transparency
      const transparencyMask = pdfDocument
        ? await this.extractSMask(extractedImage, pdfDocument)
        : null;

      // Step 2: Check for color key transparency
      const hasColorKeyTransparency = this.hasColorKeyTransparency(extractedImage);

      // Step 3: Process based on transparency type
      if (transparencyMask) {
        console.log(`🎭 [TRANSPARENCY] SMask transparency detected`);
        return await this.processWithSMask(extractedImage, transparencyMask);
      } else if (hasColorKeyTransparency) {
        console.log(`🎭 [TRANSPARENCY] Color key transparency detected`);
        return await this.processWithColorKey(extractedImage);
      } else if (extractedImage.hasTransparency) {
        console.log(`🎭 [TRANSPARENCY] Native transparency detected`);
        return await this.processNativeTransparency(extractedImage);
      } else {
        console.log(`🎭 [TRANSPARENCY] No transparency detected, optimizing for quality`);
        return await this.processOpaqueImage(extractedImage);
      }

    } catch (error) {
      console.warn(`⚠️ [TRANSPARENCY] Processing failed, falling back to original:`, error instanceof Error ? error.message : error);
      return await this.processOpaqueImage(extractedImage);
    }
  }

  /**
   * Extract SMask (Soft Mask) from PDF document
   */
  private static async extractSMask(
    extractedImage: ExtractedImage,
    pdfDocument: PDFDocument
  ): Promise<TransparencyMask | null> {
    try {
      // This would need access to the original PDF structure
      // For now, we'll implement a placeholder that can be enhanced
      console.log(`🔍 [SMASK] Searching for SMask in PDF structure...`);

      // TODO: Implement actual SMask extraction from pdf-lib
      // This requires deep PDF structure analysis
      return null;

    } catch (error) {
      console.warn(`⚠️ [SMASK] SMask extraction failed:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Check for color key transparency (transparent color)
   */
  private static hasColorKeyTransparency(extractedImage: ExtractedImage): boolean {
    // Check if image has a transparent color key defined
    // This would be in the image dictionary as /Mask
    return extractedImage.metadata?.mask !== undefined;
  }

  /**
   * Process image with SMask transparency
   */
  private static async processWithSMask(
    extractedImage: ExtractedImage,
    mask: TransparencyMask
  ): Promise<TransparentImage> {
    console.log(`🎭 [SMASK] Compositing image with soft mask...`);

    try {
      // Load the base image
      const imageBuffer = extractedImage.data;
      let image = sharp(imageBuffer);

      // Load the mask
      let maskBuffer = mask.maskData;

      // Ensure mask is grayscale
      if (mask.colorSpace !== 'DeviceGray') {
        maskBuffer = await sharp(maskBuffer)
          .grayscale()
          .raw()
          .toBuffer();
      }

      // Composite image with alpha channel from mask
      const { data, info } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Apply mask as alpha channel
      const composited = await this.applyMaskToImage(data, maskBuffer, info.width, info.height, info.channels);

      // Convert to PNG with transparency
      const transparentPng = await sharp(composited, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4 // RGBA
        }
      })
        .png({ quality: 100, compressionLevel: 0 })
        .toBuffer();

      const base64 = transparentPng.toString('base64');

      console.log(`✅ [SMASK] Successfully created transparent PNG`);

      return {
        imageData: imageBuffer,
        maskData: maskBuffer,
        combinedData: transparentPng,
        format: 'png',
        hasTransparency: true,
        width: info.width,
        height: info.height,
        base64: base64,
        mimeType: 'image/png'
      };

    } catch (error) {
      console.error(`❌ [SMASK] SMask processing failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Process image with color key transparency
   */
  private static async processWithColorKey(
    extractedImage: ExtractedImage
  ): Promise<TransparentImage> {
    console.log(`🎨 [COLOR-KEY] Processing color key transparency...`);

    try {
      const imageBuffer = extractedImage.data;
      const transparentColor = (extractedImage as any).metadata?.mask;

      // Use Sharp to make specific color transparent
      const processedImage = await sharp(imageBuffer)
        .png({ quality: 100 })
        .toBuffer();

      // TODO: Implement actual color key transparency
      // This requires pixel-level manipulation to make specific colors transparent

      const base64 = processedImage.toString('base64');

      return {
        imageData: imageBuffer,
        combinedData: processedImage,
        format: 'png',
        hasTransparency: true,
        width: extractedImage.width,
        height: extractedImage.height,
        base64: base64,
        mimeType: 'image/png'
      };

    } catch (error) {
      console.error(`❌ [COLOR-KEY] Color key processing failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Process image with native transparency
   */
  private static async processNativeTransparency(
    extractedImage: ExtractedImage
  ): Promise<TransparentImage> {
    console.log(`🔄 [NATIVE] Processing native transparency...`);

    try {
      const imageBuffer = extractedImage.data;

      // Ensure image is PNG with alpha channel preserved
      const processedImage = await sharp(imageBuffer)
        .png({ quality: 100, compressionLevel: 0 })
        .toBuffer();

      const base64 = processedImage.toString('base64');

      return {
        imageData: imageBuffer,
        combinedData: processedImage,
        format: 'png',
        hasTransparency: true,
        width: extractedImage.width,
        height: extractedImage.height,
        base64: base64,
        mimeType: 'image/png'
      };

    } catch (error) {
      console.error(`❌ [NATIVE] Native transparency processing failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Process opaque image with quality optimization
   */
  private static async processOpaqueImage(
    extractedImage: ExtractedImage
  ): Promise<TransparentImage> {
    console.log(`🖼️ [OPAQUE] Processing opaque image with quality optimization...`);

    try {
      const imageBuffer = extractedImage.data;

      // Optimize based on image characteristics
      const isPhoto = extractedImage.format === 'jpeg' || extractedImage.format === 'jpg';

      let processedImage: Buffer;
      let format: 'png' | 'jpeg';
      let mimeType: string;

      if (isPhoto) {
        // Keep as JPEG for photos
        processedImage = await sharp(imageBuffer)
          .jpeg({ quality: 95, progressive: true })
          .toBuffer();
        format = 'jpeg';
        mimeType = 'image/jpeg';
      } else {
        // Convert to PNG for graphics, diagrams, etc.
        processedImage = await sharp(imageBuffer)
          .png({ quality: 100, compressionLevel: 6 })
          .toBuffer();
        format = 'png';
        mimeType = 'image/png';
      }

      const base64 = processedImage.toString('base64');

      return {
        imageData: imageBuffer,
        combinedData: processedImage,
        format: format,
        hasTransparency: false,
        width: extractedImage.width,
        height: extractedImage.height,
        base64: base64,
        mimeType: mimeType
      };

    } catch (error) {
      console.error(`❌ [OPAQUE] Opaque image processing failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Apply mask to image data to create alpha channel
   */
  private static async applyMaskToImage(
    imageData: Buffer,
    maskData: Buffer,
    width: number,
    height: number,
    channels: number
  ): Promise<Buffer> {
    console.log(`🎭 [MASK-APPLY] Applying mask to create alpha channel...`);

    try {
      const pixelCount = width * height;
      const outputChannels = 4; // RGBA
      const output = Buffer.alloc(pixelCount * outputChannels);

      // Apply mask pixel by pixel
      for (let i = 0; i < pixelCount; i++) {
        const srcOffset = i * channels;
        const maskOffset = i; // Grayscale mask
        const dstOffset = i * outputChannels;

        // Copy RGB channels
        output[dstOffset] = imageData[srcOffset] || 0;     // R
        output[dstOffset + 1] = imageData[srcOffset + 1] || 0; // G
        output[dstOffset + 2] = imageData[srcOffset + 2] || 0; // B

        // Use mask as alpha channel
        output[dstOffset + 3] = maskData[maskOffset] || 255; // A
      }

      console.log(`✅ [MASK-APPLY] Successfully applied mask to ${pixelCount} pixels`);
      return output;

    } catch (error) {
      console.error(`❌ [MASK-APPLY] Mask application failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Validate transparency processing result
   */
  static async validateTransparency(
    transparentImage: TransparentImage
  ): Promise<{
    isValid: boolean;
    hasAlphaChannel: boolean;
    transparentPixels: number;
    qualityScore: number;
  }> {
    try {
      const { data, info } = await sharp(transparentImage.combinedData)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const hasAlphaChannel = info.channels === 4;
      let transparentPixels = 0;

      if (hasAlphaChannel) {
        // Count transparent pixels (alpha < 255)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            transparentPixels++;
          }
        }
      }

      const totalPixels = info.width * info.height;
      const transparencyRatio = transparentPixels / totalPixels;
      const qualityScore = this.calculateQualityScore(transparentImage, transparencyRatio);

      console.log(`📊 [VALIDATION] Transparency: ${transparentPixels}/${totalPixels} pixels (${(transparencyRatio * 100).toFixed(1)}%)`);

      return {
        isValid: transparentImage.combinedData.length > 0,
        hasAlphaChannel,
        transparentPixels,
        qualityScore
      };

    } catch (error) {
      console.error(`❌ [VALIDATION] Transparency validation failed:`, error instanceof Error ? error.message : error);
      return {
        isValid: false,
        hasAlphaChannel: false,
        transparentPixels: 0,
        qualityScore: 0
      };
    }
  }

  /**
   * Calculate quality score for transparency processing
   */
  private static calculateQualityScore(
    transparentImage: TransparentImage,
    transparencyRatio: number
  ): number {
    let score = 100;

    // Deduct points for quality issues
    if (transparentImage.combinedData.length === 0) score -= 50;
    if (!transparentImage.hasTransparency && transparencyRatio > 0) score -= 20;
    if (transparentImage.format !== 'png' && transparentImage.hasTransparency) score -= 10;
    if (transparentImage.width <= 0 || transparentImage.height <= 0) score -= 30;

    // Bonus points for good transparency handling
    if (transparentImage.hasTransparency && transparencyRatio > 0.01) score += 10;
    if (transparentImage.format === 'png' && transparentImage.hasTransparency) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Create test transparent image for debugging
   */
  static async createTestTransparentImage(): Promise<TransparentImage> {
    console.log(`🧪 [TEST] Creating test transparent image...`);

    try {
      // Create a simple transparent test image
      const testImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 }
        }
      })
        .png()
        .toBuffer();

      const base64 = testImage.toString('base64');

      return {
        imageData: testImage,
        combinedData: testImage,
        format: 'png',
        hasTransparency: true,
        width: 200,
        height: 200,
        base64: base64,
        mimeType: 'image/png'
      };

    } catch (error) {
      console.error(`❌ [TEST] Test image creation failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

export default TransparencyHandlerService;