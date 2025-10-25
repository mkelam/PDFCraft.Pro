import { promises as fs } from 'fs';
import { PDFDocument, PDFPage, PDFField, PDFForm, PDFName } from 'pdf-lib';
import * as path from 'path';

export interface InteractiveElement {
  id: string;
  type: 'hyperlink' | 'bookmark' | 'form-field' | 'annotation' | 'button' | 'media' | 'javascript';
  bounds: { x: number; y: number; width: number; height: number };
  pageNumber: number;
  metadata: { [key: string]: any };
  powerpointEquivalent?: PowerPointInteractiveElement;
}

export interface Hyperlink extends InteractiveElement {
  type: 'hyperlink';
  url: string;
  displayText?: string;
  linkType: 'external' | 'internal' | 'email' | 'file';
  targetPage?: number;
  targetDestination?: string;
}

export interface Bookmark extends InteractiveElement {
  type: 'bookmark';
  title: string;
  level: number;
  parent?: string;
  children: string[];
  targetPage: number;
  targetDestination?: string;
  isOpen?: boolean;
}

export interface FormField extends InteractiveElement {
  type: 'form-field';
  fieldType: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature' | 'button';
  fieldName: string;
  value?: string;
  options?: string[];
  required?: boolean;
  readonly?: boolean;
  tooltip?: string;
  validation?: string;
}

export interface Annotation extends InteractiveElement {
  type: 'annotation';
  annotationType: 'text' | 'highlight' | 'underline' | 'strikeout' | 'squiggly' | 'note' | 'stamp' | 'ink';
  content: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
  color?: string;
  opacity?: number;
}

export interface MediaElement extends InteractiveElement {
  type: 'media';
  mediaType: 'audio' | 'video' | 'flash' | '3d-model';
  filename?: string;
  mimeType?: string;
  controls?: boolean;
  autoplay?: boolean;
  poster?: string;
}

export interface PowerPointInteractiveElement {
  type: 'hyperlink' | 'action-button' | 'text-box' | 'shape' | 'media' | 'trigger';
  actionType?: 'click' | 'mouseover' | 'mouseout';
  actionTarget?: string;
  actionParameters?: { [key: string]: any };
  slideIndex?: number;
  animation?: string;
}

export interface BookmarkStructure {
  title: string;
  level: number;
  pageNumber: number;
  children: BookmarkStructure[];
  powerpointSlideIndex?: number;
}

export interface ExtractedInteractiveContent {
  hyperlinks: Hyperlink[];
  bookmarks: Bookmark[];
  formFields: FormField[];
  annotations: Annotation[];
  mediaElements: MediaElement[];
  bookmarkHierarchy: BookmarkStructure[];
  javascriptActions: string[];
  powerpointElements: PowerPointInteractiveElement[];
}

/**
 * INTERACTIVE ELEMENTS PROCESSOR SERVICE
 *
 * Phase 3 Enhancement - Interactive content preservation and conversion
 *
 * Capabilities:
 * - PDF hyperlink extraction and PowerPoint conversion
 * - Bookmark structure preservation with navigation
 * - Form field detection and conversion to PowerPoint interactions
 * - Annotation processing and comment preservation
 * - Media element handling (audio, video, embedded content)
 * - JavaScript action extraction and conversion
 * - Interactive button and navigation creation
 */
export class InteractiveElementsProcessorService {

  /**
   * Extract all interactive elements from PDF
   */
  static async extractInteractiveElements(pdfPath: string): Promise<ExtractedInteractiveContent> {
    console.log(`🎮 [INTERACTIVE] Extracting interactive elements from PDF...`);

    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfDocument = await PDFDocument.load(pdfBuffer);

      // Extract different types of interactive content
      const hyperlinks = await this.extractHyperlinks(pdfDocument);
      const bookmarks = await this.extractBookmarks(pdfDocument);
      const formFields = await this.extractFormFields(pdfDocument);
      const annotations = await this.extractAnnotations(pdfDocument);
      const mediaElements = await this.extractMediaElements(pdfDocument);
      const javascriptActions = await this.extractJavaScriptActions(pdfDocument);

      // Build bookmark hierarchy
      const bookmarkHierarchy = this.buildBookmarkHierarchy(bookmarks);

      // Convert to PowerPoint equivalents
      const powerpointElements = this.convertToPowerPointElements(
        hyperlinks,
        bookmarks,
        formFields,
        annotations,
        mediaElements
      );

      console.log(`✅ [INTERACTIVE] Extracted: ${hyperlinks.length} links, ${bookmarks.length} bookmarks, ${formFields.length} form fields, ${annotations.length} annotations`);

      return {
        hyperlinks,
        bookmarks,
        formFields,
        annotations,
        mediaElements,
        bookmarkHierarchy,
        javascriptActions,
        powerpointElements
      };

    } catch (error) {
      console.error(`❌ [INTERACTIVE] Extraction failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Extract hyperlinks from PDF
   */
  private static async extractHyperlinks(pdfDocument: PDFDocument): Promise<Hyperlink[]> {
    console.log(`🔗 [HYPERLINKS] Extracting hyperlinks...`);

    const hyperlinks: Hyperlink[] = [];

    try {
      const pages = pdfDocument.getPages();

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];

        // Extract link annotations
        const annotations = page.node.Annots;

        if (annotations && Array.isArray(annotations)) {
          for (const annotRef of annotations) {
            try {
              const annot = annotRef.lookup();

              if (annot && annot.get('Subtype')?.toString() === '/Link') {
                const linkData = this.parseLinkAnnotation(annot, pageIndex);
                if (linkData) {
                  hyperlinks.push(linkData);
                }
              }
            } catch (error) {
              console.warn(`⚠️ [HYPERLINKS] Failed to parse annotation:`, error);
            }
          }
        }
      }

      console.log(`✅ [HYPERLINKS] Extracted ${hyperlinks.length} hyperlinks`);

    } catch (error) {
      console.error(`❌ [HYPERLINKS] Hyperlink extraction failed:`, error instanceof Error ? error.message : error);
    }

    return hyperlinks;
  }

  /**
   * Extract bookmarks from PDF
   */
  private static async extractBookmarks(pdfDocument: PDFDocument): Promise<Bookmark[]> {
    console.log(`📑 [BOOKMARKS] Extracting bookmarks...`);

    const bookmarks: Bookmark[] = [];

    try {
      // Access the document outline (bookmarks)
      const catalog = pdfDocument.catalog;
      const outlines = catalog.lookup(PDFName.of('Outlines'));

      if (outlines) {
        const bookmarkData = this.parseBookmarkOutline(outlines, 0);
        bookmarks.push(...bookmarkData);
      }

      console.log(`✅ [BOOKMARKS] Extracted ${bookmarks.length} bookmarks`);

    } catch (error) {
      console.error(`❌ [BOOKMARKS] Bookmark extraction failed:`, error instanceof Error ? error.message : error);
    }

    return bookmarks;
  }

  /**
   * Extract form fields from PDF
   */
  private static async extractFormFields(pdfDocument: PDFDocument): Promise<FormField[]> {
    console.log(`📝 [FORM-FIELDS] Extracting form fields...`);

    const formFields: FormField[] = [];

    try {
      const form = pdfDocument.getForm();
      const fields = form.getFields();

      for (const field of fields) {
        const formField = this.parseFormField(field);
        if (formField) {
          formFields.push(formField);
        }
      }

      console.log(`✅ [FORM-FIELDS] Extracted ${formFields.length} form fields`);

    } catch (error) {
      console.error(`❌ [FORM-FIELDS] Form field extraction failed:`, error instanceof Error ? error.message : error);
    }

    return formFields;
  }

  /**
   * Extract annotations from PDF
   */
  private static async extractAnnotations(pdfDocument: PDFDocument): Promise<Annotation[]> {
    console.log(`📝 [ANNOTATIONS] Extracting annotations...`);

    const annotations: Annotation[] = [];

    try {
      const pages = pdfDocument.getPages();

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const pageAnnotations = page.node.Annots;

        if (pageAnnotations && Array.isArray(pageAnnotations)) {
          for (const annotRef of pageAnnotations) {
            try {
              const annot = annotRef.lookup();
              const annotation = this.parseAnnotation(annot, pageIndex);

              if (annotation) {
                annotations.push(annotation);
              }
            } catch (error) {
              console.warn(`⚠️ [ANNOTATIONS] Failed to parse annotation:`, error);
            }
          }
        }
      }

      console.log(`✅ [ANNOTATIONS] Extracted ${annotations.length} annotations`);

    } catch (error) {
      console.error(`❌ [ANNOTATIONS] Annotation extraction failed:`, error instanceof Error ? error.message : error);
    }

    return annotations;
  }

  /**
   * Extract media elements from PDF
   */
  private static async extractMediaElements(pdfDocument: PDFDocument): Promise<MediaElement[]> {
    console.log(`🎵 [MEDIA] Extracting media elements...`);

    const mediaElements: MediaElement[] = [];

    try {
      // This is a simplified implementation
      // Real media extraction would require more sophisticated PDF structure analysis
      console.log(`⚠️ [MEDIA] Media extraction not fully implemented - placeholder`);

    } catch (error) {
      console.error(`❌ [MEDIA] Media extraction failed:`, error instanceof Error ? error.message : error);
    }

    return mediaElements;
  }

  /**
   * Extract JavaScript actions from PDF
   */
  private static async extractJavaScriptActions(pdfDocument: PDFDocument): Promise<string[]> {
    console.log(`🖥️ [JAVASCRIPT] Extracting JavaScript actions...`);

    const javascriptActions: string[] = [];

    try {
      // This is a simplified implementation
      // Real JavaScript extraction would require analyzing various PDF action dictionaries
      console.log(`⚠️ [JAVASCRIPT] JavaScript extraction not fully implemented - placeholder`);

    } catch (error) {
      console.error(`❌ [JAVASCRIPT] JavaScript extraction failed:`, error instanceof Error ? error.message : error);
    }

    return javascriptActions;
  }

  /**
   * Parse link annotation
   */
  private static parseLinkAnnotation(annot: any, pageIndex: number): Hyperlink | null {
    try {
      const rect = annot.get('Rect');
      const action = annot.get('A');

      if (!rect) return null;

      const bounds = {
        x: rect[0],
        y: rect[1],
        width: rect[2] - rect[0],
        height: rect[3] - rect[1]
      };

      let url = '';
      let linkType: Hyperlink['linkType'] = 'external';
      let targetPage: number | undefined;

      if (action) {
        const actionType = action.get('S');

        if (actionType?.toString() === '/URI') {
          url = action.get('URI')?.toString() || '';
          linkType = this.determineLinkType(url);
        } else if (actionType?.toString() === '/GoTo') {
          const dest = action.get('D');
          if (dest) {
            linkType = 'internal';
            targetPage = this.parseDestination(dest);
          }
        }
      }

      return {
        id: `link_${pageIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'hyperlink',
        bounds,
        pageNumber: pageIndex,
        url,
        linkType,
        targetPage,
        metadata: {}
      };

    } catch (error) {
      console.warn(`⚠️ [LINK-PARSE] Failed to parse link annotation:`, error);
      return null;
    }
  }

  /**
   * Parse bookmark outline
   */
  private static parseBookmarkOutline(outlines: any, level: number): Bookmark[] {
    const bookmarks: Bookmark[] = [];

    try {
      let current = outlines.get('First');

      while (current) {
        const title = current.get('Title')?.toString() || 'Untitled';
        const dest = current.get('Dest') || current.get('A')?.get('D');
        const targetPage = dest ? this.parseDestination(dest) : 0;

        const bookmark: Bookmark = {
          id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'bookmark',
          bounds: { x: 0, y: 0, width: 0, height: 0 }, // Bookmarks don't have visual bounds
          pageNumber: 0, // Bookmarks are document-level
          title,
          level,
          targetPage,
          children: [],
          metadata: {}
        };

        // Parse child bookmarks
        const firstChild = current.get('First');
        if (firstChild) {
          const childBookmarks = this.parseBookmarkOutline(current, level + 1);
          bookmark.children = childBookmarks.map(child => child.id);
          bookmarks.push(bookmark, ...childBookmarks);
        } else {
          bookmarks.push(bookmark);
        }

        current = current.get('Next');
      }

    } catch (error) {
      console.warn(`⚠️ [BOOKMARK-PARSE] Failed to parse bookmark outline:`, error);
    }

    return bookmarks;
  }

  /**
   * Parse form field
   */
  private static parseFormField(field: PDFField): FormField | null {
    try {
      const name = field.getName();
      const bounds = this.getFieldBounds(field);

      // Determine field type
      let fieldType: FormField['fieldType'] = 'text';
      let value: string | undefined;
      let options: string[] | undefined;

      // This is simplified - actual implementation would need to check field types more thoroughly
      if ('getValue' in field && typeof field.getValue === 'function') {
        try {
          value = field.getValue()?.toString();
        } catch {
          // Field might not have a value
        }
      }

      return {
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'form-field',
        bounds,
        pageNumber: 0, // Would need to determine page from field bounds
        fieldType,
        fieldName: name,
        value,
        options,
        metadata: {}
      };

    } catch (error) {
      console.warn(`⚠️ [FIELD-PARSE] Failed to parse form field:`, error);
      return null;
    }
  }

  /**
   * Parse annotation
   */
  private static parseAnnotation(annot: any, pageIndex: number): Annotation | null {
    try {
      const subtype = annot.get('Subtype')?.toString();
      const rect = annot.get('Rect');
      const contents = annot.get('Contents')?.toString() || '';

      if (!rect || subtype === '/Link') return null; // Skip link annotations (handled separately)

      const bounds = {
        x: rect[0],
        y: rect[1],
        width: rect[2] - rect[0],
        height: rect[3] - rect[1]
      };

      let annotationType: Annotation['annotationType'] = 'text';

      // Map PDF annotation subtypes to our types
      switch (subtype) {
        case '/Highlight':
          annotationType = 'highlight';
          break;
        case '/Underline':
          annotationType = 'underline';
          break;
        case '/StrikeOut':
          annotationType = 'strikeout';
          break;
        case '/Squiggly':
          annotationType = 'squiggly';
          break;
        case '/Text':
        case '/Note':
          annotationType = 'note';
          break;
        case '/Stamp':
          annotationType = 'stamp';
          break;
        case '/Ink':
          annotationType = 'ink';
          break;
        default:
          annotationType = 'text';
      }

      return {
        id: `annotation_${pageIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'annotation',
        bounds,
        pageNumber: pageIndex,
        annotationType,
        content: contents,
        author: annot.get('T')?.toString(),
        creationDate: this.parseDate(annot.get('CreationDate')),
        modificationDate: this.parseDate(annot.get('M')),
        metadata: {}
      };

    } catch (error) {
      console.warn(`⚠️ [ANNOTATION-PARSE] Failed to parse annotation:`, error);
      return null;
    }
  }

  /**
   * Build bookmark hierarchy
   */
  private static buildBookmarkHierarchy(bookmarks: Bookmark[]): BookmarkStructure[] {
    const hierarchy: BookmarkStructure[] = [];
    const bookmarkMap = new Map<string, Bookmark>();

    // Create bookmark lookup map
    for (const bookmark of bookmarks) {
      bookmarkMap.set(bookmark.id, bookmark);
    }

    // Build hierarchy for root bookmarks (level 0)
    for (const bookmark of bookmarks.filter(b => b.level === 0)) {
      const structure = this.buildBookmarkNode(bookmark, bookmarkMap);
      hierarchy.push(structure);
    }

    return hierarchy;
  }

  /**
   * Build bookmark node recursively
   */
  private static buildBookmarkNode(
    bookmark: Bookmark,
    bookmarkMap: Map<string, Bookmark>
  ): BookmarkStructure {
    const children: BookmarkStructure[] = [];

    for (const childId of bookmark.children) {
      const child = bookmarkMap.get(childId);
      if (child) {
        children.push(this.buildBookmarkNode(child, bookmarkMap));
      }
    }

    return {
      title: bookmark.title,
      level: bookmark.level,
      pageNumber: bookmark.targetPage,
      children,
      powerpointSlideIndex: bookmark.targetPage // 1:1 mapping for now
    };
  }

  /**
   * Convert interactive elements to PowerPoint equivalents
   */
  private static convertToPowerPointElements(
    hyperlinks: Hyperlink[],
    bookmarks: Bookmark[],
    formFields: FormField[],
    annotations: Annotation[],
    mediaElements: MediaElement[]
  ): PowerPointInteractiveElement[] {
    console.log(`🔄 [PPT-CONVERT] Converting to PowerPoint interactive elements...`);

    const pptElements: PowerPointInteractiveElement[] = [];

    // Convert hyperlinks
    for (const link of hyperlinks) {
      pptElements.push({
        type: 'hyperlink',
        actionType: 'click',
        actionTarget: link.url,
        slideIndex: link.pageNumber
      });
    }

    // Convert bookmarks to navigation buttons
    for (const bookmark of bookmarks.filter(b => b.level === 0)) { // Only top-level bookmarks
      pptElements.push({
        type: 'action-button',
        actionType: 'click',
        actionTarget: `slide:${bookmark.targetPage}`,
        actionParameters: { bookmarkTitle: bookmark.title }
      });
    }

    // Convert form fields to text boxes or shapes
    for (const field of formFields) {
      if (field.fieldType === 'text') {
        pptElements.push({
          type: 'text-box',
          actionParameters: {
            placeholder: field.fieldName,
            value: field.value
          }
        });
      } else {
        pptElements.push({
          type: 'shape',
          actionParameters: {
            fieldType: field.fieldType,
            fieldName: field.fieldName
          }
        });
      }
    }

    // Convert annotations to comments or shapes
    for (const annotation of annotations) {
      pptElements.push({
        type: 'shape',
        actionParameters: {
          annotationType: annotation.annotationType,
          content: annotation.content,
          author: annotation.author
        }
      });
    }

    console.log(`✅ [PPT-CONVERT] Converted ${pptElements.length} interactive elements`);
    return pptElements;
  }

  // Helper methods

  private static determineLinkType(url: string): Hyperlink['linkType'] {
    if (url.startsWith('mailto:')) return 'email';
    if (url.startsWith('file:')) return 'file';
    if (url.startsWith('http://') || url.startsWith('https://')) return 'external';
    return 'internal';
  }

  private static parseDestination(dest: any): number {
    // Simplified destination parsing
    // Real implementation would handle various destination formats
    if (Array.isArray(dest) && dest.length > 0) {
      return 0; // Would need to resolve page reference
    }
    return 0;
  }

  private static getFieldBounds(field: PDFField): { x: number; y: number; width: number; height: number } {
    // Simplified bounds calculation
    // Real implementation would extract widget annotations bounds
    return { x: 0, y: 0, width: 100, height: 20 };
  }

  private static parseDate(dateObj: any): Date | undefined {
    try {
      if (dateObj && typeof dateObj.toString === 'function') {
        const dateStr = dateObj.toString();
        return new Date(dateStr);
      }
    } catch {
      // Date parsing failed
    }
    return undefined;
  }

  /**
   * Generate PowerPoint navigation slides
   */
  static generateNavigationSlides(
    bookmarkHierarchy: BookmarkStructure[],
    documentTitle: string = 'Document Navigation'
  ): Array<{ title: string; content: string; bookmarks: BookmarkStructure[] }> {
    console.log(`🧭 [NAVIGATION] Generating navigation slides...`);

    const navigationSlides: Array<{ title: string; content: string; bookmarks: BookmarkStructure[] }> = [];

    if (bookmarkHierarchy.length === 0) {
      return navigationSlides;
    }

    // Main navigation slide
    navigationSlides.push({
      title: documentTitle,
      content: 'Table of Contents',
      bookmarks: bookmarkHierarchy
    });

    // Section navigation slides for complex hierarchies
    for (const section of bookmarkHierarchy.filter(b => b.children.length > 0)) {
      navigationSlides.push({
        title: section.title,
        content: 'Section Overview',
        bookmarks: section.children
      });
    }

    console.log(`✅ [NAVIGATION] Generated ${navigationSlides.length} navigation slides`);
    return navigationSlides;
  }

  /**
   * Create PowerPoint slide with interactive elements
   */
  static createInteractiveSlideDefinition(
    pageElements: PowerPointInteractiveElement[],
    slideIndex: number
  ): { slideIndex: number; elements: PowerPointInteractiveElement[]; hasInteractivity: boolean } {
    const slideElements = pageElements.filter(el =>
      el.slideIndex === undefined || el.slideIndex === slideIndex
    );

    return {
      slideIndex,
      elements: slideElements,
      hasInteractivity: slideElements.length > 0
    };
  }

  /**
   * Export interactive elements summary
   */
  static generateInteractivityReport(
    extractedContent: ExtractedInteractiveContent
  ): {
    summary: string;
    details: { [key: string]: any };
    recommendations: string[];
  } {
    const summary = [
      `${extractedContent.hyperlinks.length} hyperlinks`,
      `${extractedContent.bookmarks.length} bookmarks`,
      `${extractedContent.formFields.length} form fields`,
      `${extractedContent.annotations.length} annotations`,
      `${extractedContent.mediaElements.length} media elements`
    ].join(', ');

    const details = {
      hyperlinks: {
        total: extractedContent.hyperlinks.length,
        external: extractedContent.hyperlinks.filter(l => l.linkType === 'external').length,
        internal: extractedContent.hyperlinks.filter(l => l.linkType === 'internal').length,
        email: extractedContent.hyperlinks.filter(l => l.linkType === 'email').length
      },
      bookmarks: {
        total: extractedContent.bookmarks.length,
        maxLevel: Math.max(...extractedContent.bookmarks.map(b => b.level), 0),
        hasHierarchy: extractedContent.bookmarkHierarchy.length > 0
      },
      forms: {
        total: extractedContent.formFields.length,
        types: [...new Set(extractedContent.formFields.map(f => f.fieldType))]
      },
      annotations: {
        total: extractedContent.annotations.length,
        types: [...new Set(extractedContent.annotations.map(a => a.annotationType))]
      }
    };

    const recommendations: string[] = [];

    if (extractedContent.hyperlinks.length > 0) {
      recommendations.push('Consider adding navigation controls in PowerPoint for better user experience');
    }

    if (extractedContent.bookmarks.length > 5) {
      recommendations.push('Create a table of contents slide for easy navigation');
    }

    if (extractedContent.formFields.length > 0) {
      recommendations.push('Form fields will be converted to text boxes - consider using PowerPoint forms for interactivity');
    }

    if (extractedContent.annotations.length > 0) {
      recommendations.push('Annotations will be preserved as comments or text elements');
    }

    return { summary, details, recommendations };
  }
}

export default InteractiveElementsProcessorService;