import CloudConvert from 'cloudconvert';
import fs from 'fs/promises';
import path from 'path';
import { OfficeOutputFormat } from '../types/pdf-conversion.types';

export interface CloudConvertConfig {
  apiKey: string;
  sandboxMode?: boolean;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  jobId?: string;
  error?: string;
  processingTime?: number;
  outputFormat?: string;
}

/**
 * @deprecated Use OfficeOutputFormat from '../types/pdf-conversion.types' instead
 * This type is kept for backward compatibility only
 */
export type OfficeFormat = OfficeOutputFormat;

export class CloudConvertPDFService {
  private cloudConvert: CloudConvert;
  private sandboxMode: boolean;

  // Supported Office formats with metadata
  private static readonly SUPPORTED_FORMATS = {
    docx: {
      name: 'Microsoft Word Document',
      extension: '.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      description: 'Converts PDF to editable Word document with preserved formatting'
    },
    pptx: {
      name: 'Microsoft PowerPoint Presentation',
      extension: '.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      description: 'Converts PDF to editable PowerPoint presentation with preserved layout'
    },
    xlsx: {
      name: 'Microsoft Excel Spreadsheet',
      extension: '.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      description: 'Converts PDF to editable Excel spreadsheet with restored tables'
    }
  };

  constructor(config: CloudConvertConfig) {
    // CloudConvert SDK v3 expects just an API key string
    this.cloudConvert = new CloudConvert(config.apiKey);
    this.sandboxMode = config.sandboxMode || false;

    console.log(`🌐 [CLOUDCONVERT] Initialized with API key`);
    console.log(`🌐 [CLOUDCONVERT] Sandbox mode: ${this.sandboxMode}`);
  }

  /**
   * Generic PDF to Office format conversion
   * Supports: DOCX, PPTX, XLSX
   */
  async convertPDFToOffice(
    inputPath: string,
    outputDir: string,
    outputFormat: OfficeOutputFormat,
    filename?: string
  ): Promise<ConversionResult> {
    const startTime = Date.now();

    try {
      // Validate output format
      if (!CloudConvertPDFService.SUPPORTED_FORMATS[outputFormat]) {
        throw new Error(`Unsupported output format: ${outputFormat}. Supported formats: docx, pptx, xlsx`);
      }

      const formatInfo = CloudConvertPDFService.SUPPORTED_FORMATS[outputFormat];

      // Create conversion job with dynamic format
      const job = await this.cloudConvert.jobs.create({
        tasks: {
          'import-pdf': {
            operation: 'import/upload'
          },
          [`convert-to-${outputFormat}`]: {
            operation: 'convert',
            input: 'import-pdf',
            input_format: 'pdf',
            output_format: outputFormat
          },
          [`export-${outputFormat}`]: {
            operation: 'export/url',
            input: `convert-to-${outputFormat}`
          }
        }
      });

      // Upload the PDF file
      const uploadTask = job.tasks.filter(task => task.name === 'import-pdf')[0];

      const inputFileStream = await fs.readFile(inputPath);
      await this.cloudConvert.tasks.upload(uploadTask, inputFileStream, filename || 'input.pdf');

      // Wait for job completion
      const completedJob = await this.cloudConvert.jobs.wait(job.id);

      if (completedJob.status === 'finished') {
        // Get export task and download URL
        const exportTask = completedJob.tasks.filter(task => task.name === `export-${outputFormat}`)[0];

        if (exportTask.result?.files && exportTask.result.files.length > 0) {
          const file = exportTask.result.files[0];
          const downloadUrl = file.url;

          // Download the converted file
          const response = await fetch(downloadUrl);
          const buffer = await response.arrayBuffer();

          // Save to output directory
          const outputFilename = filename ?
            `${path.parse(filename).name}${formatInfo.extension}` :
            `converted_${Date.now()}${formatInfo.extension}`;
          const outputPath = path.join(outputDir, outputFilename);

          await fs.writeFile(outputPath, Buffer.from(buffer));

          const processingTime = Date.now() - startTime;

          return {
            success: true,
            outputPath,
            jobId: job.id,
            processingTime,
            outputFormat
          };
        } else {
          throw new Error('No output file generated');
        }
      } else {
        // Log detailed CloudConvert job error information
        console.error('❌ [CLOUDCONVERT] Job failed! Full details:', {
          jobId: completedJob.id,
          status: completedJob.status,
          createdAt: completedJob.created_at,
          endedAt: completedJob.ended_at,
          tasks: completedJob.tasks.map(task => ({
            name: task.name,
            operation: task.operation,
            status: task.status,
            message: task.message,
            code: task.code,
            result: task.result
          }))
        });

        // Try to find specific error message from failed task
        const failedTask = completedJob.tasks.find(task => task.status === 'error');
        const errorMessage = failedTask?.message || `Job failed with status: ${completedJob.status}`;

        throw new Error(errorMessage);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('❌ [CLOUDCONVERT] Detailed error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorObject: error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
        outputFormat
      };
    }
  }

  /**
   * Convert PDF to Word (DOCX)
   */
  async convertPDFToWord(
    inputPath: string,
    outputDir: string,
    filename?: string
  ): Promise<ConversionResult> {
    return this.convertPDFToOffice(inputPath, outputDir, 'docx', filename);
  }

  /**
   * Convert PDF to PowerPoint (PPTX)
   */
  async convertPDFToPowerPoint(
    inputPath: string,
    outputDir: string,
    filename?: string
  ): Promise<ConversionResult> {
    return this.convertPDFToOffice(inputPath, outputDir, 'pptx', filename);
  }

  /**
   * Convert PDF to Excel (XLSX)
   */
  async convertPDFToExcel(
    inputPath: string,
    outputDir: string,
    filename?: string
  ): Promise<ConversionResult> {
    return this.convertPDFToOffice(inputPath, outputDir, 'xlsx', filename);
  }

  /**
   * Get supported Office formats
   */
  static getSupportedFormats() {
    return Object.entries(CloudConvertPDFService.SUPPORTED_FORMATS).map(([key, value]) => ({
      format: key,
      ...value
    }));
  }

  async getJobStatus(jobId: string) {
    try {
      const job = await this.cloudConvert.jobs.get(jobId);
      return {
        id: job.id,
        status: job.status,
        created_at: job.created_at,
        started_at: job.started_at,
        ended_at: job.ended_at,
        tasks: job.tasks.map(task => ({
          name: task.name,
          operation: task.operation,
          status: task.status,
          message: task.message
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelJob(jobId: string) {
    try {
      // CloudConvert API doesn't have a direct cancel method
      console.warn('Job cancellation not implemented in CloudConvert API');
      return true;
    } catch (error) {
      throw new Error(`Failed to cancel job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listSupportedFormats() {
    return CloudConvertPDFService.getSupportedFormats();
  }

  async validatePDFFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const maxSize = 100 * 1024 * 1024; // 100MB limit

      if (stats.size > maxSize) {
        throw new Error('File size exceeds 100MB limit');
      }

      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.pdf') {
        throw new Error('File must be a PDF');
      }

      return true;
    } catch (error) {
      throw new Error(`PDF validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default CloudConvertPDFService;
