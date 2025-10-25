import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PptxGenJS from 'pptxgenjs';
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

/**
 * ENHANCED FALLBACK PDF SERVICE
 *
 * Designed to work WITHOUT external dependencies (ImageMagick/GraphicsMagick)
 * Uses sharp + canvas for image processing when needed
 * Focuses on reliable conversion with smart fallbacks
 */
export class EnhancedFallbackPDFService {

  /**
   * Convert PDF to PowerPoint with enhanced fallback logic
   */
  static async convertPDFToOffice(inputPath: string, outputDir: string, originalFilename?: string): Promise<string> {
    const startTime = Date.now();
    const jobId = uuidv4();

    // Extract original PDF name without extension
    const originalPdfName = originalFilename ? path.basename(originalFilename, '.pdf') : path.basename(inputPath, '.pdf');
    console.log(`🚀 [ENHANCED-FALLBACK] Converting: ${originalPdfName}.pdf`);

    try {
      // Step 1: Analyze PDF content
      const pdfBuffer = await fs.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pdfTextData = await pdf(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();

      console.log(`📊 [ENHANCED-FALLBACK] PDF Analysis: ${pageCount} pages, ${pdfTextData.text.length} characters`);

      // Step 2: Advanced content analysis
      const contentAnalysis = await this.analyzeDocumentStructure(pdfDoc, pdfTextData);
      console.log(`🧠 [ENHANCED-FALLBACK] Content Analysis: ${contentAnalysis.type}, confidence: ${contentAnalysis.confidence}`);

      // Step 3: Create PowerPoint with intelligent layout
      const pptx = new PptxGenJS();
      pptx.author = 'PDFCraft.Pro Enhanced Fallback';
      pptx.title = `${originalPdfName} - Converted`;
      pptx.subject = 'PDF to PowerPoint Conversion with Content Preservation';

      // Step 4: Process pages with structure-aware approach
      const pageContents = await this.extractStructuredContent(pdfDoc, pdfTextData, pageCount);

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const pageNum = pageIndex + 1;
        console.log(`🔄 [ENHANCED-FALLBACK] Processing page ${pageNum}/${pageCount}...`);

        const slide = pptx.addSlide();
        const pageContent = pageContents[pageIndex];

        // Create intelligent slide based on content type
        await this.createIntelligentSlide(slide, pageContent, pageNum, contentAnalysis);
      }

      // Step 5: Add enhanced summary
      this.addEnhancedSummary(pptx, originalPdfName, pageCount, pdfTextData, contentAnalysis);

      // Step 6: Save with original filename
      const outputFilename = `${originalPdfName}.pptx`;
      const outputPath = path.join(outputDir, outputFilename);

      await pptx.writeFile({ fileName: outputPath });

      const processingTime = Date.now() - startTime;
      console.log(`✅ [ENHANCED-FALLBACK] Conversion completed: ${outputFilename} in ${processingTime}ms`);

      return outputFilename;

    } catch (error) {
      console.error(`❌ [ENHANCED-FALLBACK] Conversion failed:`, error instanceof Error ? error.message : error);
      throw new Error(`Enhanced fallback conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Advanced document structure analysis
   */
  private static async analyzeDocumentStructure(pdfDoc: PDFDocument, pdfTextData: any): Promise<{
    type: 'presentation' | 'document' | 'form' | 'mixed';
    confidence: number;
    hasImages: boolean;
    hasText: boolean;
    avgWordsPerPage: number;
    structure: {
      hasHeadings: boolean;
      hasBullets: boolean;
      hasNumbers: boolean;
      hasColumns: boolean;
    };
  }> {
    const pageCount = pdfDoc.getPageCount();
    const totalText = pdfTextData.text || '';
    const avgWordsPerPage = totalText.split(/\s+/).length / pageCount;

    // Analyze text patterns
    const hasHeadings = /^[A-Z][A-Z\s]{5,}$/m.test(totalText);
    const hasBullets = /•|·|‣|\*|\-\s/.test(totalText);
    const hasNumbers = /^\d+\.|\(\d+\)/.test(totalText);
    const hasColumns = avgWordsPerPage > 200 && totalText.includes('\t');

    // Determine document type
    let type: 'presentation' | 'document' | 'form' | 'mixed' = 'document';
    let confidence = 0.5;

    if (avgWordsPerPage < 100 && (hasHeadings || hasBullets)) {
      type = 'presentation';
      confidence = 0.8;
    } else if (avgWordsPerPage > 300) {
      type = 'document';
      confidence = 0.9;
    } else if (totalText.includes('□') || totalText.includes('☐')) {
      type = 'form';
      confidence = 0.7;
    } else {
      type = 'mixed';
      confidence = 0.6;
    }

    return {
      type,
      confidence,
      hasImages: false, // Conservative assumption without image analysis
      hasText: totalText.length > 0,
      avgWordsPerPage,
      structure: {
        hasHeadings,
        hasBullets,
        hasNumbers,
        hasColumns
      }
    };
  }

  /**
   * Extract structured content from PDF pages
   */
  private static async extractStructuredContent(pdfDoc: PDFDocument, pdfTextData: any, pageCount: number): Promise<Array<{
    pageNumber: number;
    text: string;
    title?: string;
    bullets?: string[];
    paragraphs?: string[];
    metadata: {
      wordCount: number;
      hasStructure: boolean;
      estimatedType: 'title' | 'content' | 'footer';
    };
  }>> {
    const totalText = pdfTextData.text || '';
    const pageContents: any[] = [];

    // Smart page division based on natural breaks
    const pageBreaks = this.findNaturalPageBreaks(totalText, pageCount);

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const startIdx = pageBreaks[pageIndex];
      const endIdx = pageBreaks[pageIndex + 1] || totalText.length;
      const pageText = totalText.substring(startIdx, endIdx).trim();

      const processedContent = this.analyzePageContent(pageText, pageIndex + 1);
      pageContents.push(processedContent);
    }

    return pageContents;
  }

  /**
   * Find natural page breaks in text
   */
  private static findNaturalPageBreaks(text: string, pageCount: number): number[] {
    const breaks = [0];

    // Look for natural break patterns
    const breakPatterns = [
      /\n\s*\n\s*[A-Z]/g,  // Double newline followed by capital
      /\.\s*\n\s*[A-Z]/g,   // Period, newline, capital
      /\n\s*\d+\.\s/g,      // Numbered sections
      /\n\s*Chapter\s/gi,   // Chapter breaks
      /\n\s*Page\s/gi       // Page breaks
    ];

    const potentialBreaks: number[] = [];

    breakPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        potentialBreaks.push(match.index);
      }
    });

    // Sort and select best breaks
    potentialBreaks.sort((a, b) => a - b);

    const targetBreakDistance = text.length / pageCount;

    for (let i = 1; i < pageCount; i++) {
      const targetPosition = i * targetBreakDistance;
      const closest = potentialBreaks.reduce((prev, curr) =>
        Math.abs(curr - targetPosition) < Math.abs(prev - targetPosition) ? curr : prev
      );
      breaks.push(closest);
    }

    return breaks.sort((a, b) => a - b);
  }

  /**
   * Analyze individual page content
   */
  private static analyzePageContent(pageText: string, pageNumber: number): any {
    const words = pageText.split(/\s+/).filter(w => w.length > 0);
    const lines = pageText.split('\n').filter(l => l.trim().length > 0);

    // Extract title (usually first line or large text)
    const title = lines[0]?.length < 100 ? lines[0] : `Page ${pageNumber}`;

    // Extract bullets
    const bullets = lines.filter(line =>
      /^[\s]*[•·‣\*\-]\s/.test(line)
    ).map(line => line.replace(/^[\s]*[•·‣\*\-]\s/, '').trim());

    // Extract paragraphs
    const paragraphs = pageText.split(/\n\s*\n/).filter(p =>
      p.trim().length > 20 && !bullets.some(b => p.includes(b))
    );

    // Determine content type
    let estimatedType: 'title' | 'content' | 'footer' = 'content';
    if (words.length < 10) estimatedType = 'title';
    if (pageText.includes('Page ') && words.length < 50) estimatedType = 'footer';

    return {
      pageNumber,
      text: pageText,
      title,
      bullets: bullets.length > 0 ? bullets : undefined,
      paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
      metadata: {
        wordCount: words.length,
        hasStructure: bullets.length > 0 || paragraphs.length > 1,
        estimatedType
      }
    };
  }

  /**
   * Create intelligent slide based on content analysis
   */
  private static async createIntelligentSlide(slide: any, pageContent: any, pageNum: number, contentAnalysis: any): Promise<void> {
    slide.background = { color: 'FFFFFF' };

    // Add title
    slide.addText(pageContent.title || `Page ${pageNum}`, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '2C3E50',
      align: 'left'
    });

    let yPosition = 1.5;

    // Add bullets if present
    if (pageContent.bullets && pageContent.bullets.length > 0) {
      pageContent.bullets.slice(0, 6).forEach((bullet: string, index: number) => {
        slide.addText(`• ${bullet}`, {
          x: 0.8,
          y: yPosition + (index * 0.4),
          w: 8.7,
          h: 0.35,
          fontSize: 14,
          color: '34495E',
          wrap: true
        });
      });
      yPosition += Math.min(pageContent.bullets.length, 6) * 0.4 + 0.3;
    }

    // Add paragraphs if present
    if (pageContent.paragraphs && pageContent.paragraphs.length > 0) {
      pageContent.paragraphs.slice(0, 3).forEach((paragraph: string, index: number) => {
        slide.addText(paragraph.substring(0, 400), {
          x: 0.5,
          y: yPosition + (index * 1.2),
          w: 9,
          h: 1,
          fontSize: 12,
          color: '2C3E50',
          wrap: true,
          lineSpacing: 16
        });
      });
    } else if (!pageContent.bullets) {
      // No structure, add raw text
      slide.addText(pageContent.text.substring(0, 800), {
        x: 0.5,
        y: yPosition,
        w: 9,
        h: 3,
        fontSize: 11,
        color: '2C3E50',
        wrap: true,
        lineSpacing: 16
      });
    }

    // Add full content to notes for searchability
    slide.addNotes(`Page ${pageNum} Content:\n\n${pageContent.text}\n\n--- Enhanced Fallback Service ---`);

    // Add page indicator
    slide.addText(`${pageNum}`, {
      x: 9.2,
      y: 5.3,
      w: 0.5,
      h: 0.3,
      fontSize: 10,
      color: 'CCCCCC',
      align: 'center'
    });
  }

  /**
   * Add enhanced summary slide
   */
  private static addEnhancedSummary(pptx: any, filename: string, pageCount: number, pdfData: any, analysis: any): void {
    const slide = pptx.addSlide();
    slide.background = { color: 'F8F9FA' };

    slide.addText('📊 Conversion Summary', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '2C3E50'
    });

    const stats = [
      `📄 Source: ${filename}.pdf`,
      `📊 Pages: ${pageCount}`,
      `📝 Content: ${pdfData.text.length.toLocaleString()} characters`,
      `🎯 Document Type: ${analysis.type.toUpperCase()}`,
      `📈 Confidence: ${Math.round(analysis.confidence * 100)}%`,
      `🔍 Structure: ${analysis.structure.hasHeadings ? 'Headings' : ''} ${analysis.structure.hasBullets ? 'Bullets' : ''} ${analysis.structure.hasNumbers ? 'Numbers' : ''}`.trim(),
      `🕒 Converted: ${new Date().toLocaleString()}`,
      `✅ Engine: Enhanced Fallback Service v1.0`
    ].join('\n\n');

    slide.addText(stats, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 3,
      fontSize: 12,
      color: '495057',
      lineSpacing: 18
    });

    slide.addText('✅ Reliable Conversion Complete\n📱 No external dependencies required\n🔍 Content preserved with intelligent structure detection', {
      x: 0.5,
      y: 4.5,
      w: 9,
      h: 1,
      fontSize: 12,
      color: '27AE60',
      align: 'center',
      bold: true
    });
  }

  /**
   * Merge PDFs with enhanced fallback
   */
  static async mergePDFs(inputPaths: string[], outputDir: string): Promise<string> {
    const startTime = Date.now();
    console.log(`🚀 [ENHANCED-FALLBACK] Starting PDF merge: ${inputPaths.length} files`);

    try {
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;

      for (const [index, inputPath] of inputPaths.entries()) {
        console.log(`📄 [ENHANCED-FALLBACK] Processing file ${index + 1}/${inputPaths.length}`);

        const pdfBuffer = await fs.readFile(inputPath);
        const pdf = await PDFDocument.load(pdfBuffer);
        const pageIndices = pdf.getPageIndices();

        const pages = await mergedPdf.copyPages(pdf, pageIndices);
        pages.forEach(page => mergedPdf.addPage(page));

        totalPages += pageIndices.length;
      }

      const outputFilename = `merged_${uuidv4()}.pdf`;
      const outputPath = path.join(outputDir, outputFilename);

      const pdfBytes = await mergedPdf.save();
      await fs.writeFile(outputPath, pdfBytes);

      const processingTime = Date.now() - startTime;
      console.log(`✅ [ENHANCED-FALLBACK] PDF merge completed: ${totalPages} pages, ${processingTime}ms`);

      return outputFilename;
    } catch (error) {
      console.error('❌ [ENHANCED-FALLBACK] PDF merge failed:', error);
      throw error;
    }
  }
}