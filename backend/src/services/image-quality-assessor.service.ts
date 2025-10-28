import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Image Quality Assessment Service
 * Advanced quality metrics and preprocessing recommendations
 * Phase 2 OCR Optimization - Week 2 Monday-Tuesday
 */
export class ImageQualityAssessor {

  private static readonly QUALITY_THRESHOLDS = {
    EXCELLENT: 0.9,
    GOOD: 0.75,
    FAIR: 0.6,
    POOR: 0.4
  };

  private static readonly BLUR_THRESHOLDS = {
    SHARP: 0.8,
    SLIGHT_BLUR: 0.6,
    MODERATE_BLUR: 0.4,
    SEVERE_BLUR: 0.2
  };

  private static readonly CONTRAST_THRESHOLDS = {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
    VERY_LOW: 0.2
  };

  /**
   * Comprehensive image quality assessment
   */
  static async assessQuality(imagePath: string): Promise<{
    overallScore: number;
    qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
    metrics: {
      blurLevel: number;
      blurAssessment: 'sharp' | 'slight_blur' | 'moderate_blur' | 'severe_blur';
      contrast: number;
      contrastLevel: 'high' | 'medium' | 'low' | 'very_low';
      brightness: number;
      noise: number;
      skew: number;
      resolution: { width: number; height: number; dpi: number };
    };
    recommendations: string[];
    preprocessingSteps: string[];
    ocrReadiness: number; // 0-1 score for OCR processing readiness
    processingTime: number;
  }> {
    const startTime = Date.now();

    console.log(`🔍 [QUALITY-ASSESS] Analyzing image quality: ${path.basename(imagePath)}`);

    try {
      // Validate input
      await fs.access(imagePath);

      // Parallel quality analysis
      const [
        blurAnalysis,
        contrastAnalysis,
        brightnessAnalysis,
        noiseAnalysis,
        skewAnalysis,
        resolutionAnalysis
      ] = await Promise.all([
        this.detectBlur(imagePath),
        this.analyzeContrast(imagePath),
        this.analyzeBrightness(imagePath),
        this.detectNoise(imagePath),
        this.detectSkew(imagePath),
        this.analyzeResolution(imagePath)
      ]);

      // Calculate overall quality score
      const qualityResult = this.calculateOverallQuality({
        ...blurAnalysis,
        ...contrastAnalysis,
        ...brightnessAnalysis,
        ...noiseAnalysis,
        ...skewAnalysis,
        ...resolutionAnalysis
      });

      const processingTime = Date.now() - startTime;

      console.log(`✅ [QUALITY-ASSESS] Analysis complete: ${qualityResult.qualityLevel} (${qualityResult.overallScore.toFixed(2)}) - ${processingTime}ms`);

      return {
        ...qualityResult,
        processingTime
      };

    } catch (error) {
      console.error(`❌ [QUALITY-ASSESS] Assessment failed:`, error);

      return {
        overallScore: 0.5,
        qualityLevel: 'fair',
        metrics: {
          blurLevel: 0.5,
          blurAssessment: 'slight_blur',
          contrast: 0.6,
          contrastLevel: 'medium',
          brightness: 0.5,
          noise: 0.3,
          skew: 0,
          resolution: { width: 1000, height: 1000, dpi: 300 }
        },
        recommendations: ['Quality assessment failed - using conservative estimates'],
        preprocessingSteps: ['Apply standard preprocessing'],
        ocrReadiness: 0.6,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Detect and measure blur using Laplacian variance
   */
  private static async detectBlur(imagePath: string): Promise<{
    blurLevel: number;
    blurAssessment: 'sharp' | 'slight_blur' | 'moderate_blur' | 'severe_blur';
  }> {
    try {
      // Apply Laplacian edge detection to measure focus
      const result = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-morphology', 'Convolve', '3x3:0,-1,0 -1,4,-1 0,-1,0',
        '-format', '%[fx:standard_deviation]',
        'info:-'
      ]);

      const variance = parseFloat(result.stdout.trim()) / 65535; // Normalize
      const blurLevel = Math.max(0, Math.min(1, variance * 10)); // Scale appropriately

      let blurAssessment: 'sharp' | 'slight_blur' | 'moderate_blur' | 'severe_blur';
      if (blurLevel >= this.BLUR_THRESHOLDS.SHARP) blurAssessment = 'sharp';
      else if (blurLevel >= this.BLUR_THRESHOLDS.SLIGHT_BLUR) blurAssessment = 'slight_blur';
      else if (blurLevel >= this.BLUR_THRESHOLDS.MODERATE_BLUR) blurAssessment = 'moderate_blur';
      else blurAssessment = 'severe_blur';

      return { blurLevel, blurAssessment };

    } catch (error) {
      console.warn(`⚠️  [QUALITY-ASSESS] Blur detection fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return { blurLevel: 0.6, blurAssessment: 'slight_blur' };
    }
  }

  /**
   * Analyze image contrast using standard deviation
   */
  private static async analyzeContrast(imagePath: string): Promise<{
    contrast: number;
    contrastLevel: 'high' | 'medium' | 'low' | 'very_low';
  }> {
    try {
      const result = await this.executeImageMagick([
        'identify', '-format', '%[fx:standard_deviation]', imagePath
      ]);

      const contrast = parseFloat(result.stdout.trim()) / 65535; // Normalize to 0-1

      let contrastLevel: 'high' | 'medium' | 'low' | 'very_low';
      if (contrast >= this.CONTRAST_THRESHOLDS.HIGH) contrastLevel = 'high';
      else if (contrast >= this.CONTRAST_THRESHOLDS.MEDIUM) contrastLevel = 'medium';
      else if (contrast >= this.CONTRAST_THRESHOLDS.LOW) contrastLevel = 'low';
      else contrastLevel = 'very_low';

      return { contrast, contrastLevel };

    } catch (error) {
      console.warn(`⚠️  [QUALITY-ASSESS] Contrast analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return { contrast: 0.6, contrastLevel: 'medium' };
    }
  }

  /**
   * Analyze brightness distribution
   */
  private static async analyzeBrightness(imagePath: string): Promise<{
    brightness: number;
  }> {
    try {
      const result = await this.executeImageMagick([
        'identify', '-format', '%[fx:mean]', imagePath
      ]);

      const brightness = parseFloat(result.stdout.trim());
      return { brightness: Math.max(0, Math.min(1, brightness)) };

    } catch (error) {
      console.warn(`⚠️  [QUALITY-ASSESS] Brightness analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return { brightness: 0.5 };
    }
  }

  /**
   * Detect noise levels using despeckle comparison
   */
  private static async detectNoise(imagePath: string): Promise<{
    noise: number;
  }> {
    try {
      // Compare original with denoised version to estimate noise
      const originalResult = await this.executeImageMagick([
        'identify', '-format', '%[fx:standard_deviation]', imagePath
      ]);

      const denoisedResult = await this.executeImageMagick([
        'convert', imagePath,
        '-despeckle',
        '-format', '%[fx:standard_deviation]',
        'info:-'
      ]);

      const originalStdDev = parseFloat(originalResult.stdout.trim());
      const denoisedStdDev = parseFloat(denoisedResult.stdout.trim());

      // Noise level is the reduction in standard deviation after denoising
      const noiseReduction = Math.abs(originalStdDev - denoisedStdDev) / (originalStdDev || 1);
      const noise = Math.max(0, Math.min(1, noiseReduction));

      return { noise };

    } catch (error) {
      console.warn(`⚠️  [QUALITY-ASSESS] Noise detection fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return { noise: 0.3 };
    }
  }

  /**
   * Detect skew angle using Hough transform
   */
  private static async detectSkew(imagePath: string): Promise<{
    skew: number; // Angle in degrees
  }> {
    try {
      // Use ImageMagick's deskew feature to detect skew
      const result = await this.executeImageMagick([
        'convert', imagePath,
        '-colorspace', 'Gray',
        '-threshold', '50%',
        '-deskew', '40%',
        '-format', '%[distortion]',
        'info:-'
      ]);

      const skewStr = result.stdout.trim();
      const skew = parseFloat(skewStr) || 0;

      return { skew: Math.abs(skew) };

    } catch (error) {
      console.warn(`⚠️  [QUALITY-ASSESS] Skew detection fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return { skew: 0 };
    }
  }

  /**
   * Analyze image resolution and dimensions
   */
  private static async analyzeResolution(imagePath: string): Promise<{
    resolution: { width: number; height: number; dpi: number };
  }> {
    try {
      const result = await this.executeImageMagick([
        'identify', '-format', '%w %h %x', imagePath
      ]);

      const [width, height, dpiStr] = result.stdout.trim().split(' ');
      const dpi = parseFloat(dpiStr) || 300;

      return {
        resolution: {
          width: parseInt(width),
          height: parseInt(height),
          dpi
        }
      };

    } catch (error) {
      console.warn(`⚠️  [QUALITY-ASSESS] Resolution analysis fallback:`, error instanceof Error ? error.message : 'Unknown error');
      return {
        resolution: { width: 1000, height: 1000, dpi: 300 }
      };
    }
  }

  /**
   * Calculate overall quality score and provide recommendations
   */
  private static calculateOverallQuality(metrics: {
    blurLevel: number;
    blurAssessment: string;
    contrast: number;
    contrastLevel: string;
    brightness: number;
    noise: number;
    skew: number;
    resolution: { width: number; height: number; dpi: number };
  }): {
    overallScore: number;
    qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
    metrics: any;
    recommendations: string[];
    preprocessingSteps: string[];
    ocrReadiness: number;
  } {
    const weights = {
      blur: 0.35,      // Most important for text clarity
      contrast: 0.25,  // Critical for character separation
      brightness: 0.15, // Important for overall readability
      noise: 0.15,     // Affects OCR accuracy
      skew: 0.10       // Affects layout recognition
    };

    // Calculate weighted score
    const blurScore = metrics.blurLevel;
    const contrastScore = metrics.contrast;
    const brightnessScore = 1 - Math.abs(0.5 - metrics.brightness); // Penalize extreme brightness
    const noiseScore = 1 - metrics.noise; // Lower noise is better
    const skewScore = 1 - Math.min(1, Math.abs(metrics.skew) / 10); // Penalize skew > 10 degrees

    const overallScore = (
      (blurScore * weights.blur) +
      (contrastScore * weights.contrast) +
      (brightnessScore * weights.brightness) +
      (noiseScore * weights.noise) +
      (skewScore * weights.skew)
    );

    // Determine quality level
    let qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
    if (overallScore >= this.QUALITY_THRESHOLDS.EXCELLENT) qualityLevel = 'excellent';
    else if (overallScore >= this.QUALITY_THRESHOLDS.GOOD) qualityLevel = 'good';
    else if (overallScore >= this.QUALITY_THRESHOLDS.FAIR) qualityLevel = 'fair';
    else qualityLevel = 'poor';

    // Generate recommendations
    const recommendations: string[] = [];
    const preprocessingSteps: string[] = [];

    if (metrics.blurLevel < this.BLUR_THRESHOLDS.SLIGHT_BLUR) {
      recommendations.push('Image appears blurred - consider rescanning at higher quality');
      preprocessingSteps.push('Apply unsharp mask filter');
    }

    if (metrics.contrast < this.CONTRAST_THRESHOLDS.MEDIUM) {
      recommendations.push('Low contrast detected - enhance contrast before OCR');
      preprocessingSteps.push('Apply contrast enhancement');
    }

    if (metrics.brightness < 0.3 || metrics.brightness > 0.8) {
      recommendations.push('Brightness levels not optimal for OCR');
      preprocessingSteps.push('Apply brightness/gamma correction');
    }

    if (metrics.noise > 0.4) {
      recommendations.push('High noise levels detected - apply noise reduction');
      preprocessingSteps.push('Apply despeckle and noise reduction');
    }

    if (Math.abs(metrics.skew) > 2) {
      recommendations.push(`Document skewed by ${metrics.skew.toFixed(1)}° - deskew recommended`);
      preprocessingSteps.push('Apply automatic deskew');
    }

    if (metrics.resolution.dpi < 200) {
      recommendations.push('Low resolution detected - consider higher DPI scanning');
    }

    if (recommendations.length === 0) {
      recommendations.push('Image quality is good for OCR processing');
    }

    if (preprocessingSteps.length === 0) {
      preprocessingSteps.push('No preprocessing required');
    }

    // Calculate OCR readiness (slightly more conservative than overall score)
    const ocrReadiness = Math.max(0.3, overallScore * 0.9);

    return {
      overallScore,
      qualityLevel,
      metrics,
      recommendations,
      preprocessingSteps,
      ocrReadiness
    };
  }

  /**
   * Apply recommended preprocessing steps
   */
  static async preprocessImage(
    inputPath: string,
    outputPath: string,
    preprocessingSteps: string[]
  ): Promise<string> {
    console.log(`🔧 [PREPROCESS] Applying ${preprocessingSteps.length} enhancement steps`);

    const args = ['convert', inputPath];

    // Build ImageMagick command based on preprocessing steps
    for (const step of preprocessingSteps) {
      switch (step) {
        case 'Apply unsharp mask filter':
          args.push('-unsharp', '0x1+1.0+0.05');
          break;
        case 'Apply contrast enhancement':
          args.push('-normalize', '-contrast-stretch', '2%x1%');
          break;
        case 'Apply brightness/gamma correction':
          args.push('-gamma', '1.2', '-brightness-contrast', '10x15');
          break;
        case 'Apply despeckle and noise reduction':
          args.push('-despeckle', '-median', '1');
          break;
        case 'Apply automatic deskew':
          args.push('-deskew', '40%');
          break;
      }
    }

    args.push('-depth', '8', outputPath);

    try {
      await this.executeImageMagick(args);
      console.log(`✅ [PREPROCESS] Image enhanced: ${path.basename(outputPath)}`);
      return outputPath;
    } catch (error) {
      console.error(`❌ [PREPROCESS] Enhancement failed:`, error);
      throw new Error(`Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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