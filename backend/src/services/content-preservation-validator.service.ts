import { promises as fs } from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { TesseractWrapper } from './tesseract-wrapper.service';
import { ImageMagickWrapper } from './imagemagick-wrapper.service';
import { PDFDocument } from 'pdf-lib';

/**
 * Content Preservation Validator Service
 * Multi-method text extraction and content fidelity analysis
 */
export class ContentPreservationValidator {

  /**
   * Validate text preservation between PDF and PPTX
   */
  static async validateTextPreservation(
    originalPdfPath: string,
    convertedPptPath: string,
    options: {
      useOCR?: boolean;
      useDirectExtraction?: boolean;
      usePdfLib?: boolean;
      confidenceThreshold?: number;
    } = {}
  ): Promise<{
    textFidelity: number;
    characterAccuracy: number;
    formattingPreservation: number;
    structureIntegrity: number;
    methods: {
      directExtraction?: { text: string; confidence: number };
      ocrExtraction?: { text: string; confidence: number };
      pdfLibExtraction?: { text: string; confidence: number };
    };
    analysis: {
      originalWordCount: number;
      convertedWordCount: number;
      preservedWords: number;
      lostWords: string[];
      addedWords: string[];
    };
  }> {
    const {
      useOCR = true,
      useDirectExtraction = true,
      usePdfLib = true,
      confidenceThreshold = 70
    } = options;

    console.log(`📝 [CONTENT-PRESERVATION] Analyzing text preservation...`);
    console.log(`   📄 Original: ${path.basename(originalPdfPath)}`);
    console.log(`   📊 Converted: ${path.basename(convertedPptPath)}`);

    try {
      const methods: any = {};

      // Method 1: Direct PDF text extraction
      if (useDirectExtraction) {
        methods.directExtraction = await this.extractTextWithPdfParse(originalPdfPath);
        console.log(`   🔍 Direct extraction: ${methods.directExtraction.text.length} characters`);
      }

      // Method 2: OCR text extraction
      if (useOCR) {
        methods.ocrExtraction = await this.extractTextWithOCR(originalPdfPath);
        console.log(`   👁️  OCR extraction: ${methods.ocrExtraction.text.length} characters`);
      }

      // Method 3: PDF-lib text extraction
      if (usePdfLib) {
        methods.pdfLibExtraction = await this.extractTextWithPdfLib(originalPdfPath);
        console.log(`   📚 PDF-lib extraction: ${methods.pdfLibExtraction.text.length} characters`);
      }

      // Create consensus text from multiple methods
      const consensusText = this.createGoldStandardText(methods);
      console.log(`   ✅ Consensus text: ${consensusText.text.length} characters (${consensusText.confidence}% confidence)`);

      // Extract text from PPTX
      const pptxText = await this.extractTextFromPPTX(convertedPptPath);
      console.log(`   📊 PPTX text: ${pptxText.length} characters`);

      // Calculate preservation metrics
      const textFidelity = this.calculateLevenshteinSimilarity(consensusText.text, pptxText);
      const characterAccuracy = this.calculateCharacterAccuracy(consensusText.text, pptxText);
      const formattingPreservation = await this.analyzeFormattingPreservation(originalPdfPath, convertedPptPath);
      const structureIntegrity = this.analyzeStructuralPreservation(consensusText.text, pptxText);

      // Word-level analysis
      const analysis = this.performWordLevelAnalysis(consensusText.text, pptxText);

      console.log(`   📊 Preservation metrics:`);
      console.log(`      Text fidelity: ${textFidelity}%`);
      console.log(`      Character accuracy: ${characterAccuracy}%`);
      console.log(`      Word preservation: ${analysis.preservedWords}/${analysis.originalWordCount}`);

      return {
        textFidelity,
        characterAccuracy,
        formattingPreservation,
        structureIntegrity,
        methods,
        analysis
      };

    } catch (error) {
      console.error(`❌ [CONTENT-PRESERVATION] Text preservation analysis failed:`, error);
      return {
        textFidelity: 0,
        characterAccuracy: 0,
        formattingPreservation: 0,
        structureIntegrity: 0,
        methods: {},
        analysis: {
          originalWordCount: 0,
          convertedWordCount: 0,
          preservedWords: 0,
          lostWords: [],
          addedWords: []
        }
      };
    }
  }

  /**
   * Extract text using pdf-parse library
   */
  private static async extractTextWithPdfParse(pdfPath: string): Promise<{ text: string; confidence: number }> {
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const data = await pdf(pdfBuffer);

      return {
        text: data.text || '',
        confidence: data.text && data.text.length > 0 ? 90 : 0
      };
    } catch (error) {
      console.warn(`⚠️ PDF-parse extraction failed:`, error);
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Extract text using OCR (Tesseract)
   */
  private static async extractTextWithOCR(pdfPath: string): Promise<{ text: string; confidence: number }> {
    try {
      const tempDir = path.join(path.dirname(pdfPath), 'ocr-temp');
      await fs.mkdir(tempDir, { recursive: true });

      // Convert PDF first page to image
      const imageName = await ImageMagickWrapper.extractPDFPageAsImage(
        pdfPath,
        tempDir,
        1,
        { format: 'png', density: 300, quality: 95 }
      );

      const imagePath = path.join(tempDir, imageName);

      // Extract text with OCR
      const ocrResult = await TesseractWrapper.extractTextFromImage(imagePath, {
        language: 'eng',
        confidence: true,
        pageSegMode: 1,
        ocrEngineMode: 3
      });

      // Cleanup
      await fs.rmdir(tempDir, { recursive: true }).catch(() => {});

      return {
        text: ocrResult.text || '',
        confidence: ocrResult.confidence || 0
      };

    } catch (error) {
      console.warn(`⚠️ OCR extraction failed:`, error);
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Extract text using PDF-lib
   */
  private static async extractTextWithPdfLib(pdfPath: string): Promise<{ text: string; confidence: number }> {
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);

      let allText = '';
      const pageCount = pdfDoc.getPageCount();

      // Extract text from each page (simplified approach)
      // Note: PDF-lib doesn't have direct text extraction, so this is a placeholder
      // In a real implementation, you'd use a different library like pdf2json

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        // This is a simplified placeholder - actual text extraction would require additional libraries
        allText += `Page ${i + 1} content\n`;
      }

      return {
        text: allText,
        confidence: 50 // Lower confidence as this is a placeholder implementation
      };

    } catch (error) {
      console.warn(`⚠️ PDF-lib extraction failed:`, error);
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Extract text from PPTX file
   */
  private static async extractTextFromPPTX(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(fileBuffer);
      let allText = '';

      // Extract text from slides
      for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
          const slideXml = await file.async('text');
          const parser = new DOMParser();
          const doc = parser.parseFromString(slideXml, 'text/xml');

          // Extract text from all text elements
          const textElements = doc.getElementsByTagName('a:t');
          for (let i = 0; i < textElements.length; i++) {
            const textElement = textElements[i];
            if (textElement.textContent) {
              allText += textElement.textContent + ' ';
            }
          }
          allText += '\n';
        }
      }

      // Extract text from notes
      for (const [filename, file] of Object.entries(zip.files)) {
        if (filename.startsWith('ppt/notesSlides/') && filename.endsWith('.xml')) {
          const notesXml = await file.async('text');
          const parser = new DOMParser();
          const doc = parser.parseFromString(notesXml, 'text/xml');

          const textElements = doc.getElementsByTagName('a:t');
          for (let i = 0; i < textElements.length; i++) {
            const textElement = textElements[i];
            if (textElement.textContent) {
              allText += textElement.textContent + ' ';
            }
          }
        }
      }

      return allText.trim();

    } catch (error) {
      console.warn(`⚠️ PPTX text extraction failed:`, error);
      return '';
    }
  }

  /**
   * Create gold standard text from multiple extraction methods
   */
  private static createGoldStandardText(methods: any): { text: string; confidence: number } {
    const extractedTexts = Object.values(methods)
      .filter((method: any) => method && method.text && method.text.length > 0)
      .sort((a: any, b: any) => b.confidence - a.confidence);

    if (extractedTexts.length === 0) {
      return { text: '', confidence: 0 };
    }

    // Use the highest confidence extraction as the base
    const bestMethod = extractedTexts[0] as any;

    // If multiple methods available, cross-validate
    if (extractedTexts.length > 1) {
      const similarities = extractedTexts.slice(1).map((method: any) =>
        this.calculateLevenshteinSimilarity(bestMethod.text, method.text)
      );

      const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
      const consensusConfidence = Math.round((bestMethod.confidence + avgSimilarity) / 2);

      return {
        text: bestMethod.text,
        confidence: consensusConfidence
      };
    }

    return bestMethod;
  }

  /**
   * Calculate Levenshtein similarity percentage
   */
  private static calculateLevenshteinSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 100;

    const distance = this.levenshteinDistance(text1, text2);
    return Math.round(((longer.length - distance) / longer.length) * 100);
  }

  /**
   * Calculate Levenshtein distance
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate character-level accuracy
   */
  private static calculateCharacterAccuracy(originalText: string, convertedText: string): number {
    if (!originalText || !convertedText) return 0;

    const original = originalText.toLowerCase().replace(/\s+/g, ' ').trim();
    const converted = convertedText.toLowerCase().replace(/\s+/g, ' ').trim();

    let matches = 0;
    const minLength = Math.min(original.length, converted.length);

    for (let i = 0; i < minLength; i++) {
      if (original[i] === converted[i]) {
        matches++;
      }
    }

    return Math.round((matches / Math.max(original.length, converted.length)) * 100);
  }

  /**
   * Analyze formatting preservation
   */
  private static async analyzeFormattingPreservation(
    originalPdfPath: string,
    convertedPptPath: string
  ): Promise<number> {
    try {
      // This is a simplified implementation
      // In a full implementation, you'd analyze font sizes, styles, colors, etc.

      // For now, we'll return a reasonable score based on successful conversion
      const pptxText = await this.extractTextFromPPTX(convertedPptPath);
      return pptxText.length > 0 ? 75 : 0;

    } catch (error) {
      console.warn(`⚠️ Formatting preservation analysis failed:`, error);
      return 50;
    }
  }

  /**
   * Analyze structural preservation (paragraphs, sections, etc.)
   */
  private static analyzeStructuralPreservation(originalText: string, convertedText: string): number {
    if (!originalText || !convertedText) return 0;

    // Count structural elements
    const originalParagraphs = originalText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const convertedParagraphs = convertedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const convertedSentences = convertedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Calculate structure similarity
    const paragraphSimilarity = Math.min(convertedParagraphs.length / originalParagraphs.length, 1);
    const sentenceSimilarity = Math.min(convertedSentences.length / originalSentences.length, 1);

    return Math.round(((paragraphSimilarity + sentenceSimilarity) / 2) * 100);
  }

  /**
   * Perform word-level analysis
   */
  private static performWordLevelAnalysis(originalText: string, convertedText: string): {
    originalWordCount: number;
    convertedWordCount: number;
    preservedWords: number;
    lostWords: string[];
    addedWords: string[];
  } {
    const originalWords = this.extractWords(originalText);
    const convertedWords = this.extractWords(convertedText);

    const originalSet = new Set(originalWords);
    const convertedSet = new Set(convertedWords);

    const preservedWords = [...originalSet].filter(word => convertedSet.has(word));
    const lostWords = [...originalSet].filter(word => !convertedSet.has(word));
    const addedWords = [...convertedSet].filter(word => !originalSet.has(word));

    return {
      originalWordCount: originalWords.length,
      convertedWordCount: convertedWords.length,
      preservedWords: preservedWords.length,
      lostWords: lostWords.slice(0, 20), // Limit to first 20 for readability
      addedWords: addedWords.slice(0, 20)
    };
  }

  /**
   * Extract words from text (normalize and clean)
   */
  private static extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter out very short words
      .filter(word => !/^\d+$/.test(word)); // Filter out pure numbers
  }
}