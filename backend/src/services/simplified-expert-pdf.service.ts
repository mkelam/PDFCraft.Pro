import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PptxGenJS from 'pptxgenjs';
import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';

/**
 * SIMPLIFIED EXPERT-ENHANCED PDF SERVICE
 *
 * Based on expert feedback but using pdf-parse with intelligent spacing improvements
 * Implements the expert's key recommendations:
 * - Intelligent text spacing insertion
 * - Form structure detection
 * - Layout preservation
 * - Content area analysis
 */
export class SimplifiedExpertPDFService {
  /**
   * Convert PDF to PowerPoint with Expert Intelligence
   */
  static async convertPDFToOffice(
    inputPath: string,
    outputDir: string,
    originalFilename?: string
  ): Promise<string> {
    console.log('🧠 [EXPERT-PDF] Starting intelligent PDF conversion...');

    try {
      // Step 1: Extract and analyze PDF content
      const pdfBuffer = await fs.readFile(inputPath);
      const pdfData = await pdfParse(pdfBuffer);
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      console.log(`📊 [EXPERT-PDF] Extracted ${pdfData.text.length} characters from ${pdfDoc.getPageCount()} pages`);

      // Step 2: Apply Expert Intelligence - Fix text spacing
      const intelligentText = this.applyIntelligentSpacing(pdfData.text);

      // Step 3: Detect document structure
      const structureAnalysis = this.analyzeDocumentStructure(intelligentText);

      // Step 4: Create PowerPoint with proper layout
      const ppt = new PptxGenJS();
      const outputFilename = this.generateOutputFilename(originalFilename, inputPath);

      console.log(`🎯 [EXPERT-PDF] Document type: ${structureAnalysis.type}`);
      console.log(`📋 [EXPERT-PDF] Found ${structureAnalysis.sections.length} content sections`);

      // Step 5: Process each page with expert optimization
      for (let pageIndex = 0; pageIndex < pdfDoc.getPageCount(); pageIndex++) {
        await this.processPageWithExpertLogic(
          ppt,
          pageIndex,
          structureAnalysis,
          pdfBuffer,
          intelligentText
        );
      }

      // Step 6: Save presentation
      const outputPath = path.join(outputDir, outputFilename);
      await ppt.writeFile({ fileName: outputPath });

      console.log(`✅ [EXPERT-PDF] Conversion completed: ${outputFilename}`);
      console.log(`📊 [EXPERT-PDF] Applied ${structureAnalysis.fixes.spacingFixes} spacing fixes`);

      return outputFilename;

    } catch (error) {
      console.error('❌ [EXPERT-PDF] Conversion failed:', error);
      throw new Error(`Expert PDF conversion failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * EXPERT INTELLIGENCE: Apply intelligent spacing based on expert feedback
   * Fixes the "MalibongweMkela" -> "Malibongwe Mkela" issue
   */
  private static applyIntelligentSpacing(rawText: string): string {
    console.log('🧠 [EXPERT-SPACING] Applying intelligent spacing algorithm...');

    let spacingFixes = 0;

    // Expert Pattern 1: Insert space before capital letters in concatenated words
    let improvedText = rawText.replace(/([a-z])([A-Z])/g, (match, lower, upper) => {
      spacingFixes++;
      return `${lower} ${upper}`;
    });

    // Expert Pattern 2: Insert space between numbers and letters
    improvedText = improvedText.replace(/([0-9])([A-Za-z])/g, (match, num, letter) => {
      spacingFixes++;
      return `${num} ${letter}`;
    });

    // Expert Pattern 3: Insert space between letters and numbers
    improvedText = improvedText.replace(/([A-Za-z])([0-9])/g, (match, letter, num) => {
      spacingFixes++;
      return `${letter} ${num}`;
    });

    // Expert Pattern 4: Fix common banking document patterns
    improvedText = improvedText
      .replace(/AccountNumber/gi, 'Account Number')
      .replace(/ProofofAccount/gi, 'Proof of Account')
      .replace(/BankStatement/gi, 'Bank Statement')
      .replace(/CurrentBalance/gi, 'Current Balance');

    console.log(`✅ [EXPERT-SPACING] Applied ${spacingFixes} spacing fixes`);
    return improvedText;
  }

  /**
   * EXPERT INTELLIGENCE: Analyze document structure
   */
  private static analyzeDocumentStructure(text: string): {
    type: 'BANK_STATEMENT' | 'PROOF_OF_ACCOUNT' | 'INVOICE' | 'LETTER' | 'FORM' | 'OTHER';
    sections: Array<{
      title: string;
      content: string;
      importance: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    keyValuePairs: Array<{ key: string; value: string }>;
    fixes: { spacingFixes: number };
  } {
    // Detect document type based on content
    let docType: 'BANK_STATEMENT' | 'PROOF_OF_ACCOUNT' | 'INVOICE' | 'LETTER' | 'FORM' | 'OTHER' = 'OTHER';

    if (text.includes('Proof of Account') || text.includes('Account Number')) {
      docType = 'PROOF_OF_ACCOUNT';
    } else if (text.includes('Statement') && text.includes('Balance')) {
      docType = 'BANK_STATEMENT';
    } else if (text.includes('Invoice') || text.includes('Amount Due')) {
      docType = 'INVOICE';
    } else if (text.includes('Dear') || text.includes('Sincerely')) {
      docType = 'LETTER';
    }

    // Extract key-value pairs (expert recommendation)
    const keyValuePairs = this.extractKeyValuePairs(text);

    // Split into logical sections
    const sections = this.extractSections(text, docType);

    return {
      type: docType,
      sections,
      keyValuePairs,
      fixes: { spacingFixes: 0 } // Will be updated during processing
    };
  }

  /**
   * Extract key-value pairs from text (expert recommendation)
   */
  private static extractKeyValuePairs(text: string): Array<{ key: string; value: string }> {
    const pairs: Array<{ key: string; value: string }> = [];

    // Common banking patterns
    const patterns = [
      /Account Number[:\s]+([A-Z0-9\-\s]+)/gi,
      /Branch Code[:\s]+([0-9\-\s]+)/gi,
      /Account Type[:\s]+([A-Za-z\s]+)/gi,
      /Balance[:\s]+([R$€£¥][0-9,.\s]+)/gi,
      /Date[:\s]+([0-9\/\-\s]+)/gi,
    ];

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          pairs.push({
            key: match[0].split(/[:\s]/)[0],
            value: match[1].trim()
          });
        }
      }
    });

    return pairs;
  }

  /**
   * Extract logical sections from document
   */
  private static extractSections(text: string, docType: string): Array<{
    title: string;
    content: string;
    importance: 'HIGH' | 'MEDIUM' | 'LOW';
  }> {
    const sections = [];

    // Split by common section markers
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    let currentSection: {
      title: string;
      content: string;
      importance: 'HIGH' | 'MEDIUM' | 'LOW';
    } = {
      title: 'Document Header',
      content: '',
      importance: 'HIGH'
    };

    for (const line of lines) {
      // Detect section headers
      if (line.match(/^[A-Z\s]{3,}$/) && line.length < 50) {
        // Save previous section
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }

        // Start new section
        const importance = this.determineSectionImportance(line, docType);
        currentSection = {
          title: line.trim(),
          content: '',
          importance: importance
        };
      } else {
        currentSection.content += line + '\n';
      }
    }

    // Add final section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{
      title: 'Main Content',
      content: text,
      importance: 'HIGH' as 'HIGH' | 'MEDIUM' | 'LOW'
    }];
  }

  /**
   * Determine section importance for layout
   */
  private static determineSectionImportance(
    sectionTitle: string,
    docType: string
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    const highImportancePatterns = [
      'account', 'balance', 'amount', 'total', 'summary', 'proof'
    ];

    const titleLower = sectionTitle.toLowerCase();

    if (highImportancePatterns.some(pattern => titleLower.includes(pattern))) {
      return 'HIGH';
    }

    if (titleLower.includes('detail') || titleLower.includes('information')) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Process page with expert layout logic
   */
  private static async processPageWithExpertLogic(
    ppt: PptxGenJS,
    pageIndex: number,
    structure: any,
    pdfBuffer: Buffer,
    intelligentText: string
  ): Promise<void> {
    console.log(`🎨 [EXPERT-PDF] Processing page ${pageIndex + 1} with expert layout logic...`);

    const slide = ppt.addSlide();

    // Calculate content for this page
    const pageText = this.extractPageText(intelligentText, pageIndex, structure.sections.length);

    // Expert Layout: Create structured content areas
    if (structure.keyValuePairs.length > 0) {
      // Layout key-value pairs in a structured format
      this.addKeyValueSection(slide, structure.keyValuePairs);
    }

    // Add main content with proper formatting
    this.addMainContentSection(slide, pageText, structure.type);

    // Add page metadata
    slide.addText(`Page ${pageIndex + 1}`, {
      x: 8.5,
      y: 7,
      w: 1,
      h: 0.3,
      fontSize: 8,
      color: '666666'
    });
  }

  /**
   * Extract text for specific page
   */
  private static extractPageText(fullText: string, pageIndex: number, totalSections: number): string {
    if (totalSections <= 1) return fullText;

    const lines = fullText.split('\n');
    const linesPerPage = Math.ceil(lines.length / totalSections);
    const startLine = pageIndex * linesPerPage;
    const endLine = Math.min(startLine + linesPerPage, lines.length);

    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * Add key-value pairs in structured layout
   */
  private static addKeyValueSection(slide: any, keyValuePairs: Array<{ key: string; value: string }>): void {
    console.log(`📋 [EXPERT-PDF] Adding ${keyValuePairs.length} key-value pairs with structured layout`);

    let yPosition = 1;

    keyValuePairs.forEach((pair, index) => {
      // Key (left aligned)
      slide.addText(pair.key + ':', {
        x: 0.5,
        y: yPosition,
        w: 3,
        h: 0.5,
        fontSize: 12,
        bold: true,
        color: '333333'
      });

      // Value (right aligned)
      slide.addText(pair.value, {
        x: 4,
        y: yPosition,
        w: 5,
        h: 0.5,
        fontSize: 12,
        color: '000000'
      });

      yPosition += 0.6;
    });
  }

  /**
   * Add main content section with proper formatting
   */
  private static addMainContentSection(slide: any, text: string, docType: string): void {
    const startY = 3.5; // Below key-value section

    slide.addText(text, {
      x: 0.5,
      y: startY,
      w: 9,
      h: 3,
      fontSize: 11,
      color: '000000',
      valign: 'top',
      wrap: true
    });
  }

  /**
   * Generate output filename with expert naming
   */
  private static generateOutputFilename(originalFilename?: string, inputPath?: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const baseName = originalFilename || path.basename(inputPath || 'document', '.pdf');
    return `EXPERT_${baseName}_${timestamp}.pptx`;
  }
}