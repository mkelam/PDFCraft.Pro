import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Adaptive DPI Selection Service
 * Automatically determines optimal DPI for OCR processing based on content analysis
 * Phase 2 OCR Optimization - Week 2 Monday-Tuesday
 */
export class AdaptiveDPISelector {

  private static readonly DPI_RANGES = {
    MINIMUM: 150,    // For simple, large text
    STANDARD: 300,   // Default for most documents
    HIGH: 450,       // For small text or complex layouts
    MAXIMUM: 600     // For very small text or low-quality scans
  };

  private static readonly ANALYSIS_THRESHOLDS = {
    SMALL_TEXT_RATIO: 0.3,        // If 30%+ of detected text is small
    LOW_CONTRAST_THRESHOLD: 0.4,   // Contrast ratio threshold
    BLUR_DETECTION_THRESHOLD: 0.7, // Blur metric threshold
    COMPLEX_LAYOUT_SCORE: 0.6      // Layout complexity threshold
  };

  /**
   * Analyze image and determine optimal DPI
   */
  static async analyzeDPI(imagePath: string): Promise<{
    recommendedDPI: number;
    confidence: number;
    analysisDetails: {
      textSize: 'small' | 'medium' | 'large';
      contrast: number;
      blurLevel: number;
      layoutComplexity: number;
      reasoning: string[];
    };
    processingTime: number;
  }> {
    const startTime = Date.now();

    console.log(`🔍 [ADAPTIVE-DPI] Analyzing image: ${path.basename(imagePath)}`);

    try {
      // Validate input file
      await fs.access(imagePath);

      // Perform parallel analysis
      const [
        imageMetrics,
        textAnalysis,
        layoutAnalysis,
        contrastAnalysis
      ] = await Promise.all([
        this.getImageMetrics(imagePath),
        this.analyzeTextCharacteristics(imagePath),
        this.analyzeLayoutComplexity(imagePath),
        this.analyzeContrast(imagePath)
      ]);

      // Calculate optimal DPI based on analysis
      const dpiRecommendation = this.calculateOptimalDPI({
        ...imageMetrics,
        ...textAnalysis,
        ...layoutAnalysis,
        ...contrastAnalysis
      });

      const processingTime = Date.now() - startTime;

      console.log(`✅ [ADAPTIVE-DPI] Analysis complete: ${dpiRecommendation.recommendedDPI}DPI (${processingTime}ms)`);
      console.log(`📊 [ANALYSIS] ${dpiRecommendation.analysisDetails.reasoning.join(', ')}`);

      return {
        ...dpiRecommendation,
        processingTime
      };

    } catch (error) {
      console.error(`❌ [ADAPTIVE-DPI] Analysis failed:`, error);

      // Fallback to safe default
      return {
        recommendedDPI: this.DPI_RANGES.STANDARD,
        confidence: 0.5,
        analysisDetails: {
          textSize: 'medium',
          contrast: 0.7,
          blurLevel: 0.5,
          layoutComplexity: 0.5,
          reasoning: ['Analysis failed - using safe default DPI']
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get basic image metrics using ImageMagick
   */
  private static async getImageMetrics(imagePath: string): Promise<{
    width: number;
    height: number;
    density: number;
    colorspace: string;
  }> {
    try {
      const result = await this.executeImageMagick([
        'identify', '-format', '%w %h %x %r', imagePath
      ]);

      const [width, height, densityStr, colorspace] = result.stdout.trim().split(' ');
      const density = parseFloat(densityStr) || 72;

      return {
        width: parseInt(width),
        height: parseInt(height),
        density,
        colorspace: colorspace || 'Unknown'
      };
    } catch (error) {
      console.warn(`⚠️  [ADAPTIVE-DPI] Image metrics fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        width: 1000,
        height: 1000,
        density: 72,
        colorspace: 'sRGB'
      };
    }
  }

  /**
   * Analyze text characteristics to determine size distribution
   */
  private static async analyzeTextCharacteristics(imagePath: string): Promise<{
    textSizeDistribution: { small: number; medium: number; large: number };
    dominantTextSize: 'small' | 'medium' | 'large';
  }> {
    try {
      // Use ImageMagick to analyze text regions
      const result = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-threshold', '50%',
        '-morphology', 'Open', 'Rectangle:1x10',
        '-connected-components', '8',
        'info:-'
      ]);

      // Parse component information to estimate text sizes
      const lines = result.stdout.split('\n').filter(line => line.includes('gray'));

      let small = 0, medium = 0, large = 0;

      for (const line of lines) {
        // Extract bounding box information
        const match = line.match(/(\d+)x(\d+)/);
        if (match) {
          const width = parseInt(match[1]);
          const height = parseInt(match[2]);
          const area = width * height;

          if (area < 100) small++;
          else if (area < 1000) medium++;
          else large++;
        }
      }

      const total = small + medium + large || 1;
      const distribution = {
        small: small / total,
        medium: medium / total,
        large: large / total
      };

      // Determine dominant text size
      let dominantTextSize: 'small' | 'medium' | 'large' = 'medium';
      if (distribution.small > 0.5) dominantTextSize = 'small';
      else if (distribution.large > 0.4) dominantTextSize = 'large';

      return {
        textSizeDistribution: distribution,
        dominantTextSize
      };

    } catch (error) {
      console.warn(`⚠️  [ADAPTIVE-DPI] Text analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        textSizeDistribution: { small: 0.3, medium: 0.5, large: 0.2 },
        dominantTextSize: 'medium'
      };
    }
  }

  /**
   * Analyze layout complexity
   */
  private static async analyzeLayoutComplexity(imagePath: string): Promise<{
    layoutComplexity: number;
    columnCount: number;
  }> {
    try {
      // Analyze image for structural elements using edge detection
      const result = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-edge', '1',
        '-threshold', '50%',
        '-morphology', 'Close', 'Rectangle:20x1',
        'txt:-'
      ]);

      const edgePixels = (result.stdout.match(/black/g) || []).length;
      const totalPixels = (result.stdout.match(/:/g) || []).length;
      const edgeRatio = edgePixels / (totalPixels || 1);

      // Estimate column count based on vertical lines
      const verticalLinesResult = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-morphology', 'Close', 'Rectangle:1x50',
        '-threshold', '90%',
        'txt:-'
      ]);

      const verticalLines = (verticalLinesResult.stdout.match(/white/g) || []).length;
      const estimatedColumns = Math.max(1, Math.min(4, Math.floor(verticalLines / 1000) + 1));

      return {
        layoutComplexity: Math.min(1, edgeRatio * 5), // Normalize to 0-1
        columnCount: estimatedColumns
      };

    } catch (error) {
      console.warn(`⚠️  [ADAPTIVE-DPI] Layout analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        layoutComplexity: 0.5,
        columnCount: 1
      };
    }
  }

  /**
   * Analyze image contrast
   */
  private static async analyzeContrast(imagePath: string): Promise<{
    contrast: number;
    blurLevel: number;
  }> {
    try {
      // Get contrast and blur metrics
      const contrastResult = await this.executeImageMagick([
        'identify', '-format', '%[fx:standard_deviation]', imagePath
      ]);

      const blurResult = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-convolve', '0,-1,0 -1,5,-1 0,-1,0',
        '-format', '%[fx:mean]',
        'info:-'
      ]);

      const contrast = parseFloat(contrastResult.stdout.trim()) / 65535; // Normalize
      const blurLevel = 1 - parseFloat(blurResult.stdout.trim()); // Invert for blur level

      return {
        contrast: Math.max(0, Math.min(1, contrast)),
        blurLevel: Math.max(0, Math.min(1, blurLevel))
      };

    } catch (error) {
      console.warn(`⚠️  [ADAPTIVE-DPI] Contrast analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        contrast: 0.7,
        blurLevel: 0.3
      };
    }
  }

  /**
   * Calculate optimal DPI based on all analysis factors
   */
  private static calculateOptimalDPI(analysis: {
    width: number;
    height: number;
    density: number;
    textSizeDistribution: { small: number; medium: number; large: number };
    dominantTextSize: 'small' | 'medium' | 'large';
    layoutComplexity: number;
    columnCount: number;
    contrast: number;
    blurLevel: number;
  }): {
    recommendedDPI: number;
    confidence: number;
    analysisDetails: {
      textSize: 'small' | 'medium' | 'large';
      contrast: number;
      blurLevel: number;
      layoutComplexity: number;
      reasoning: string[];
    };
  } {
    const reasoning: string[] = [];
    let baseDPI = this.DPI_RANGES.STANDARD;
    let dpiMultiplier = 1.0;
    let confidence = 0.8;

    // Factor 1: Text size (40% weight)
    if (analysis.dominantTextSize === 'small') {
      dpiMultiplier *= 1.5;
      reasoning.push('Small text detected - increasing DPI');
    } else if (analysis.dominantTextSize === 'large') {
      dpiMultiplier *= 0.8;
      reasoning.push('Large text detected - reducing DPI');
    }

    // Factor 2: Contrast quality (25% weight)
    if (analysis.contrast < this.ANALYSIS_THRESHOLDS.LOW_CONTRAST_THRESHOLD) {
      dpiMultiplier *= 1.3;
      reasoning.push('Low contrast - increasing DPI');
      confidence *= 0.9;
    } else if (analysis.contrast > 0.8) {
      reasoning.push('High contrast - good for OCR');
    }

    // Factor 3: Blur level (20% weight)
    if (analysis.blurLevel > this.ANALYSIS_THRESHOLDS.BLUR_DETECTION_THRESHOLD) {
      dpiMultiplier *= 1.4;
      reasoning.push('Blur detected - increasing DPI');
      confidence *= 0.8;
    }

    // Factor 4: Layout complexity (15% weight)
    if (analysis.layoutComplexity > this.ANALYSIS_THRESHOLDS.COMPLEX_LAYOUT_SCORE) {
      dpiMultiplier *= 1.2;
      reasoning.push('Complex layout - increasing DPI');
    }

    if (analysis.columnCount > 2) {
      dpiMultiplier *= 1.1;
      reasoning.push('Multi-column layout - slight DPI increase');
    }

    // Calculate final DPI
    const calculatedDPI = Math.round(baseDPI * dpiMultiplier);
    const recommendedDPI = Math.max(
      this.DPI_RANGES.MINIMUM,
      Math.min(this.DPI_RANGES.MAXIMUM, calculatedDPI)
    );

    // Adjust confidence based on how extreme the DPI is
    if (recommendedDPI >= this.DPI_RANGES.HIGH) {
      confidence *= 0.9;
      reasoning.push(`High DPI recommended (${recommendedDPI})`);
    }

    if (reasoning.length === 0) {
      reasoning.push('Standard document - default DPI suitable');
    }

    return {
      recommendedDPI,
      confidence: Math.max(0.5, Math.min(1.0, confidence)),
      analysisDetails: {
        textSize: analysis.dominantTextSize,
        contrast: analysis.contrast,
        blurLevel: analysis.blurLevel,
        layoutComplexity: analysis.layoutComplexity,
        reasoning
      }
    };
  }

  /**
   * Enhanced image preprocessing based on DPI analysis
   */
  static async enhanceImage(
    imagePath: string,
    outputPath: string,
    dpiAnalysis: {
      recommendedDPI: number;
      analysisDetails: {
        contrast: number;
        blurLevel: number;
        layoutComplexity: number;
      };
    }
  ): Promise<string> {
    console.log(`🔧 [ENHANCE] Processing image with ${dpiAnalysis.recommendedDPI}DPI`);

    const enhancementArgs = [
      'convert', imagePath,
      '-density', dpiAnalysis.recommendedDPI.toString(),
      '-colorspace', 'Gray'
    ];

    // Apply contrast enhancement if needed
    if (dpiAnalysis.analysisDetails.contrast < 0.6) {
      enhancementArgs.push('-normalize', '-contrast-stretch', '2%x1%');
      console.log(`🎨 [ENHANCE] Applied contrast enhancement`);
    }

    // Apply sharpening if blur detected
    if (dpiAnalysis.analysisDetails.blurLevel > 0.6) {
      enhancementArgs.push('-unsharp', '0x1+1.0+0.05');
      console.log(`🔍 [ENHANCE] Applied sharpening filter`);
    }

    // Apply noise reduction for complex layouts
    if (dpiAnalysis.analysisDetails.layoutComplexity > 0.7) {
      enhancementArgs.push('-despeckle');
      console.log(`🧹 [ENHANCE] Applied noise reduction`);
    }

    enhancementArgs.push('-depth', '8', outputPath);

    try {
      await this.executeImageMagick(enhancementArgs);
      console.log(`✅ [ENHANCE] Image enhanced: ${path.basename(outputPath)}`);
      return outputPath;
    } catch (error) {
      console.error(`❌ [ENHANCE] Enhancement failed:`, error);
      throw new Error(`Image enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute ImageMagick command
   */
  private static async executeImageMagick(
    args: string[],
    timeout: number = 30000
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn('magick', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`ImageMagick process failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`ImageMagick process error: ${error.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`ImageMagick process timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}