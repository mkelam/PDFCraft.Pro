/**
 * 🧹 FILE CLEANUP UTILITY
 * Replaces LibreOffice-dependent PDFService cleanup methods
 */

import { promises as fs } from 'fs';
import path from 'path';

export class FileCleanupUtil {
  /**
   * Clean up temporary files (replaces PDFService.cleanupFiles)
   */
  static async cleanupFiles(filePaths: string[]): Promise<void> {
    console.log(`🧹 [FILE-CLEANUP] Cleaning up ${filePaths.length} files...`);

    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
        console.log(`✅ [FILE-CLEANUP] Deleted: ${path.basename(filePath)}`);
      } catch (error) {
        // File might not exist or already deleted - not an error
        if ((error as any).code !== 'ENOENT') {
          console.warn(`⚠️ [FILE-CLEANUP] Failed to delete ${filePath}:`, error);
        }
      }
    });

    await Promise.all(cleanupPromises);
  }

  /**
   * Clean up files in a directory older than specified time
   */
  static async cleanupOldFiles(
    directory: string,
    maxAgeMinutes: number = 60
  ): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
      const filesToDelete: string[] = [];

      for (const file of files) {
        const filePath = path.join(directory, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            filesToDelete.push(filePath);
          }
        } catch (error) {
          // Skip files we can't stat
        }
      }

      if (filesToDelete.length > 0) {
        console.log(`🧹 [FILE-CLEANUP] Cleaning up ${filesToDelete.length} old files from ${directory}`);
        await this.cleanupFiles(filesToDelete);
      }
    } catch (error) {
      console.warn(`⚠️ [FILE-CLEANUP] Failed to cleanup directory ${directory}:`, error);
    }
  }

  /**
   * Ensure directory exists
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}