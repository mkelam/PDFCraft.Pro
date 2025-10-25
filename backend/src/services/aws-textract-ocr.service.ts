import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * AWS Textract OCR Service
 * Cloud OCR integration with AWS Textract
 * Phase 3 Cloud Integration - Week 3 Tuesday-Wednesday
 */
export class AWSTextractOCRService {

  private static readonly PRICING = {
    DETECT_DOCUMENT_TEXT: 0.0015,    // $1.50 per 1000 pages
    ANALYZE_DOCUMENT: 0.065,         // $65.00 per 1000 pages
    ANALYZE_EXPENSE: 0.065,          // $65.00 per 1000 pages
    ANALYZE_ID: 0.065,               // $65.00 per 1000 pages
    QUERIES: 0.065                   // $65.00 per 1000 pages + $0.065 per query
  };

  private static readonly RATE_LIMITS = {
    SYNCHRONOUS_OPERATIONS: 5,       // 5 TPS for sync operations
    ASYNCHRONOUS_OPERATIONS: 2,      // 2 TPS for async operations
    MAX_FILE_SIZE_SYNC: 10 * 1024 * 1024,    // 10MB for sync
    MAX_FILE_SIZE_ASYNC: 500 * 1024 * 1024,  // 500MB for async
    MAX_PAGES_SYNC: 3000,            // 3000 pages max for sync
    MAX_PAGES_ASYNC: 3000            // 3000 pages max for async
  };

  private static readonly SUPPORTED_FORMATS = [
    'image/png', 'image/jpeg', 'image/tiff', 'application/pdf'
  ];

  private static readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.90,
    MEDIUM: 0.75,
    LOW: 0.60
  };

  /**
   * Check if AWS Textract is available and configured
   */
  static async isAvailable(): Promise<{
    available: boolean;
    error?: string;
    configuration?: {
      hasCredentials: boolean;
      region: string;
      serviceStatus: string;
    };
  }> {
    try {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region = process.env.AWS_REGION || 'us-east-1';

      if (!accessKeyId || !secretAccessKey) {
        return {
          available: false,
          error: 'AWS credentials not configured'
        };
      }

      // Test connectivity with a minimal service call
      const testResponse = await this.testConnectivity(region);

      return {
        available: testResponse.success,
        error: testResponse.error,
        configuration: {
          hasCredentials: true,
          region,
          serviceStatus: testResponse.serviceStatus || 'active'
        }
      };

    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown configuration error'
      };
    }
  }

  /**
   * Extract text using AWS Textract DetectDocumentText (basic OCR)
   */
  static async extractText(
    imagePath: string,
    options: {
      analysisType?: 'DETECT_DOCUMENT_TEXT' | 'ANALYZE_DOCUMENT' | 'ANALYZE_EXPENSE' | 'ANALYZE_ID';
      includeConfidence?: boolean;
      extractTables?: boolean;
      extractForms?: boolean;
      queries?: string[];
      timeout?: number;
    } = {}
  ): Promise<{
    text: string;
    confidence: number;
    detailedResults: any;
    processingTime: number;
    cost: number;
    metadata: {
      pages: number;
      blocks: number;
      words: number;
      lines: number;
      tables?: any[];
      forms?: any[];
      queries?: any[];
    };
  }> {
    const startTime = Date.now();
    const analysisType = options.analysisType || 'DETECT_DOCUMENT_TEXT';

    console.log(`⚡ [AWS-TEXTRACT] Processing with ${analysisType}: ${path.basename(imagePath)}`);

    try {
      // Validate file and determine processing approach
      const fileInfo = await this.validateAndPrepareFile(imagePath);

      // Choose sync vs async based on file size
      const useAsync = fileInfo.size > this.RATE_LIMITS.MAX_FILE_SIZE_SYNC;

      let result;
      if (useAsync) {
        result = await this.processAsynchronously(imagePath, analysisType, options);
      } else {
        result = await this.processSynchronously(imagePath, analysisType, options);
      }

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(analysisType, 1, options.queries?.length);

      console.log(`✅ [AWS-TEXTRACT] Extraction completed in ${processingTime}ms (cost: $${cost.toFixed(4)})`);

      return {
        text: result.text,
        confidence: result.confidence,
        detailedResults: result.detailedResults,
        processingTime,
        cost,
        metadata: result.metadata
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [AWS-TEXTRACT] Extraction failed after ${processingTime}ms:`, error);

      throw new Error(`AWS Textract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze document with advanced features (tables, forms, queries)
   */
  static async analyzeDocument(
    imagePath: string,
    options: {
      extractTables?: boolean;
      extractForms?: boolean;
      queries?: string[];
      includeConfidence?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{
    text: string;
    tables: any[];
    forms: any[];
    queries: any[];
    confidence: number;
    processingTime: number;
    cost: number;
    insights: {
      documentType: 'invoice' | 'receipt' | 'form' | 'report' | 'mixed';
      keyValuePairs: number;
      tableCount: number;
      extractionQuality: 'high' | 'medium' | 'low';
    };
  }> {
    const startTime = Date.now();

    console.log(`📊 [AWS-TEXTRACT] Analyzing document with advanced features: ${path.basename(imagePath)}`);

    try {
      // Use ANALYZE_DOCUMENT for advanced features
      const result = await this.extractText(imagePath, {
        analysisType: 'ANALYZE_DOCUMENT',
        extractTables: options.extractTables,
        extractForms: options.extractForms,
        queries: options.queries,
        includeConfidence: options.includeConfidence,
        timeout: options.timeout
      });

      // Extract structured data
      const tables = this.extractTables(result.detailedResults);
      const forms = this.extractForms(result.detailedResults);
      const queries = this.extractQueries(result.detailedResults, options.queries);

      // Generate insights
      const insights = this.generateDocumentInsights(result.detailedResults, tables, forms);

      const processingTime = Date.now() - startTime;

      console.log(`✅ [AWS-TEXTRACT] Analysis completed: ${tables.length} tables, ${forms.length} forms (${processingTime}ms)`);

      return {
        text: result.text,
        tables,
        forms,
        queries,
        confidence: result.confidence,
        processingTime,
        cost: result.cost,
        insights
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [AWS-TEXTRACT] Analysis failed after ${processingTime}ms:`, error);

      throw error;
    }
  }

  /**
   * Process expense documents (receipts, invoices)
   */
  static async analyzeExpense(
    imagePath: string,
    options: {
      includeConfidence?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{
    text: string;
    expenseDocuments: any[];
    lineItems: any[];
    summaryFields: any[];
    confidence: number;
    processingTime: number;
    cost: number;
    insights: {
      totalAmount?: number;
      taxAmount?: number;
      vendor?: string;
      date?: string;
      documentType: 'receipt' | 'invoice' | 'unknown';
    };
  }> {
    const startTime = Date.now();

    console.log(`💰 [AWS-TEXTRACT] Analyzing expense document: ${path.basename(imagePath)}`);

    try {
      const result = await this.extractText(imagePath, {
        analysisType: 'ANALYZE_EXPENSE',
        includeConfidence: options.includeConfidence,
        timeout: options.timeout
      });

      // Extract expense-specific data
      const expenseData = this.extractExpenseData(result.detailedResults);
      const insights = this.generateExpenseInsights(expenseData);

      const processingTime = Date.now() - startTime;

      console.log(`✅ [AWS-TEXTRACT] Expense analysis completed (${processingTime}ms)`);

      return {
        text: result.text,
        expenseDocuments: expenseData.documents,
        lineItems: expenseData.lineItems,
        summaryFields: expenseData.summaryFields,
        confidence: result.confidence,
        processingTime,
        cost: result.cost,
        insights
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ [AWS-TEXTRACT] Expense analysis failed after ${processingTime}ms:`, error);

      throw error;
    }
  }

  /**
   * Process synchronously (files < 10MB)
   */
  private static async processSynchronously(
    imagePath: string,
    analysisType: string,
    options: any
  ): Promise<any> {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Create AWS API request
    const request = this.createTextractRequest(analysisType, { Bytes: base64Image }, options);

    // Make API call
    const response = await this.makeTextractAPICall(request, options.timeout);

    // Process response
    return this.processTextractResponse(response, analysisType);
  }

  /**
   * Process asynchronously (files > 10MB)
   */
  private static async processAsynchronously(
    imagePath: string,
    analysisType: string,
    options: any
  ): Promise<any> {
    // For async processing, we would typically:
    // 1. Upload file to S3
    // 2. Start async job
    // 3. Poll for completion
    // 4. Retrieve results

    // For now, throw error as async processing requires S3 setup
    throw new Error('Asynchronous processing requires S3 configuration - file too large for synchronous processing');
  }

  /**
   * Create Textract API request
   */
  private static createTextractRequest(analysisType: string, document: any, options: any): any {
    const baseRequest = {
      Document: document
    };

    switch (analysisType) {
      case 'DETECT_DOCUMENT_TEXT':
        return baseRequest;

      case 'ANALYZE_DOCUMENT':
        return {
          ...baseRequest,
          FeatureTypes: [
            ...(options.extractTables ? ['TABLES'] : []),
            ...(options.extractForms ? ['FORMS'] : []),
            ...(options.queries ? ['QUERIES'] : [])
          ].filter(Boolean),
          QueriesConfig: options.queries ? {
            Queries: options.queries.map((query: string) => ({ Text: query }))
          } : undefined
        };

      case 'ANALYZE_EXPENSE':
        return baseRequest;

      case 'ANALYZE_ID':
        return baseRequest;

      default:
        return baseRequest;
    }
  }

  /**
   * Make Textract API call (mock implementation)
   */
  private static async makeTextractAPICall(request: any, timeout: number = 30000): Promise<any> {
    // This would normally use AWS SDK
    // For now, return mock response structure
    await this.delay(Math.random() * 2000 + 1000); // Simulate API call

    return {
      Blocks: [
        {
          BlockType: 'PAGE',
          Id: 'page-1',
          Confidence: 99.5,
          Geometry: { BoundingBox: { Width: 1, Height: 1, Left: 0, Top: 0 } }
        },
        {
          BlockType: 'LINE',
          Id: 'line-1',
          Text: 'Sample extracted text from AWS Textract',
          Confidence: 95.2,
          Geometry: { BoundingBox: { Width: 0.8, Height: 0.05, Left: 0.1, Top: 0.1 } }
        },
        {
          BlockType: 'WORD',
          Id: 'word-1',
          Text: 'Sample',
          Confidence: 96.1,
          Geometry: { BoundingBox: { Width: 0.15, Height: 0.05, Left: 0.1, Top: 0.1 } }
        }
      ],
      DocumentMetadata: {
        Pages: 1
      }
    };
  }

  /**
   * Process Textract response
   */
  private static processTextractResponse(response: any, analysisType: string): any {
    const blocks = response.Blocks || [];
    let text = '';
    let confidence = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    // Extract text and calculate average confidence
    const textBlocks = blocks.filter((block: any) => block.BlockType === 'LINE');

    for (const block of textBlocks) {
      if (block.Text) {
        text += block.Text + '\n';
      }
      if (block.Confidence) {
        totalConfidence += block.Confidence;
        confidenceCount++;
      }
    }

    confidence = confidenceCount > 0 ? totalConfidence / confidenceCount / 100 : 0.8;
    text = text.trim();

    // Count different block types for metadata
    const metadata = {
      pages: response.DocumentMetadata?.Pages || 1,
      blocks: blocks.length,
      words: blocks.filter((b: any) => b.BlockType === 'WORD').length,
      lines: blocks.filter((b: any) => b.BlockType === 'LINE').length,
      tables: blocks.filter((b: any) => b.BlockType === 'TABLE'),
      forms: blocks.filter((b: any) => b.BlockType === 'KEY_VALUE_SET')
    };

    return {
      text,
      confidence,
      detailedResults: response,
      metadata
    };
  }

  /**
   * Extract tables from Textract response
   */
  private static extractTables(response: any): any[] {
    const blocks = response.Blocks || [];
    const tables = blocks.filter((block: any) => block.BlockType === 'TABLE');

    return tables.map((table: any) => ({
      id: table.Id,
      confidence: table.Confidence / 100,
      rowCount: table.RowCount || 0,
      columnCount: table.ColumnCount || 0,
      cells: this.extractTableCells(blocks, table)
    }));
  }

  /**
   * Extract forms from Textract response
   */
  private static extractForms(response: any): any[] {
    const blocks = response.Blocks || [];
    const keyValueSets = blocks.filter((block: any) => block.BlockType === 'KEY_VALUE_SET');

    const forms: any[] = [];
    const processedKeys = new Set();

    keyValueSets.forEach((kvSet: any) => {
      if (kvSet.EntityTypes?.includes('KEY') && !processedKeys.has(kvSet.Id)) {
        const valueBlock = this.findRelatedValue(blocks, kvSet);

        forms.push({
          key: this.extractTextFromBlock(blocks, kvSet),
          value: valueBlock ? this.extractTextFromBlock(blocks, valueBlock) : '',
          confidence: Math.min(kvSet.Confidence || 0, valueBlock?.Confidence || 0) / 100
        });

        processedKeys.add(kvSet.Id);
      }
    });

    return forms;
  }

  /**
   * Extract query results from Textract response
   */
  private static extractQueries(response: any, queries?: string[]): any[] {
    if (!queries) return [];

    const blocks = response.Blocks || [];
    const queryBlocks = blocks.filter((block: any) => block.BlockType === 'QUERY');

    return queryBlocks.map((query: any) => ({
      query: query.Query?.Text || '',
      answer: query.Query?.Alias || '',
      confidence: query.Confidence / 100
    }));
  }

  /**
   * Generate document insights
   */
  private static generateDocumentInsights(response: any, tables: any[], forms: any[]): any {
    const blocks = response.Blocks || [];
    const lines = blocks.filter((block: any) => block.BlockType === 'LINE');

    // Simple heuristics for document type classification
    let documentType = 'mixed';
    const text = lines.map((line: any) => line.Text?.toLowerCase() || '').join(' ');

    if (text.includes('invoice') || text.includes('bill')) {
      documentType = 'invoice';
    } else if (text.includes('receipt')) {
      documentType = 'receipt';
    } else if (forms.length > 5) {
      documentType = 'form';
    } else if (tables.length > 0) {
      documentType = 'report';
    }

    // Calculate extraction quality
    const avgConfidence = lines.reduce((sum: number, line: any) =>
      sum + (line.Confidence || 0), 0) / lines.length / 100;

    let extractionQuality: 'high' | 'medium' | 'low' = 'low';
    if (avgConfidence > 0.9) extractionQuality = 'high';
    else if (avgConfidence > 0.75) extractionQuality = 'medium';

    return {
      documentType,
      keyValuePairs: forms.length,
      tableCount: tables.length,
      extractionQuality
    };
  }

  /**
   * Helper methods
   */
  private static async validateAndPrepareFile(imagePath: string): Promise<{ size: number; format: string }> {
    const stats = await fs.stat(imagePath);
    const ext = path.extname(imagePath).toLowerCase();

    const formatMap: { [key: string]: string } = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.pdf': 'application/pdf'
    };

    const format = formatMap[ext];
    if (!format || !this.SUPPORTED_FORMATS.includes(format)) {
      throw new Error(`Unsupported file format: ${ext}`);
    }

    if (stats.size > this.RATE_LIMITS.MAX_FILE_SIZE_ASYNC) {
      throw new Error(`File size ${stats.size} exceeds maximum allowed size`);
    }

    return { size: stats.size, format };
  }

  private static calculateCost(analysisType: string, pageCount: number, queryCount: number = 0): number {
    let baseCost = 0;

    switch (analysisType) {
      case 'DETECT_DOCUMENT_TEXT':
        baseCost = pageCount * this.PRICING.DETECT_DOCUMENT_TEXT;
        break;
      case 'ANALYZE_DOCUMENT':
        baseCost = pageCount * this.PRICING.ANALYZE_DOCUMENT;
        break;
      case 'ANALYZE_EXPENSE':
        baseCost = pageCount * this.PRICING.ANALYZE_EXPENSE;
        break;
      case 'ANALYZE_ID':
        baseCost = pageCount * this.PRICING.ANALYZE_ID;
        break;
    }

    // Add query costs
    if (queryCount > 0) {
      baseCost += queryCount * this.PRICING.QUERIES;
    }

    return baseCost;
  }

  private static async testConnectivity(region: string): Promise<{
    success: boolean;
    error?: string;
    serviceStatus?: string;
  }> {
    try {
      // Mock connectivity test
      await this.delay(500);

      return {
        success: true,
        serviceStatus: 'active'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Additional helper methods for table and form extraction
  private static extractTableCells(blocks: any[], table: any): any[] {
    // Simplified table cell extraction
    return [];
  }

  private static findRelatedValue(blocks: any[], keyBlock: any): any | null {
    // Find the corresponding VALUE block for a KEY block
    const relationships = keyBlock.Relationships || [];
    const valueRelation = relationships.find((rel: any) => rel.Type === 'VALUE');

    if (valueRelation && valueRelation.Ids) {
      return blocks.find((block: any) => valueRelation.Ids.includes(block.Id));
    }

    return null;
  }

  private static extractTextFromBlock(blocks: any[], block: any): string {
    // Extract text from a block using its relationships
    const relationships = block.Relationships || [];
    const childRelation = relationships.find((rel: any) => rel.Type === 'CHILD');

    if (childRelation && childRelation.Ids) {
      const childBlocks = blocks.filter((b: any) => childRelation.Ids.includes(b.Id));
      return childBlocks.map((b: any) => b.Text || '').join('');
    }

    return block.Text || '';
  }

  private static extractExpenseData(response: any): any {
    // Extract expense-specific data from Textract response
    return {
      documents: [],
      lineItems: [],
      summaryFields: []
    };
  }

  private static generateExpenseInsights(expenseData: any): any {
    return {
      documentType: 'unknown'
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}