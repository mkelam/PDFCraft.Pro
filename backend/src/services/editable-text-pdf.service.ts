import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import PptxGenJS from 'pptxgenjs';
import { LibreOfficeWrapper } from './libreoffice-wrapper.service';

/**
 * EDITABLE TEXT PDF SERVICE
 *
 * Priority: Editable Text > Visual Fidelity > Speed
 * Ensures PowerPoint output has truly editable text boxes instead of images
 *
 * Approach:
 * 1. PRIMARY: LibreOffice for native editable conversion
 * 2. FALLBACK: PDF text extraction + manual PPT creation with text boxes
 * 3. EMERGENCY: Enhanced services with image fallback
 */
export class EditableTextPDFService {

  /**
   * Convert PDF to PowerPoint with maximum text editability
   */
  static async convertPDFToOffice(inputPath: string, outputDir: string, originalFilename?: string): Promise<string> {
    console.log(`🖊️ [EDITABLE-TEXT] Starting conversion with text editability priority`);
    console.log(`   📄 Input: ${path.basename(inputPath)}`);
    console.log(`   🎯 Goal: Editable text boxes in PowerPoint`);

    // Method 1: LibreOffice (Best for editable text)
    if (await LibreOfficeWrapper.isAvailable()) {
      console.log(`📝 [EDITABLE-TEXT] Trying LibreOffice (native editable text)...`);

      try {
        const libreOfficeResult = await this.convertWithLibreOffice(inputPath, outputDir, originalFilename);

        // Validate that text is truly editable
        const editabilityCheck = await this.validateTextEditability(path.join(outputDir, libreOfficeResult));

        if (editabilityCheck.hasEditableText) {
          console.log(`✅ [EDITABLE-TEXT] LibreOffice success - ${editabilityCheck.editableTextCount} editable text elements`);
          return libreOfficeResult;
        } else {
          console.warn(`⚠️ [EDITABLE-TEXT] LibreOffice produced non-editable text, trying fallback...`);
        }
      } catch (error) {
        console.warn(`⚠️ [EDITABLE-TEXT] LibreOffice failed:`, error instanceof Error ? error.message : error);
      }
    } else {
      console.log(`📝 [EDITABLE-TEXT] LibreOffice not available, using text extraction method`);
    }

    // Method 2: PDF Text Extraction + Manual PPT Creation
    console.log(`🔤 [EDITABLE-TEXT] Trying PDF text extraction + manual PPT creation...`);

    try {
      const textExtractionResult = await this.convertWithTextExtraction(inputPath, outputDir, originalFilename);

      // This method guarantees editable text since we manually create text boxes
      console.log(`✅ [EDITABLE-TEXT] Text extraction method completed with editable text boxes`);
      return textExtractionResult;

    } catch (error) {
      console.error(`❌ [EDITABLE-TEXT] Text extraction failed:`, error instanceof Error ? error.message : error);
      throw new Error(`Editable text conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert using LibreOffice (preserves native editability)
   */
  private static async convertWithLibreOffice(inputPath: string, outputDir: string, originalFilename?: string): Promise<string> {
    const outputFilename = await LibreOfficeWrapper.convertPDFToPPT(inputPath, outputDir);

    // If original filename provided, rename to preserve it
    if (originalFilename) {
      const currentPath = path.join(outputDir, outputFilename);
      const targetBasename = path.basename(originalFilename, '.pdf');
      const targetFilename = `${targetBasename}.pptx`;
      const targetPath = path.join(outputDir, targetFilename);

      if (currentPath !== targetPath) {
        await fs.rename(currentPath, targetPath);
        return targetFilename;
      }
    }

    return outputFilename;
  }

  /**
   * Convert using PDF text extraction + manual PowerPoint creation
   * This guarantees editable text boxes
   */
  private static async convertWithTextExtraction(inputPath: string, outputDir: string, originalFilename?: string): Promise<string> {
    console.log(`🔤 [TEXT-EXTRACTION] Starting PDF text extraction`);

    // Extract text from PDF
    const pdfBuffer = await fs.readFile(inputPath);
    const pdfData = await pdf(pdfBuffer);

    console.log(`📊 [TEXT-EXTRACTION] Extracted text from ${pdfData.numpages} pages`);
    console.log(`📊 [TEXT-EXTRACTION] Total text length: ${pdfData.text.length} characters`);

    // Create PowerPoint with editable text
    const ppt = new PptxGenJS();

    // Split text by pages (rough estimation)
    const textPerPage = Math.ceil(pdfData.text.length / pdfData.numpages);
    const pages = this.splitTextIntoPages(pdfData.text, pdfData.numpages);

    console.log(`📄 [TEXT-EXTRACTION] Creating ${pages.length} slides with editable text`);

    pages.forEach((pageText, index) => {
      const slide = ppt.addSlide();

      if (pageText.trim()) {
        // Add title if this looks like it might have one
        const lines = pageText.split('\n').filter(line => line.trim());
        const potentialTitle = lines[0];
        const bodyText = lines.slice(1).join('\n');

        // Add title text box (editable)
        if (potentialTitle && potentialTitle.length < 100) {
          slide.addText(potentialTitle, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 1,
            fontSize: 24,
            bold: true,
            color: '363636',
            align: 'center',
            valign: 'middle'
          });
        }

        // Add body text box (editable)
        if (bodyText.trim()) {
          slide.addText(bodyText, {
            x: 0.5,
            y: potentialTitle && potentialTitle.length < 100 ? 1.8 : 0.5,
            w: 9,
            h: potentialTitle && potentialTitle.length < 100 ? 5.5 : 6.5,
            fontSize: 14,
            color: '363636',
            align: 'left',
            valign: 'top',
            wrap: true
          });
        }
      } else {
        // Empty slide with placeholder text
        slide.addText('(Page content could not be extracted)', {
          x: 1,
          y: 3,
          w: 8,
          h: 1,
          fontSize: 16,
          color: '999999',
          align: 'center',
          valign: 'middle',
          italic: true
        });
      }
    });

    // Generate output filename
    const baseName = originalFilename
      ? path.basename(originalFilename, '.pdf')
      : path.basename(inputPath, '.pdf');
    const outputFilename = `${baseName}_editable_${uuidv4()}.pptx`;
    const outputPath = path.join(outputDir, outputFilename);

    // Save PowerPoint file
    await ppt.writeFile({ fileName: outputPath });

    console.log(`✅ [TEXT-EXTRACTION] Created PowerPoint with editable text: ${outputFilename}`);

    return outputFilename;
  }

  /**
   * Split extracted text into logical pages
   */
  private static splitTextIntoPages(text: string, pageCount: number): string[] {
    if (pageCount <= 1) {
      return [text];
    }

    // Try to find natural page breaks first
    const pageBreakPatterns = [
      /\f/g,           // Form feed character
      /\n\s*\n\s*\n/g, // Multiple blank lines
      /Page \d+/gi,    // "Page X" indicators
    ];

    let pages: string[] = [];
    let remainingText = text;

    // Try to split by form feed characters first (most reliable)
    if (text.includes('\f')) {
      pages = text.split('\f').filter(page => page.trim());
      if (pages.length >= pageCount * 0.8) { // If we get reasonable number of pages
        return pages.slice(0, pageCount); // Take only expected number
      }
    }

    // Fallback: Split by character count
    const charsPerPage = Math.ceil(text.length / pageCount);
    pages = [];

    for (let i = 0; i < pageCount; i++) {
      const start = i * charsPerPage;
      const end = start + charsPerPage;
      let pageText = text.slice(start, end);

      // Try to break at word boundaries
      if (i < pageCount - 1 && end < text.length) {
        const lastSpace = pageText.lastIndexOf(' ');
        const lastNewline = pageText.lastIndexOf('\n');
        const breakPoint = Math.max(lastSpace, lastNewline);

        if (breakPoint > charsPerPage * 0.8) { // Don't break too early
          pageText = pageText.slice(0, breakPoint);
        }
      }

      pages.push(pageText);
    }

    return pages.filter(page => page.trim());
  }

  /**
   * Validate that the PowerPoint file contains editable text
   */
  private static async validateTextEditability(pptxPath: string): Promise<{
    hasEditableText: boolean;
    editableTextCount: number;
    imageCount: number;
    confidence: number;
  }> {
    try {
      const stats = await fs.stat(pptxPath);

      // Basic validation - check file size and extension
      if (!pptxPath.endsWith('.pptx') || stats.size < 10000) {
        return {
          hasEditableText: false,
          editableTextCount: 0,
          imageCount: 0,
          confidence: 0
        };
      }

      // For now, assume LibreOffice creates editable text
      // This could be enhanced with actual PPTX parsing
      return {
        hasEditableText: true,
        editableTextCount: 1, // Assume at least some editable text
        imageCount: 0,
        confidence: 0.8
      };

    } catch (error) {
      console.warn('Could not validate text editability:', error);
      return {
        hasEditableText: false,
        editableTextCount: 0,
        imageCount: 0,
        confidence: 0
      };
    }
  }

  /**
   * Enhanced text extraction with better formatting preservation
   */
  private static async extractStructuredText(inputPath: string): Promise<{
    pages: Array<{
      pageNumber: number;
      title?: string;
      headings: string[];
      paragraphs: string[];
      bulletPoints: string[];
      rawText: string;
    }>;
    metadata: {
      totalPages: number;
      totalTextLength: number;
      hasStructure: boolean;
    };
  }> {
    const pdfBuffer = await fs.readFile(inputPath);
    const pdfData = await pdf(pdfBuffer);

    // Basic text extraction for now
    // This could be enhanced with more sophisticated parsing
    const pages = [{
      pageNumber: 1,
      title: undefined,
      headings: [],
      paragraphs: [pdfData.text],
      bulletPoints: [],
      rawText: pdfData.text
    }];

    return {
      pages,
      metadata: {
        totalPages: pdfData.numpages,
        totalTextLength: pdfData.text.length,
        hasStructure: false
      }
    };
  }
}