/**
 * Conversion Mutex Service
 * Prevents multiple PDF conversions from running simultaneously to avoid resource conflicts
 */

class ConversionMutex {
  private static isProcessing = false;
  private static queue: Array<{
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    jobId: string;
  }> = [];

  /**
   * Acquire lock for conversion processing
   */
  static async acquire(jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isProcessing) {
        this.isProcessing = true;
        console.log(`🔒 [MUTEX] Lock acquired for job: ${jobId}`);
        resolve(undefined);
      } else {
        console.log(`⏳ [MUTEX] Job queued: ${jobId} (${this.queue.length + 1} in queue)`);
        this.queue.push({ resolve, reject, jobId });
      }
    });
  }

  /**
   * Release lock and process next job in queue
   */
  static release(jobId: string): void {
    console.log(`🔓 [MUTEX] Lock released for job: ${jobId}`);
    this.isProcessing = false;

    // Process next job in queue
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.isProcessing = true;
        console.log(`🔄 [MUTEX] Processing next queued job: ${next.jobId}`);
        next.resolve(undefined);
      }
    }
  }

  /**
   * Get current queue status
   */
  static getStatus(): { isProcessing: boolean; queueLength: number } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length
    };
  }

  /**
   * Force clear all locks (emergency use)
   */
  static forceReset(): void {
    console.log(`💥 [MUTEX] Force resetting all locks and clearing queue`);
    this.isProcessing = false;
    this.queue.forEach(item => {
      item.reject(new Error('Mutex force reset'));
    });
    this.queue = [];
  }
}

export { ConversionMutex };