/**
 * POSITION-AWARE PDF SERVICE
 *
 * Implements Expert Recommendation Priority 1:
 * - pdf.js position-aware parsing
 * - Space inference from character positions
 * - Glyph distance calculation for proper spacing
 * - Coordinate-based text extraction
 *
 * Built on stable ImprovedPDFService foundation
 */

import PptxGenJS from 'pptxgenjs';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Setup minimal Node.js environment for pdf.js
if (typeof globalThis.window === 'undefined') {
  // Minimal polyfills for pdf.js
  globalThis.window = {} as any;
  globalThis.document = {
    createElement: () => ({}),
    createElementNS: () => ({})
  } as any;
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {}
  } as any;
  globalThis.navigator = {
    userAgent: 'Node.js',
    platform: 'node'
  } as any;
}

// Use legacy build for Node.js environment
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Configure PDF.js for Node.js environment
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

interface PositionedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  transform: number[];
}

interface TextBlock {
  texts: PositionedTextItem[];
  x: number;
  y: number;
  width: number;
  height: number;
  combinedText: string;
}

interface PageLayout {
  textBlocks: TextBlock[];
  images: any[];
  width: number;
  height: number;
}

export class PositionAwarePDFService {
  /**
   * EXPERT RECOMMENDATION: Replace pdf-parse with pdf.js
   * Extract text with position data and calculate proper spacing
   */
  static async convertPDFToOffice(inputPath: string, outputDir: string): Promise<string> {
    console.log('🎯 [POSITION-AWARE] Starting position-aware PDF conversion...');
    console.log('📋 Using pdf.js for coordinate-based text extraction');

    const startTime = Date.now();

    try {
      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // Load PDF with pdf.js
      const pdfData = await fs.readFile(inputPath);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;

      console.log(`📄 PDF loaded: ${pdfDocument.numPages} pages`);

      // Create PowerPoint presentation
      const pptx = new PptxGenJS();
      pptx.author = 'pdflab.pro Position-Aware Engine';
      pptx.company = 'pdflab.pro';
      pptx.subject = 'High-Fidelity PDF Conversion';

      // Process each page with position-aware extraction
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        console.log(`🔍 [PAGE-${pageNum}] Processing with position analysis...`);

        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });

        // EXPERT RECOMMENDATION: Use getTextContent() for position data
        const textContent = await page.getTextContent();
        const pageLayout = await this.extractPositionedLayout(textContent, viewport);

        // Add slide with positioned content
        const slide = pptx.addSlide();
        await this.addPositionedContentToSlide(slide, pageLayout, viewport);

        console.log(`✅ [PAGE-${pageNum}] Added ${pageLayout.textBlocks.length} text blocks`);
      }

      // Generate output filename - preserve original name
      const originalName = path.basename(inputPath, '.pdf');
      const outputFilename = `${originalName}.pptx`;
      const outputPath = path.join(outputDir, outputFilename);

      // Save presentation
      await pptx.writeFile({ fileName: outputPath });

      const totalTime = Date.now() - startTime;
      console.log(`🎉 [POSITION-AWARE] Conversion completed!`);
      console.log(`⏱️  Time: ${totalTime}ms`);
      console.log(`📁 Output: ${outputFilename}`);

      return outputFilename;

    } catch (error: any) {
      console.error('❌ [POSITION-AWARE] Conversion failed:', error);
      throw new Error(`Position-aware conversion failed: ${error.message}`);
    }
  }

  /**
   * EXPERT RECOMMENDATION: Extract text with position data
   * Each item has: str, transform, width, height, fontName
   */
  private static async extractPositionedLayout(
    textContent: any,
    viewport: any
  ): Promise<PageLayout> {
    const positionedItems: PositionedTextItem[] = [];

    // Extract positioned text items from pdf.js
    for (const item of textContent.items) {
      if (item.str && item.str.trim()) {
        // Transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
        const transform = item.transform;
        const x = transform[4];
        const y = viewport.height - transform[5]; // Flip Y coordinate
        const fontSize = Math.abs(transform[0]); // Scale X as font size approximation

        positionedItems.push({
          text: item.str,
          x: x,
          y: y,
          width: item.width || 0,
          height: item.height || fontSize,
          fontSize: fontSize,
          fontName: item.fontName || 'Arial',
          transform: transform
        });
      }
    }

    console.log(`📊 [LAYOUT] Extracted ${positionedItems.length} positioned text items`);

    // EXPERT RECOMMENDATION: Group into text blocks and calculate spacing
    const textBlocks = await this.groupIntoTextBlocks(positionedItems);

    return {
      textBlocks: textBlocks,
      images: [], // TODO: Implement image extraction
      width: viewport.width,
      height: viewport.height
    };
  }

  /**
   * EXPERT RECOMMENDATION: Group positioned items and calculate proper spacing
   * Implement space insertion via glyph distance calculation
   */
  private static async groupIntoTextBlocks(items: PositionedTextItem[]): Promise<TextBlock[]> {
    if (items.length === 0) return [];

    // Sort items by Y position (top to bottom), then X (left to right)
    const sortedItems = items.sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff < 5) { // Same line threshold (5 pixels)
        return a.x - b.x; // Sort by X
      }
      return a.y - b.y; // Sort by Y
    });

    const textBlocks: TextBlock[] = [];
    let currentBlock: PositionedTextItem[] = [];
    let currentY = sortedItems[0].y;

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      const yDiff = Math.abs(item.y - currentY);

      // Start new block if Y position differs significantly
      if (yDiff > 10 && currentBlock.length > 0) {
        // Process current block
        const processedBlock = await this.processTextBlock(currentBlock);
        if (processedBlock) {
          textBlocks.push(processedBlock);
        }

        currentBlock = [item];
        currentY = item.y;
      } else {
        currentBlock.push(item);
      }
    }

    // Process final block
    if (currentBlock.length > 0) {
      const processedBlock = await this.processTextBlock(currentBlock);
      if (processedBlock) {
        textBlocks.push(processedBlock);
      }
    }

    console.log(`🔤 [GROUPING] Created ${textBlocks.length} text blocks from ${items.length} items`);
    return textBlocks;
  }

  /**
   * EXPERT RECOMMENDATION: Calculate spaces based on glyph distances
   * Insert space if gap exceeds threshold (e.g., 0.15 em units)
   */
  private static async processTextBlock(items: PositionedTextItem[]): Promise<TextBlock | null> {
    if (items.length === 0) return null;

    // Sort items in this block by X position
    const sortedItems = items.sort((a, b) => a.x - b.x);

    let combinedText = '';
    let needsSpace = false;

    for (let i = 0; i < sortedItems.length; i++) {
      const currentItem = sortedItems[i];

      if (i > 0) {
        const prevItem = sortedItems[i - 1];

        // EXPERT RECOMMENDATION: Calculate gap between characters
        const gap = currentItem.x - (prevItem.x + prevItem.width);
        const averageCharWidth = prevItem.fontSize * 0.6; // Approximate character width
        const spaceThreshold = averageCharWidth * 0.15; // 0.15 em units as recommended

        // Insert space if gap exceeds threshold
        if (gap > spaceThreshold) {
          combinedText += ' ';
          console.log(`🔍 [SPACING] Added space between "${prevItem.text}" and "${currentItem.text}" (gap: ${gap.toFixed(2)}px, threshold: ${spaceThreshold.toFixed(2)}px)`);
        }
      }

      combinedText += currentItem.text;
    }

    // Calculate block boundaries
    const minX = Math.min(...sortedItems.map(item => item.x));
    const maxX = Math.max(...sortedItems.map(item => item.x + item.width));
    const minY = Math.min(...sortedItems.map(item => item.y));
    const maxY = Math.max(...sortedItems.map(item => item.y + item.height));

    return {
      texts: sortedItems,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      combinedText: combinedText.trim()
    };
  }

  /**
   * Add positioned content to PowerPoint slide
   * TODO: Implement coordinate mapping for layout preservation
   */
  private static async addPositionedContentToSlide(
    slide: any,
    pageLayout: PageLayout,
    viewport: any
  ): Promise<void> {
    // Add title with page info
    slide.addText(`Page Content (${pageLayout.textBlocks.length} blocks)`, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: '333333'
    });

    // Add text blocks with basic positioning
    let yOffset = 1.0;
    for (const block of pageLayout.textBlocks) {
      if (block.combinedText && block.combinedText.length > 0) {
        // Basic positioning (will be enhanced in Priority 2)
        slide.addText(block.combinedText, {
          x: 0.5,
          y: yOffset,
          w: 9,
          h: 'auto',
          fontSize: 12,
          color: '000000',
          wrap: true
        });

        yOffset += 0.4;

        // Prevent overflow
        if (yOffset > 6.5) {
          slide.addText('... (content continues)', {
            x: 0.5,
            y: yOffset,
            w: 9,
            h: 0.3,
            fontSize: 10,
            italic: true,
            color: '666666'
          });
          break;
        }
      }
    }

    // Add positioning metadata in notes
    const metadata = {
      extractionEngine: 'PositionAwarePDFService',
      extractionMethod: 'pdf.js with position data',
      pageWidth: viewport.width,
      pageHeight: viewport.height,
      textBlocksCount: pageLayout.textBlocks.length,
      spacingAlgorithm: 'glyph distance calculation (0.15 em threshold)',
      timestamp: new Date().toISOString()
    };

    slide.addNotes([
      'Position-Aware Extraction Metadata:',
      `Engine: ${metadata.extractionEngine}`,
      `Method: ${metadata.extractionMethod}`,
      `Page Size: ${metadata.pageWidth}x${metadata.pageHeight}`,
      `Text Blocks: ${metadata.textBlocksCount}`,
      `Spacing: ${metadata.spacingAlgorithm}`,
      `Extracted: ${metadata.timestamp}`,
      '',
      'Text Content:',
      ...pageLayout.textBlocks.map(block => `"${block.combinedText}"`)
    ]);
  }

  /**
   * Validate position-aware extraction quality
   */
  static async validatePositionAwareExtraction(outputPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(outputPath);
      return stats.size > 1000; // Basic validation
    } catch (error) {
      return false;
    }
  }
}

export default PositionAwarePDFService;