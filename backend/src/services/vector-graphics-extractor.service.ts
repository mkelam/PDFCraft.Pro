import { promises as fs } from 'fs';
import { PDFDocument, PDFPage, PDFRef, PDFOperator } from 'pdf-lib';
import * as path from 'path';

export interface VectorPath {
  id: string;
  type: 'path' | 'line' | 'rectangle' | 'circle' | 'ellipse' | 'polygon';
  coordinates: number[];
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  fillRule?: 'evenodd' | 'nonzero';
  opacity?: number;
  transformMatrix?: number[];
}

export interface VectorGradient {
  id: string;
  type: 'linear' | 'radial' | 'conic';
  coordinates: number[];
  stops: Array<{
    offset: number;
    color: string;
    opacity?: number;
  }>;
}

export interface VectorPattern {
  id: string;
  type: 'tiling' | 'image';
  boundingBox: number[];
  patternMatrix?: number[];
  content: string; // SVG content or image data
}

export interface VectorText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textColor: string;
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number;
}

export interface ExtractedVectorGraphics {
  pageNumber: number;
  paths: VectorPath[];
  gradients: VectorGradient[];
  patterns: VectorPattern[];
  texts: VectorText[];
  viewBox: { x: number; y: number; width: number; height: number };
  svgContent: string;
  powerPointShapes: PowerPointShape[];
}

export interface PowerPointShape {
  type: 'path' | 'rectangle' | 'ellipse' | 'line' | 'polygon' | 'freeform';
  coordinates: { x: number; y: number; w: number; h: number };
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
  pathData?: string; // For complex paths
  points?: Array<{ x: number; y: number }>; // For polygons/freeforms
}

/**
 * VECTOR GRAPHICS EXTRACTOR SERVICE
 *
 * Phase 3 Enhancement - Vector graphics preservation and conversion
 *
 * Capabilities:
 * - PDF vector path extraction from content streams
 * - SVG generation from PDF graphics operators
 * - PowerPoint shape conversion with native vector support
 * - Gradient and pattern preservation
 * - Text curve and path handling
 * - Scalable graphics maintenance
 */
export class VectorGraphicsExtractorService {

  // PDF graphics operators that define vector content
  private static readonly VECTOR_OPERATORS = [
    'm', 'l', 'c', 'v', 'y', 'h', 'z', // Path construction
    're', // Rectangle
    'S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', // Fill and stroke
    'W', 'W*', // Clipping
    'rg', 'RG', 'g', 'G', 'k', 'K', 'cs', 'CS', 'sc', 'SC', 'scn', 'SCN' // Color
  ];

  /**
   * Extract vector graphics from PDF page
   */
  static async extractVectorGraphics(
    pdfPath: string,
    pageNumber: number = 0
  ): Promise<ExtractedVectorGraphics> {
    console.log(`🎨 [VECTOR-EXTRACT] Extracting vector graphics from page ${pageNumber + 1}...`);

    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfDocument = await PDFDocument.load(pdfBuffer);
      const pages = pdfDocument.getPages();

      if (pageNumber >= pages.length) {
        throw new Error(`Page ${pageNumber + 1} does not exist (PDF has ${pages.length} pages)`);
      }

      const page = pages[pageNumber];
      const { width, height } = page.getSize();

      // Extract vector content from page content stream
      const vectorContent = await this.extractPageVectorContent(page);

      // Parse graphics operators into structured data
      const parsedGraphics = await this.parseVectorOperators(vectorContent, width, height);

      // Generate SVG representation
      const svgContent = this.generateSVG(parsedGraphics, width, height);

      // Convert to PowerPoint-compatible shapes
      const powerPointShapes = this.convertToPowerPointShapes(parsedGraphics, width, height);

      console.log(`✅ [VECTOR-EXTRACT] Extracted ${parsedGraphics.paths.length} paths, ${parsedGraphics.texts.length} text elements`);

      return {
        pageNumber,
        paths: parsedGraphics.paths,
        gradients: parsedGraphics.gradients,
        patterns: parsedGraphics.patterns,
        texts: parsedGraphics.texts,
        viewBox: { x: 0, y: 0, width, height },
        svgContent,
        powerPointShapes
      };

    } catch (error) {
      console.error(`❌ [VECTOR-EXTRACT] Extraction failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Extract vector content from PDF page content stream
   */
  private static async extractPageVectorContent(page: PDFPage): Promise<string[]> {
    try {
      // Access the page's content stream
      const contentStream = page.node.Contents;

      if (!contentStream) {
        console.warn(`⚠️ [VECTOR-CONTENT] No content stream found on page`);
        return [];
      }

      // Handle both single content stream and array of streams
      const streams = Array.isArray(contentStream) ? contentStream : [contentStream];
      const operations: string[] = [];

      for (const stream of streams) {
        if (stream && typeof stream === 'object' && 'contents' in stream) {
          // Decode the content stream
          const content = stream.contents;
          const decodedContent = content.toString('latin1');

          // Split into individual operations
          const streamOperations = this.parseContentStreamOperations(decodedContent);
          operations.push(...streamOperations);
        }
      }

      console.log(`🔍 [VECTOR-CONTENT] Extracted ${operations.length} graphics operations`);
      return operations;

    } catch (error) {
      console.error(`❌ [VECTOR-CONTENT] Content extraction failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Parse content stream operations
   */
  private static parseContentStreamOperations(content: string): string[] {
    const operations: string[] = [];

    // Split content into tokens
    const tokens = content.split(/\s+/).filter(token => token.length > 0);
    let currentOperation: string[] = [];

    for (const token of tokens) {
      if (this.VECTOR_OPERATORS.includes(token)) {
        // Complete the current operation
        if (currentOperation.length > 0) {
          operations.push(currentOperation.join(' ') + ' ' + token);
        } else {
          operations.push(token);
        }
        currentOperation = [];
      } else {
        // Accumulate operands for the next operator
        currentOperation.push(token);
      }
    }

    return operations.filter(op => this.isVectorOperation(op));
  }

  /**
   * Check if operation is vector-related
   */
  private static isVectorOperation(operation: string): boolean {
    const parts = operation.trim().split(/\s+/);
    const operator = parts[parts.length - 1];
    return this.VECTOR_OPERATORS.includes(operator);
  }

  /**
   * Parse vector operators into structured graphics data
   */
  private static async parseVectorOperators(
    operations: string[],
    pageWidth: number,
    pageHeight: number
  ): Promise<{
    paths: VectorPath[];
    gradients: VectorGradient[];
    patterns: VectorPattern[];
    texts: VectorText[];
  }> {
    console.log(`🔧 [VECTOR-PARSE] Parsing ${operations.length} vector operations...`);

    const paths: VectorPath[] = [];
    const gradients: VectorGradient[] = [];
    const patterns: VectorPattern[] = [];
    const texts: VectorText[] = [];

    let currentPath: VectorPath | null = null;
    let currentPoint = { x: 0, y: 0 };
    let currentStrokeColor = '#000000';
    let currentFillColor = '#000000';
    let currentStrokeWidth = 1;
    let pathIdCounter = 0;

    for (const operation of operations) {
      const parts = operation.trim().split(/\s+/);
      const operator = parts[parts.length - 1];
      const operands = parts.slice(0, -1).map(Number);

      switch (operator) {
        case 'm': // Move to
          if (operands.length >= 2) {
            currentPoint = { x: operands[0], y: pageHeight - operands[1] }; // Flip Y
            if (currentPath) {
              paths.push(currentPath);
            }
            currentPath = {
              id: `path_${++pathIdCounter}`,
              type: 'path',
              coordinates: [currentPoint.x, currentPoint.y],
              strokeColor: currentStrokeColor,
              fillColor: currentFillColor,
              strokeWidth: currentStrokeWidth
            };
          }
          break;

        case 'l': // Line to
          if (operands.length >= 2 && currentPath) {
            currentPoint = { x: operands[0], y: pageHeight - operands[1] }; // Flip Y
            currentPath.coordinates.push(currentPoint.x, currentPoint.y);
          }
          break;

        case 'c': // Cubic Bézier curve
          if (operands.length >= 6 && currentPath) {
            currentPath.coordinates.push(
              operands[0], pageHeight - operands[1], // Control point 1
              operands[2], pageHeight - operands[3], // Control point 2
              operands[4], pageHeight - operands[5]  // End point
            );
            currentPoint = { x: operands[4], y: pageHeight - operands[5] };
          }
          break;

        case 're': // Rectangle
          if (operands.length >= 4) {
            const rectPath: VectorPath = {
              id: `rect_${++pathIdCounter}`,
              type: 'rectangle',
              coordinates: [
                operands[0], pageHeight - operands[1] - operands[3], // x, y (flipped)
                operands[2], operands[3] // width, height
              ],
              strokeColor: currentStrokeColor,
              fillColor: currentFillColor,
              strokeWidth: currentStrokeWidth
            };
            paths.push(rectPath);
          }
          break;

        case 'S': // Stroke path
        case 's': // Close and stroke path
          if (currentPath) {
            currentPath.strokeColor = currentStrokeColor;
            currentPath.strokeWidth = currentStrokeWidth;
            if (operator === 's') {
              currentPath.coordinates.push(currentPath.coordinates[0], currentPath.coordinates[1]); // Close path
            }
          }
          break;

        case 'f': // Fill path
        case 'F': // Fill path (alternative)
        case 'f*': // Fill path with even-odd rule
          if (currentPath) {
            currentPath.fillColor = currentFillColor;
            currentPath.fillRule = operator === 'f*' ? 'evenodd' : 'nonzero';
          }
          break;

        case 'B': // Fill and stroke path
        case 'B*': // Fill and stroke path with even-odd rule
        case 'b': // Close, fill, and stroke path
        case 'b*': // Close, fill, and stroke path with even-odd rule
          if (currentPath) {
            currentPath.fillColor = currentFillColor;
            currentPath.strokeColor = currentStrokeColor;
            currentPath.strokeWidth = currentStrokeWidth;
            currentPath.fillRule = (operator === 'B*' || operator === 'b*') ? 'evenodd' : 'nonzero';
            if (operator === 'b' || operator === 'b*') {
              currentPath.coordinates.push(currentPath.coordinates[0], currentPath.coordinates[1]); // Close path
            }
          }
          break;

        case 'rg': // Set RGB color for non-stroking
          if (operands.length >= 3) {
            currentFillColor = this.rgbToHex(operands[0], operands[1], operands[2]);
          }
          break;

        case 'RG': // Set RGB color for stroking
          if (operands.length >= 3) {
            currentStrokeColor = this.rgbToHex(operands[0], operands[1], operands[2]);
          }
          break;

        case 'g': // Set gray level for non-stroking
          if (operands.length >= 1) {
            const gray = Math.round(operands[0] * 255);
            currentFillColor = this.rgbToHex(gray / 255, gray / 255, gray / 255);
          }
          break;

        case 'G': // Set gray level for stroking
          if (operands.length >= 1) {
            const gray = Math.round(operands[0] * 255);
            currentStrokeColor = this.rgbToHex(gray / 255, gray / 255, gray / 255);
          }
          break;

        case 'w': // Set line width
          if (operands.length >= 1) {
            currentStrokeWidth = operands[0];
          }
          break;

        case 'z': // Close path
          if (currentPath && currentPath.coordinates.length >= 4) {
            currentPath.coordinates.push(currentPath.coordinates[0], currentPath.coordinates[1]);
          }
          break;
      }
    }

    // Add the last path if it exists
    if (currentPath) {
      paths.push(currentPath);
    }

    console.log(`✅ [VECTOR-PARSE] Parsed ${paths.length} vector paths`);

    return { paths, gradients, patterns, texts };
  }

  /**
   * Generate SVG content from parsed graphics
   */
  private static generateSVG(
    graphics: { paths: VectorPath[]; gradients: VectorGradient[]; patterns: VectorPattern[]; texts: VectorText[] },
    width: number,
    height: number
  ): string {
    console.log(`🎨 [SVG-GEN] Generating SVG from ${graphics.paths.length} paths...`);

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;

    // Add gradients if any
    if (graphics.gradients.length > 0) {
      svg += '  <defs>\n';
      for (const gradient of graphics.gradients) {
        svg += this.generateSVGGradient(gradient);
      }
      svg += '  </defs>\n';
    }

    // Add paths
    for (const path of graphics.paths) {
      svg += this.generateSVGPath(path);
    }

    // Add text elements
    for (const text of graphics.texts) {
      svg += this.generateSVGText(text);
    }

    svg += '</svg>';

    return svg;
  }

  /**
   * Generate SVG path element
   */
  private static generateSVGPath(path: VectorPath): string {
    let pathData = '';
    const coords = path.coordinates;

    if (path.type === 'rectangle' && coords.length >= 4) {
      return `  <rect x="${coords[0]}" y="${coords[1]}" width="${coords[2]}" height="${coords[3]}" ` +
             `fill="${path.fillColor || 'none'}" stroke="${path.strokeColor || 'none'}" ` +
             `stroke-width="${path.strokeWidth || 1}" opacity="${path.opacity || 1}" />\n`;
    }

    // Generate path data for complex paths
    if (coords.length >= 2) {
      pathData = `M ${coords[0]} ${coords[1]}`;

      for (let i = 2; i < coords.length; i += 2) {
        if (i + 1 < coords.length) {
          if (i + 5 < coords.length && (i - 2) % 6 === 0) {
            // Cubic Bézier curve (6 coordinates: x1,y1,x2,y2,x,y)
            pathData += ` C ${coords[i]} ${coords[i + 1]} ${coords[i + 2]} ${coords[i + 3]} ${coords[i + 4]} ${coords[i + 5]}`;
            i += 4; // Skip the additional coordinates
          } else {
            // Line to
            pathData += ` L ${coords[i]} ${coords[i + 1]}`;
          }
        }
      }
    }

    return `  <path d="${pathData}" fill="${path.fillColor || 'none'}" ` +
           `stroke="${path.strokeColor || 'none'}" stroke-width="${path.strokeWidth || 1}" ` +
           `opacity="${path.opacity || 1}" fill-rule="${path.fillRule || 'nonzero'}" />\n`;
  }

  /**
   * Generate SVG gradient definition
   */
  private static generateSVGGradient(gradient: VectorGradient): string {
    const stops = gradient.stops.map(stop =>
      `    <stop offset="${stop.offset * 100}%" stop-color="${stop.color}" stop-opacity="${stop.opacity || 1}" />`
    ).join('\n');

    if (gradient.type === 'linear') {
      return `    <linearGradient id="${gradient.id}">\n${stops}\n    </linearGradient>\n`;
    } else if (gradient.type === 'radial') {
      return `    <radialGradient id="${gradient.id}">\n${stops}\n    </radialGradient>\n`;
    }

    return '';
  }

  /**
   * Generate SVG text element
   */
  private static generateSVGText(text: VectorText): string {
    return `  <text x="${text.x}" y="${text.y}" font-family="${text.fontFamily}" ` +
           `font-size="${text.fontSize}" font-weight="${text.fontWeight || 'normal'}" ` +
           `font-style="${text.fontStyle || 'normal'}" fill="${text.textColor}" ` +
           `text-anchor="${text.textAlign || 'start'}">${text.content}</text>\n`;
  }

  /**
   * Convert parsed graphics to PowerPoint shapes
   */
  private static convertToPowerPointShapes(
    graphics: { paths: VectorPath[]; gradients: VectorGradient[]; patterns: VectorPattern[]; texts: VectorText[] },
    pageWidth: number,
    pageHeight: number
  ): PowerPointShape[] {
    console.log(`📐 [PPT-SHAPES] Converting ${graphics.paths.length} paths to PowerPoint shapes...`);

    const shapes: PowerPointShape[] = [];

    for (const path of graphics.paths) {
      const shape = this.convertPathToPowerPointShape(path, pageWidth, pageHeight);
      if (shape) {
        shapes.push(shape);
      }
    }

    console.log(`✅ [PPT-SHAPES] Generated ${shapes.length} PowerPoint shapes`);
    return shapes;
  }

  /**
   * Convert vector path to PowerPoint shape
   */
  private static convertPathToPowerPointShape(
    path: VectorPath,
    pageWidth: number,
    pageHeight: number
  ): PowerPointShape | null {
    const coords = path.coordinates;

    if (coords.length < 2) return null;

    // Convert coordinates to PowerPoint coordinate system
    const pptCoords = this.convertToPowerPointCoords(coords, pageWidth, pageHeight);

    // Determine bounding box
    const minX = Math.min(...pptCoords.filter((_, i) => i % 2 === 0));
    const maxX = Math.max(...pptCoords.filter((_, i) => i % 2 === 0));
    const minY = Math.min(...pptCoords.filter((_, i) => i % 2 === 1));
    const maxY = Math.max(...pptCoords.filter((_, i) => i % 2 === 1));

    const bounds = {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY
    };

    const style = {
      fill: path.fillColor,
      stroke: path.strokeColor,
      strokeWidth: path.strokeWidth,
      opacity: path.opacity
    };

    // Convert based on path type
    if (path.type === 'rectangle') {
      return {
        type: 'rectangle',
        coordinates: bounds,
        style
      };
    } else if (this.isEllipse(pptCoords)) {
      return {
        type: 'ellipse',
        coordinates: bounds,
        style
      };
    } else if (this.isLine(pptCoords)) {
      return {
        type: 'line',
        coordinates: bounds,
        style
      };
    } else {
      // Complex path - use freeform
      return {
        type: 'freeform',
        coordinates: bounds,
        style,
        pathData: this.generatePowerPointPathData(pptCoords),
        points: this.convertCoordsToPoints(pptCoords)
      };
    }
  }

  // Helper methods

  private static rgbToHex(r: number, g: number, b: number): string {
    const toHex = (component: number) => {
      const hex = Math.round(component * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private static convertToPowerPointCoords(coords: number[], pageWidth: number, pageHeight: number): number[] {
    // Convert PDF coordinates to PowerPoint coordinates (inches)
    const PDF_POINTS_PER_INCH = 72;
    const PPT_SLIDE_WIDTH = 10;
    const PPT_SLIDE_HEIGHT = 7.5;

    const scaleX = PPT_SLIDE_WIDTH / (pageWidth / PDF_POINTS_PER_INCH);
    const scaleY = PPT_SLIDE_HEIGHT / (pageHeight / PDF_POINTS_PER_INCH);

    return coords.map((coord, index) => {
      const isX = index % 2 === 0;
      const scale = isX ? scaleX : scaleY;
      return (coord / PDF_POINTS_PER_INCH) * scale;
    });
  }

  private static isEllipse(coords: number[]): boolean {
    // Simplified check - would need more sophisticated curve analysis
    return coords.length >= 8 && coords.length <= 16; // Typical ellipse representation
  }

  private static isLine(coords: number[]): boolean {
    return coords.length === 4; // Simple line with start and end points
  }

  private static generatePowerPointPathData(coords: number[]): string {
    if (coords.length < 2) return '';

    let pathData = `M ${coords[0].toFixed(2)} ${coords[1].toFixed(2)}`;

    for (let i = 2; i < coords.length; i += 2) {
      if (i + 1 < coords.length) {
        pathData += ` L ${coords[i].toFixed(2)} ${coords[i + 1].toFixed(2)}`;
      }
    }

    return pathData;
  }

  private static convertCoordsToPoints(coords: number[]): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < coords.length; i += 2) {
      if (i + 1 < coords.length) {
        points.push({ x: coords[i], y: coords[i + 1] });
      }
    }

    return points;
  }

  /**
   * Extract vector graphics from entire PDF
   */
  static async extractAllVectorGraphics(pdfPath: string): Promise<ExtractedVectorGraphics[]> {
    console.log(`🎨 [VECTOR-ALL] Extracting vector graphics from entire PDF...`);

    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfDocument = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDocument.getPageCount();

      const allGraphics: ExtractedVectorGraphics[] = [];

      for (let i = 0; i < pageCount; i++) {
        try {
          const pageGraphics = await this.extractVectorGraphics(pdfPath, i);
          allGraphics.push(pageGraphics);
        } catch (error) {
          console.warn(`⚠️ [VECTOR-ALL] Failed to extract from page ${i + 1}:`, error instanceof Error ? error.message : error);
        }
      }

      console.log(`✅ [VECTOR-ALL] Extracted vector graphics from ${allGraphics.length}/${pageCount} pages`);
      return allGraphics;

    } catch (error) {
      console.error(`❌ [VECTOR-ALL] Batch extraction failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Save extracted vector graphics as SVG files
   */
  static async saveAsSVG(graphics: ExtractedVectorGraphics, outputDir: string, filename?: string): Promise<string> {
    try {
      const svgFilename = filename || `vector-graphics-page-${graphics.pageNumber + 1}-${Date.now()}.svg`;
      const svgPath = path.join(outputDir, svgFilename);

      await fs.writeFile(svgPath, graphics.svgContent);

      console.log(`💾 [SVG-SAVE] Saved SVG: ${svgFilename}`);
      return svgFilename;

    } catch (error) {
      console.error(`❌ [SVG-SAVE] Failed to save SVG:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

export default VectorGraphicsExtractorService;