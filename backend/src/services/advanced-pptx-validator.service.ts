import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';

/**
 * Advanced PPTX Structure Validation Service
 * Validates OOXML compliance, relationships, and structural integrity
 */
export class AdvancedPPTXValidator {

  /**
   * Comprehensive PPTX structure validation
   */
  static async validatePPTXStructure(filePath: string): Promise<{
    structuralIntegrity: number;
    ooxml_compliance: boolean;
    slideRelationships: boolean;
    mediaIntegrity: boolean;
    themeConsistency: boolean;
    issues: string[];
    details: {
      contentTypes: number;
      relationships: number;
      presentationXml: number;
      slideStructure: number;
    };
  }> {
    console.log(`🔍 [ADVANCED-PPTX] Validating structure: ${path.basename(filePath)}`);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(fileBuffer);

      // Validate core OOXML components
      const contentTypes = await this.validateContentTypes(zip);
      const relationships = await this.validateRelationships(zip);
      const presentationXml = await this.validatePresentationXML(zip);
      const slideStructure = await this.validateSlideStructure(zip);

      // Additional integrity checks
      const mediaIntegrity = await this.validateMediaFiles(zip);
      const themeConsistency = await this.validateThemeFiles(zip);

      const structuralIntegrity = Math.round((contentTypes + relationships + presentationXml + slideStructure) / 4);
      const issues: string[] = [];

      // Collect issues
      if (contentTypes < 90) issues.push('Content types definition incomplete');
      if (relationships < 85) issues.push('Relationship integrity issues detected');
      if (presentationXml < 90) issues.push('Presentation XML structure problems');
      if (slideStructure < 80) issues.push('Slide structure validation failed');
      if (!mediaIntegrity) issues.push('Media file integrity issues');
      if (!themeConsistency) issues.push('Theme consistency problems');

      console.log(`   📊 Structural integrity: ${structuralIntegrity}%`);
      console.log(`   📋 OOXML compliance: ${contentTypes >= 90 ? '✅ YES' : '❌ NO'}`);
      console.log(`   🔗 Relationships: ${relationships >= 85 ? '✅ VALID' : '❌ INVALID'}`);

      return {
        structuralIntegrity,
        ooxml_compliance: contentTypes >= 90,
        slideRelationships: slideStructure >= 85,
        mediaIntegrity,
        themeConsistency,
        issues,
        details: {
          contentTypes,
          relationships,
          presentationXml,
          slideStructure
        }
      };

    } catch (error) {
      console.error(`❌ [ADVANCED-PPTX] Structure validation failed:`, error);
      return {
        structuralIntegrity: 0,
        ooxml_compliance: false,
        slideRelationships: false,
        mediaIntegrity: false,
        themeConsistency: false,
        issues: [`Structure validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: {
          contentTypes: 0,
          relationships: 0,
          presentationXml: 0,
          slideStructure: 0
        }
      };
    }
  }

  /**
   * Validate Content Types ([Content_Types].xml)
   */
  private static async validateContentTypes(zip: JSZip): Promise<number> {
    try {
      const contentTypesFile = zip.file('[Content_Types].xml');
      if (!contentTypesFile) {
        return 0;
      }

      const contentTypesXml = await contentTypesFile.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(contentTypesXml, 'text/xml');

      // Check for required content types
      const requiredTypes = [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
        'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
        'application/vnd.openxmlformats-package.relationships+xml'
      ];

      let foundTypes = 0;
      const overrides = doc.getElementsByTagName('Override');
      const defaults = doc.getElementsByTagName('Default');

      for (let i = 0; i < overrides.length; i++) {
        const contentType = overrides[i].getAttribute('ContentType');
        if (contentType && requiredTypes.includes(contentType)) {
          foundTypes++;
        }
      }

      for (let i = 0; i < defaults.length; i++) {
        const contentType = defaults[i].getAttribute('ContentType');
        if (contentType && requiredTypes.includes(contentType)) {
          foundTypes++;
        }
      }

      // Score based on required types found
      return Math.min(100, (foundTypes / requiredTypes.length) * 100);

    } catch (error) {
      console.warn(`⚠️ Content types validation failed:`, error);
      return 50; // Partial score if validation fails
    }
  }

  /**
   * Validate relationship files
   */
  private static async validateRelationships(zip: JSZip): Promise<number> {
    try {
      const relsFile = zip.file('_rels/.rels');
      if (!relsFile) {
        return 0;
      }

      const relsXml = await relsFile.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(relsXml, 'text/xml');

      const relationships = doc.getElementsByTagName('Relationship');
      let validRelationships = 0;

      for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i];
        const id = rel.getAttribute('Id');
        const type = rel.getAttribute('Type');
        const target = rel.getAttribute('Target');

        if (id && type && target) {
          // Check if target file exists in the zip
          const targetFile = zip.file(target);
          if (targetFile) {
            validRelationships++;
          }
        }
      }

      // Score based on valid relationships
      return relationships.length > 0 ? Math.round((validRelationships / relationships.length) * 100) : 100;

    } catch (error) {
      console.warn(`⚠️ Relationships validation failed:`, error);
      return 60; // Partial score if validation fails
    }
  }

  /**
   * Validate presentation.xml structure
   */
  private static async validatePresentationXML(zip: JSZip): Promise<number> {
    try {
      const presentationFile = zip.file('ppt/presentation.xml');
      if (!presentationFile) {
        return 0;
      }

      const presentationXml = await presentationFile.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(presentationXml, 'text/xml');

      let score = 0;

      // Check for required elements
      const sldIdLst = doc.getElementsByTagName('p:sldIdLst')[0];
      if (sldIdLst) {
        score += 30;

        // Check slide references
        const slideIds = sldIdLst.getElementsByTagName('p:sldId');
        if (slideIds.length > 0) {
          score += 30;
        }
      }

      // Check for slide master references
      const sldMasterIdLst = doc.getElementsByTagName('p:sldMasterIdLst')[0];
      if (sldMasterIdLst) {
        score += 20;
      }

      // Check for slide size information
      const sldSz = doc.getElementsByTagName('p:sldSz')[0];
      if (sldSz) {
        score += 20;
      }

      return score;

    } catch (error) {
      console.warn(`⚠️ Presentation XML validation failed:`, error);
      return 40; // Partial score if validation fails
    }
  }

  /**
   * Validate slide structure and dependencies
   */
  private static async validateSlideStructure(zip: JSZip): Promise<number> {
    try {
      const slideFiles = Object.keys(zip.files).filter(filename =>
        filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
      );

      if (slideFiles.length === 0) {
        return 0;
      }

      let validSlides = 0;

      for (const slideFile of slideFiles) {
        try {
          const file = zip.file(slideFile);
          if (file) {
            const slideXml = await file.async('text');
            const parser = new DOMParser();
            const doc = parser.parseFromString(slideXml, 'text/xml');

            // Check for basic slide structure
            const cSld = doc.getElementsByTagName('p:cSld')[0];
            if (cSld) {
              const spTree = cSld.getElementsByTagName('p:spTree')[0];
              if (spTree) {
                validSlides++;
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Slide validation failed for ${slideFile}:`, error);
        }
      }

      return Math.round((validSlides / slideFiles.length) * 100);

    } catch (error) {
      console.warn(`⚠️ Slide structure validation failed:`, error);
      return 50; // Partial score if validation fails
    }
  }

  /**
   * Validate media file integrity
   */
  private static async validateMediaFiles(zip: JSZip): Promise<boolean> {
    try {
      const mediaFiles = Object.keys(zip.files).filter(filename =>
        filename.startsWith('ppt/media/') &&
        /\.(png|jpg|jpeg|gif|bmp|tiff|svg)$/i.test(filename)
      );

      if (mediaFiles.length === 0) {
        return true; // No media files to validate
      }

      // Check if media files are accessible and have content
      for (const mediaFile of mediaFiles) {
        const file = zip.file(mediaFile);
        if (file) {
          const buffer = await file.async('arraybuffer');
          if (buffer.byteLength === 0) {
            return false; // Empty media file
          }
        } else {
          return false; // Referenced media file missing
        }
      }

      return true;

    } catch (error) {
      console.warn(`⚠️ Media file validation failed:`, error);
      return false;
    }
  }

  /**
   * Validate theme file consistency
   */
  private static async validateThemeFiles(zip: JSZip): Promise<boolean> {
    try {
      const themeFiles = Object.keys(zip.files).filter(filename =>
        filename.startsWith('ppt/theme/') && filename.endsWith('.xml')
      );

      if (themeFiles.length === 0) {
        return false; // No theme files found
      }

      // Check if theme files are valid XML
      for (const themeFile of themeFiles) {
        const file = zip.file(themeFile);
        if (file) {
          const themeXml = await file.async('text');
          const parser = new DOMParser();
          const doc = parser.parseFromString(themeXml, 'text/xml');

          // Check for theme structure
          const theme = doc.getElementsByTagName('a:theme')[0];
          if (!theme) {
            return false;
          }

          // Check for color scheme
          const clrScheme = doc.getElementsByTagName('a:clrScheme')[0];
          if (!clrScheme) {
            return false;
          }
        }
      }

      return true;

    } catch (error) {
      console.warn(`⚠️ Theme file validation failed:`, error);
      return false;
    }
  }

  /**
   * Extract slide content for further analysis
   */
  static async extractSlideContent(filePath: string, slideIndex: number): Promise<{
    textElements: Array<{
      text: string;
      position?: { x: number; y: number; width: number; height: number };
      formatting?: any;
    }>;
    imageElements: Array<{
      src: string;
      position?: { x: number; y: number; width: number; height: number };
      properties?: any;
    }>;
    shapeElements: Array<{
      type: string;
      position?: { x: number; y: number; width: number; height: number };
      properties?: any;
    }>;
  }> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(fileBuffer);

      const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`);
      if (!slideFile) {
        throw new Error(`Slide ${slideIndex} not found`);
      }

      const slideXml = await slideFile.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(slideXml, 'text/xml');

      const textElements: any[] = [];
      const imageElements: any[] = [];
      const shapeElements: any[] = [];

      // Extract text elements
      const textBoxes = doc.getElementsByTagName('p:sp');
      for (let i = 0; i < textBoxes.length; i++) {
        const textBox = textBoxes[i];
        const txBody = textBox.getElementsByTagName('p:txBody')[0];
        if (txBody) {
          const paragraphs = txBody.getElementsByTagName('a:p');
          for (let j = 0; j < paragraphs.length; j++) {
            const paragraph = paragraphs[j];
            const runs = paragraph.getElementsByTagName('a:r');
            let text = '';
            for (let k = 0; k < runs.length; k++) {
              const run = runs[k];
              const t = run.getElementsByTagName('a:t')[0];
              if (t && t.textContent) {
                text += t.textContent;
              }
            }
            if (text.trim()) {
              textElements.push({
                text: text.trim(),
                position: this.extractPosition(textBox),
                formatting: this.extractTextFormatting(paragraph)
              });
            }
          }
        }
      }

      // Extract image elements
      const pictures = doc.getElementsByTagName('p:pic');
      for (let i = 0; i < pictures.length; i++) {
        const picture = pictures[i];
        const blip = picture.getElementsByTagName('a:blip')[0];
        if (blip) {
          const embed = blip.getAttribute('r:embed');
          imageElements.push({
            src: embed || 'unknown',
            position: this.extractPosition(picture),
            properties: this.extractImageProperties(picture)
          });
        }
      }

      console.log(`📄 [ADVANCED-PPTX] Extracted slide ${slideIndex}: ${textElements.length} texts, ${imageElements.length} images`);

      return {
        textElements,
        imageElements,
        shapeElements
      };

    } catch (error) {
      console.error(`❌ [ADVANCED-PPTX] Failed to extract slide content:`, error);
      return {
        textElements: [],
        imageElements: [],
        shapeElements: []
      };
    }
  }

  /**
   * Extract position information from XML element
   */
  private static extractPosition(element: Element): { x: number; y: number; width: number; height: number } | undefined {
    try {
      const xfrm = element.getElementsByTagName('a:xfrm')[0];
      if (xfrm) {
        const off = xfrm.getElementsByTagName('a:off')[0];
        const ext = xfrm.getElementsByTagName('a:ext')[0];

        if (off && ext) {
          return {
            x: parseInt(off.getAttribute('x') || '0'),
            y: parseInt(off.getAttribute('y') || '0'),
            width: parseInt(ext.getAttribute('cx') || '0'),
            height: parseInt(ext.getAttribute('cy') || '0')
          };
        }
      }
    } catch (error) {
      // Ignore position extraction errors
    }
    return undefined;
  }

  /**
   * Extract text formatting information
   */
  private static extractTextFormatting(paragraph: Element): any {
    try {
      const formatting: any = {};

      // Extract font information
      const runs = paragraph.getElementsByTagName('a:r');
      if (runs.length > 0) {
        const rPr = runs[0].getElementsByTagName('a:rPr')[0];
        if (rPr) {
          const latin = rPr.getElementsByTagName('a:latin')[0];
          if (latin) {
            formatting.fontFamily = latin.getAttribute('typeface');
          }
          formatting.fontSize = rPr.getAttribute('sz');
          formatting.bold = rPr.getAttribute('b') === '1';
          formatting.italic = rPr.getAttribute('i') === '1';
        }
      }

      return formatting;
    } catch (error) {
      return {};
    }
  }

  /**
   * Extract image properties
   */
  private static extractImageProperties(picture: Element): any {
    try {
      const properties: any = {};

      // Extract image description
      const nvPicPr = picture.getElementsByTagName('p:nvPicPr')[0];
      if (nvPicPr) {
        const cNvPr = nvPicPr.getElementsByTagName('p:cNvPr')[0];
        if (cNvPr) {
          properties.name = cNvPr.getAttribute('name');
          properties.description = cNvPr.getAttribute('descr');
        }
      }

      return properties;
    } catch (error) {
      return {};
    }
  }
}