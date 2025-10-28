import { promises as fs } from 'fs';
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';
import { ExtractedImage } from './pdf-image-extraction.service';
import { VectorPath, ExtractedVectorGraphics } from './vector-graphics-extractor.service';

export interface LayoutRegion {
  id: string;
  type: 'header' | 'footer' | 'sidebar' | 'content' | 'column' | 'table' | 'figure' | 'caption';
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
  elements: LayoutElement[];
  zIndex: number;
}

export interface LayoutElement {
  id: string;
  type: 'text' | 'image' | 'vector' | 'table' | 'list' | 'heading' | 'paragraph' | 'figure';
  bounds: { x: number; y: number; width: number; height: number };
  content?: string;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textColor?: string;
    backgroundColor?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  };
  hierarchy?: number; // For headings (1-6)
  listLevel?: number; // For list items
  tableData?: TableStructure;
  imageData?: ExtractedImage;
  vectorData?: VectorPath;
}

export interface TableStructure {
  rows: number;
  columns: number;
  cells: TableCell[][];
  headers?: TableCell[];
  hasHeaderRow: boolean;
  hasHeaderColumn: boolean;
}

export interface TableCell {
  content: string;
  bounds: { x: number; y: number; width: number; height: number };
  style?: {
    fontSize?: number;
    fontWeight?: string;
    textAlign?: string;
    backgroundColor?: string;
    borderStyle?: string;
  };
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

export interface ColumnLayout {
  columns: number;
  columnWidth: number;
  gutterWidth: number;
  columnBounds: Array<{ x: number; y: number; width: number; height: number }>;
  textFlow: TextFlowRegion[];
}

export interface TextFlowRegion {
  columnIndex: number;
  textBlocks: LayoutElement[];
  readingOrder: number;
}

export interface DocumentStructure {
  pageNumber: number;
  documentType: 'article' | 'presentation' | 'report' | 'brochure' | 'form' | 'manual' | 'mixed';
  layout: 'single-column' | 'multi-column' | 'grid' | 'freeform' | 'presentation';
  regions: LayoutRegion[];
  columnLayout?: ColumnLayout;
  readingOrder: string[]; // Array of element IDs in reading order
  hierarchy: HierarchyNode[];
  pageMargins: { top: number; right: number; bottom: number; left: number };
}

export interface HierarchyNode {
  elementId: string;
  level: number;
  parent?: string;
  children: string[];
  type: 'heading' | 'section' | 'subsection' | 'paragraph' | 'list' | 'figure';
}

/**
 * ADVANCED LAYOUT ANALYZER SERVICE
 *
 * Phase 3 Enhancement - Intelligent document layout analysis
 *
 * Capabilities:
 * - Multi-column text detection and flow analysis
 * - Table structure recognition and preservation
 * - Document hierarchy extraction (headings, sections)
 * - Reading order determination
 * - Header/footer detection
 * - Figure and caption association
 * - Grid-based layout analysis
 */
export class AdvancedLayoutAnalyzerService {

  // Layout detection thresholds
  private static readonly LAYOUT_THRESHOLDS = {
    COLUMN_GAP_MIN: 20, // Minimum gap between columns
    HEADER_HEIGHT_MAX: 72, // Maximum header height (1 inch)
    FOOTER_HEIGHT_MAX: 72, // Maximum footer height (1 inch)
    SIDEBAR_WIDTH_MIN: 100, // Minimum sidebar width
    TABLE_CELL_ALIGNMENT_TOLERANCE: 5, // Pixel tolerance for table alignment
    READING_ORDER_Y_TOLERANCE: 10, // Y-coordinate tolerance for reading order
    HIERARCHY_FONT_SIZE_RATIO: 1.2 // Minimum font size ratio for hierarchy levels
  };

  /**
   * Analyze page layout and structure
   */
  static async analyzePageLayout(
    pdfPath: string,
    pageNumber: number,
    extractedImages: ExtractedImage[] = [],
    vectorGraphics?: ExtractedVectorGraphics
  ): Promise<DocumentStructure> {
    console.log(`🔍 [LAYOUT-ANALYZE] Analyzing layout for page ${pageNumber + 1}...`);

    try {
      // Extract basic page information
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfDocument = await PDFDocument.load(pdfBuffer);
      const pdfData = await pdf(pdfBuffer);
      const pages = pdfDocument.getPages();

      if (pageNumber >= pages.length) {
        throw new Error(`Page ${pageNumber + 1} does not exist`);
      }

      const page = pages[pageNumber];
      const { width, height } = page.getSize();

      // Extract text with positioning information
      const textElements = await this.extractPositionedText(pdfData, pageNumber, width, height);

      // Detect layout regions
      const regions = await this.detectLayoutRegions(textElements, extractedImages, width, height, vectorGraphics);

      // Analyze column layout
      const columnLayout = this.analyzeColumnLayout(textElements, width, height);

      // Determine document type and layout style
      const documentType = this.determineDocumentType(regions, textElements);
      const layout = this.determineLayoutStyle(columnLayout, regions);

      // Establish reading order
      const readingOrder = this.determineReadingOrder(regions, columnLayout);

      // Build document hierarchy
      const hierarchy = this.buildDocumentHierarchy(textElements, regions);

      // Calculate page margins
      const pageMargins = this.calculatePageMargins(textElements, width, height);

      console.log(`✅ [LAYOUT-ANALYZE] Analysis complete: ${layout} layout, ${columnLayout?.columns || 1} columns, ${regions.length} regions`);

      return {
        pageNumber,
        documentType,
        layout,
        regions,
        columnLayout,
        readingOrder,
        hierarchy,
        pageMargins
      };

    } catch (error) {
      console.error(`❌ [LAYOUT-ANALYZE] Analysis failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Extract positioned text elements from PDF
   */
  private static async extractPositionedText(
    pdfData: any,
    pageNumber: number,
    pageWidth: number,
    pageHeight: number
  ): Promise<LayoutElement[]> {
    console.log(`📝 [TEXT-EXTRACT] Extracting positioned text elements...`);

    try {
      // This is a simplified implementation
      // In a production system, this would use more sophisticated PDF text extraction
      const textElements: LayoutElement[] = [];

      const text = pdfData.text || '';
      const lines = text.split('\n').filter(line => line.trim());

      let elementId = 0;
      let currentY = pageHeight - 50; // Start near top of page

      for (const line of lines) {
        if (line.trim()) {
          // Estimate text dimensions (simplified)
          const fontSize = this.estimateFontSize(line);
          const textWidth = line.length * fontSize * 0.6; // Rough estimate
          const textHeight = fontSize * 1.2;

          // Estimate position (simplified - would need actual text positioning from PDF)
          const x = 50; // Default left margin
          const y = currentY;

          const element: LayoutElement = {
            id: `text_${++elementId}`,
            type: this.classifyTextType(line, fontSize),
            bounds: { x, y, width: textWidth, height: textHeight },
            content: line,
            style: {
              fontSize,
              fontFamily: 'Arial', // Default
              alignment: 'left'
            },
            hierarchy: this.determineTextHierarchy(line, fontSize)
          };

          textElements.push(element);
          currentY -= textHeight + 5; // Move down for next line
        }
      }

      console.log(`✅ [TEXT-EXTRACT] Extracted ${textElements.length} text elements`);
      return textElements;

    } catch (error) {
      console.error(`❌ [TEXT-EXTRACT] Text extraction failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Detect layout regions (header, footer, columns, etc.)
   */
  private static async detectLayoutRegions(
    textElements: LayoutElement[],
    images: ExtractedImage[],
    pageWidth: number,
    pageHeight: number,
    vectorGraphics?: ExtractedVectorGraphics
  ): Promise<LayoutRegion[]> {
    console.log(`🔍 [REGION-DETECT] Detecting layout regions...`);

    const regions: LayoutRegion[] = [];
    let regionId = 0;

    // Detect header region
    const headerElements = textElements.filter(el =>
      el.bounds.y > pageHeight - this.LAYOUT_THRESHOLDS.HEADER_HEIGHT_MAX
    );

    if (headerElements.length > 0) {
      regions.push({
        id: `header_${++regionId}`,
        type: 'header',
        bounds: this.calculateBoundingBox(headerElements),
        confidence: 0.8,
        elements: headerElements,
        zIndex: 10
      });
    }

    // Detect footer region
    const footerElements = textElements.filter(el =>
      el.bounds.y < this.LAYOUT_THRESHOLDS.FOOTER_HEIGHT_MAX
    );

    if (footerElements.length > 0) {
      regions.push({
        id: `footer_${++regionId}`,
        type: 'footer',
        bounds: this.calculateBoundingBox(footerElements),
        confidence: 0.8,
        elements: footerElements,
        zIndex: 10
      });
    }

    // Detect content regions (excluding header/footer)
    const contentElements = textElements.filter(el =>
      el.bounds.y <= pageHeight - this.LAYOUT_THRESHOLDS.HEADER_HEIGHT_MAX &&
      el.bounds.y >= this.LAYOUT_THRESHOLDS.FOOTER_HEIGHT_MAX
    );

    if (contentElements.length > 0) {
      // Group content into columns or sections
      const contentRegions = this.groupElementsIntoRegions(contentElements, pageWidth);

      for (const region of contentRegions) {
        regions.push({
          id: `content_${++regionId}`,
          type: 'content',
          bounds: region.bounds,
          confidence: region.confidence,
          elements: region.elements,
          zIndex: 5
        });
      }
    }

    // Add image regions
    for (const image of images) {
      regions.push({
        id: `image_${++regionId}`,
        type: 'figure',
        bounds: { x: image.x, y: image.y, width: image.width, height: image.height },
        confidence: 0.9,
        elements: [{
          id: `img_${image.x}_${image.y}`,
          type: 'image',
          bounds: { x: image.x, y: image.y, width: image.width, height: image.height },
          imageData: image
        }],
        zIndex: 7
      });
    }

    // Detect table regions
    const tableRegions = this.detectTableRegions(contentElements);
    regions.push(...tableRegions);

    console.log(`✅ [REGION-DETECT] Detected ${regions.length} layout regions`);
    return regions;
  }

  /**
   * Analyze column layout
   */
  private static analyzeColumnLayout(
    textElements: LayoutElement[],
    pageWidth: number,
    pageHeight: number
  ): ColumnLayout | undefined {
    console.log(`📊 [COLUMN-ANALYZE] Analyzing column layout...`);

    try {
      // Find vertical gaps that might indicate column separations
      const xPositions = textElements.map(el => el.bounds.x).sort((a, b) => a - b);
      const gaps: number[] = [];

      for (let i = 1; i < xPositions.length; i++) {
        const gap = xPositions[i] - xPositions[i - 1];
        if (gap > this.LAYOUT_THRESHOLDS.COLUMN_GAP_MIN) {
          gaps.push(xPositions[i - 1]);
        }
      }

      // Determine number of columns
      const columns = gaps.length + 1;

      if (columns === 1) {
        return undefined; // Single column layout
      }

      // Calculate column bounds
      const columnBounds = this.calculateColumnBounds(gaps, pageWidth, pageHeight);
      const columnWidth = columnBounds[0]?.width || 0;
      const gutterWidth = gaps.length > 0 ?
        Math.min(...gaps.map((gap, i) => (columnBounds[i + 1]?.x || pageWidth) - gap)) : 0;

      // Assign text elements to columns and determine flow
      const textFlow = this.analyzeTextFlow(textElements, columnBounds);

      console.log(`✅ [COLUMN-ANALYZE] Detected ${columns}-column layout`);

      return {
        columns,
        columnWidth,
        gutterWidth,
        columnBounds,
        textFlow
      };

    } catch (error) {
      console.error(`❌ [COLUMN-ANALYZE] Column analysis failed:`, error instanceof Error ? error.message : error);
      return undefined;
    }
  }

  /**
   * Detect table regions and structure
   */
  private static detectTableRegions(textElements: LayoutElement[]): LayoutRegion[] {
    console.log(`📋 [TABLE-DETECT] Detecting table structures...`);

    const tableRegions: LayoutRegion[] = [];

    try {
      // Group elements by vertical alignment (potential table rows)
      const rowGroups = this.groupElementsByVerticalAlignment(textElements);

      // Find groups that might be tables (multiple aligned rows)
      for (const group of rowGroups) {
        if (group.length >= 3) { // At least 3 rows for a table
          const tableStructure = this.analyzeTableStructure([group]); // Wrap single group in array

          if (tableStructure && tableStructure.rows >= 2 && tableStructure.columns >= 2) {
            const tableBounds = this.calculateBoundingBox(group);

            tableRegions.push({
              id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'table',
              bounds: tableBounds,
              confidence: 0.7,
              elements: group.map(row => ({
                id: `table_element_${Math.random().toString(36).substr(2, 9)}`,
                type: 'table',
                bounds: this.calculateBoundingBox([row]), // Wrap single element in array
                tableData: tableStructure
              })),
              zIndex: 6
            });
          }
        }
      }

      console.log(`✅ [TABLE-DETECT] Detected ${tableRegions.length} table regions`);

    } catch (error) {
      console.error(`❌ [TABLE-DETECT] Table detection failed:`, error instanceof Error ? error.message : error);
    }

    return tableRegions;
  }

  /**
   * Determine reading order of elements
   */
  private static determineReadingOrder(
    regions: LayoutRegion[],
    columnLayout?: ColumnLayout
  ): string[] {
    console.log(`📖 [READING-ORDER] Determining reading order...`);

    const readingOrder: string[] = [];

    try {
      // Sort regions by priority and position
      const sortedRegions = regions.slice().sort((a, b) => {
        // Header first
        if (a.type === 'header') return -1;
        if (b.type === 'header') return 1;

        // Footer last
        if (a.type === 'footer') return 1;
        if (b.type === 'footer') return -1;

        // Then by Y position (top to bottom)
        return b.bounds.y - a.bounds.y;
      });

      // Handle column-based reading order
      if (columnLayout && columnLayout.columns > 1) {
        for (const flow of columnLayout.textFlow) {
          const sortedBlocks = flow.textBlocks.sort((a, b) => b.bounds.y - a.bounds.y);
          readingOrder.push(...sortedBlocks.map(block => block.id));
        }
      } else {
        // Single column reading order
        for (const region of sortedRegions) {
          readingOrder.push(...region.elements.map(el => el.id));
        }
      }

      console.log(`✅ [READING-ORDER] Established reading order for ${readingOrder.length} elements`);

    } catch (error) {
      console.error(`❌ [READING-ORDER] Reading order determination failed:`, error instanceof Error ? error.message : error);
    }

    return readingOrder;
  }

  /**
   * Build document hierarchy from text elements
   */
  private static buildDocumentHierarchy(
    textElements: LayoutElement[],
    regions: LayoutRegion[]
  ): HierarchyNode[] {
    console.log(`🌳 [HIERARCHY] Building document hierarchy...`);

    const hierarchy: HierarchyNode[] = [];

    try {
      // Find heading elements
      const headings = textElements.filter(el =>
        el.type === 'heading' && el.hierarchy && el.hierarchy <= 6
      ).sort((a, b) => (b.hierarchy || 0) - (a.hierarchy || 0)); // Sort by hierarchy level

      // Build hierarchy tree
      let currentParents: { [level: number]: string } = {};

      for (const heading of headings) {
        const level = heading.hierarchy || 1;
        const node: HierarchyNode = {
          elementId: heading.id,
          level,
          type: 'heading',
          children: []
        };

        // Find parent based on hierarchy level
        for (let parentLevel = level - 1; parentLevel >= 1; parentLevel--) {
          if (currentParents[parentLevel]) {
            node.parent = currentParents[parentLevel];
            break;
          }
        }

        // Update current parents
        currentParents[level] = heading.id;

        // Clear lower level parents
        for (let clearLevel = level + 1; clearLevel <= 6; clearLevel++) {
          delete currentParents[clearLevel];
        }

        hierarchy.push(node);
      }

      console.log(`✅ [HIERARCHY] Built hierarchy with ${hierarchy.length} nodes`);

    } catch (error) {
      console.error(`❌ [HIERARCHY] Hierarchy building failed:`, error instanceof Error ? error.message : error);
    }

    return hierarchy;
  }

  // Helper methods

  private static estimateFontSize(text: string): number {
    // Simplified font size estimation based on text characteristics
    if (text.match(/^[A-Z\s]+$/)) return 16; // All caps - likely heading
    if (text.length < 50 && text.match(/^[A-Z]/)) return 14; // Short, capitalized - likely subheading
    return 12; // Default body text
  }

  private static classifyTextType(text: string, fontSize: number): LayoutElement['type'] {
    if (fontSize > 14) return 'heading';
    if (text.match(/^\s*[•\-\*\d+]\s/)) return 'list';
    return 'paragraph';
  }

  private static determineTextHierarchy(text: string, fontSize: number): number | undefined {
    if (fontSize >= 20) return 1;
    if (fontSize >= 18) return 2;
    if (fontSize >= 16) return 3;
    if (fontSize >= 14) return 4;
    return undefined;
  }

  private static calculateBoundingBox(elements: LayoutElement[]): { x: number; y: number; width: number; height: number } {
    if (elements.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const minX = Math.min(...elements.map(el => el.bounds.x));
    const maxX = Math.max(...elements.map(el => el.bounds.x + el.bounds.width));
    const minY = Math.min(...elements.map(el => el.bounds.y));
    const maxY = Math.max(...elements.map(el => el.bounds.y + el.bounds.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private static groupElementsIntoRegions(
    elements: LayoutElement[],
    pageWidth: number
  ): Array<{ bounds: { x: number; y: number; width: number; height: number }; confidence: number; elements: LayoutElement[] }> {
    // Simplified grouping - group by vertical proximity
    const groups: LayoutElement[][] = [];
    const sorted = elements.slice().sort((a, b) => b.bounds.y - a.bounds.y);

    let currentGroup: LayoutElement[] = [];
    let lastY = -1;

    for (const element of sorted) {
      if (lastY === -1 || Math.abs(element.bounds.y - lastY) < 50) {
        currentGroup.push(element);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [element];
      }
      lastY = element.bounds.y;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups.map(group => ({
      bounds: this.calculateBoundingBox(group),
      confidence: 0.6,
      elements: group
    }));
  }

  private static calculateColumnBounds(
    gaps: number[],
    pageWidth: number,
    pageHeight: number
  ): Array<{ x: number; y: number; width: number; height: number }> {
    const columns: Array<{ x: number; y: number; width: number; height: number }> = [];

    let startX = 0;
    for (let i = 0; i <= gaps.length; i++) {
      const endX = i < gaps.length ? gaps[i] : pageWidth;
      columns.push({
        x: startX,
        y: 0,
        width: endX - startX,
        height: pageHeight
      });
      startX = endX + (i < gaps.length - 1 ? 20 : 0); // Add gutter width
    }

    return columns;
  }

  private static analyzeTextFlow(
    textElements: LayoutElement[],
    columnBounds: Array<{ x: number; y: number; width: number; height: number }>
  ): TextFlowRegion[] {
    const textFlow: TextFlowRegion[] = [];

    for (let colIndex = 0; colIndex < columnBounds.length; colIndex++) {
      const column = columnBounds[colIndex];
      const columnElements = textElements.filter(el =>
        el.bounds.x >= column.x && el.bounds.x < column.x + column.width
      );

      textFlow.push({
        columnIndex: colIndex,
        textBlocks: columnElements,
        readingOrder: colIndex
      });
    }

    return textFlow;
  }

  private static groupElementsByVerticalAlignment(elements: LayoutElement[]): LayoutElement[][] {
    const groups: LayoutElement[][] = [];
    const tolerance = this.LAYOUT_THRESHOLDS.TABLE_CELL_ALIGNMENT_TOLERANCE;

    const sorted = elements.slice().sort((a, b) => b.bounds.y - a.bounds.y);

    let currentGroup: LayoutElement[] = [];
    let lastY = -1;

    for (const element of sorted) {
      if (lastY === -1 || Math.abs(element.bounds.y - lastY) <= tolerance) {
        currentGroup.push(element);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [element];
      }
      lastY = element.bounds.y;
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private static analyzeTableStructure(rowGroups: LayoutElement[][]): TableStructure | null {
    if (rowGroups.length < 2) return null;

    const rows = rowGroups.length;
    const columns = Math.max(...rowGroups.map(row => row.length));

    // Create cell matrix
    const cells: TableCell[][] = [];

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      cells[rowIndex] = [];
      const row = rowGroups[rowIndex];

      for (let colIndex = 0; colIndex < columns; colIndex++) {
        const element = row[colIndex];

        if (element) {
          cells[rowIndex][colIndex] = {
            content: element.content || '',
            bounds: element.bounds,
            style: element.style,
            isHeader: rowIndex === 0 // First row as header
          };
        } else {
          cells[rowIndex][colIndex] = {
            content: '',
            bounds: { x: 0, y: 0, width: 0, height: 0 }
          };
        }
      }
    }

    return {
      rows,
      columns,
      cells,
      headers: cells[0],
      hasHeaderRow: true,
      hasHeaderColumn: false
    };
  }

  private static determineDocumentType(
    regions: LayoutRegion[],
    textElements: LayoutElement[]
  ): DocumentStructure['documentType'] {
    const hasHeader = regions.some(r => r.type === 'header');
    const hasFooter = regions.some(r => r.type === 'footer');
    const hasMultipleColumns = regions.filter(r => r.type === 'content').length > 1;
    const hasImages = regions.some(r => r.type === 'figure');
    const hasHeadings = textElements.some(el => el.type === 'heading');

    if (hasHeader && hasFooter && hasHeadings) return 'report';
    if (hasMultipleColumns && hasImages) return 'brochure';
    if (hasHeadings && !hasMultipleColumns) return 'article';
    if (hasImages && textElements.length < 50) return 'presentation';

    return 'mixed';
  }

  private static determineLayoutStyle(
    columnLayout?: ColumnLayout,
    regions?: LayoutRegion[]
  ): DocumentStructure['layout'] {
    if (columnLayout && columnLayout.columns > 1) {
      return 'multi-column';
    }

    const contentRegions = regions?.filter(r => r.type === 'content') || [];
    if (contentRegions.length > 3) {
      return 'grid';
    }

    if (regions?.some(r => r.type === 'figure')) {
      return 'freeform';
    }

    return 'single-column';
  }

  private static calculatePageMargins(
    textElements: LayoutElement[],
    pageWidth: number,
    pageHeight: number
  ): { top: number; right: number; bottom: number; left: number } {
    if (textElements.length === 0) {
      return { top: 72, right: 72, bottom: 72, left: 72 }; // Default 1-inch margins
    }

    const minX = Math.min(...textElements.map(el => el.bounds.x));
    const maxX = Math.max(...textElements.map(el => el.bounds.x + el.bounds.width));
    const minY = Math.min(...textElements.map(el => el.bounds.y));
    const maxY = Math.max(...textElements.map(el => el.bounds.y + el.bounds.height));

    return {
      top: pageHeight - maxY,
      right: pageWidth - maxX,
      bottom: minY,
      left: minX
    };
  }

  /**
   * Analyze layout for entire document
   */
  static async analyzeDocumentLayout(
    pdfPath: string,
    extractedImages: ExtractedImage[] = [],
    vectorGraphics: ExtractedVectorGraphics[] = []
  ): Promise<DocumentStructure[]> {
    console.log(`📚 [DOC-LAYOUT] Analyzing layout for entire document...`);

    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfDocument = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDocument.getPageCount();

      const documentStructures: DocumentStructure[] = [];

      for (let pageNum = 0; pageNum < pageCount; pageNum++) {
        try {
          const pageImages = extractedImages.filter(img => img.page === pageNum);
          const pageVectors = vectorGraphics.find(vg => vg.pageNumber === pageNum);

          const structure = await this.analyzePageLayout(pdfPath, pageNum, pageImages, pageVectors);
          documentStructures.push(structure);

        } catch (error) {
          console.warn(`⚠️ [DOC-LAYOUT] Failed to analyze page ${pageNum + 1}:`, error instanceof Error ? error.message : error);
        }
      }

      console.log(`✅ [DOC-LAYOUT] Analyzed layout for ${documentStructures.length}/${pageCount} pages`);
      return documentStructures;

    } catch (error) {
      console.error(`❌ [DOC-LAYOUT] Document layout analysis failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

export default AdvancedLayoutAnalyzerService;