import { EventEmitter } from 'events';

/**
 * Mock Redis implementation for local development
 * This is a simple in-memory store that mimics Redis basic functionality
 */
export class MockRedis extends EventEmitter {
  private store: Map<string, any> = new Map();
  private ttlStore: Map<string, number> = new Map();

  constructor() {
    super();
    // Emit connect event after a short delay to simulate connection
    setTimeout(() => this.emit('connect'), 100);
  }

  // Basic Redis commands
  async set(key: string, value: any, ...args: any[]): Promise<string> {
    this.store.set(key, value);

    // Handle TTL if provided
    const ttlIndex = args.indexOf('EX');
    if (ttlIndex !== -1 && args[ttlIndex + 1]) {
      const ttl = parseInt(args[ttlIndex + 1]) * 1000; // Convert to milliseconds
      this.ttlStore.set(key, Date.now() + ttl);

      // Auto-expire the key
      setTimeout(() => {
        this.store.delete(key);
        this.ttlStore.delete(key);
      }, ttl);
    }

    return 'OK';
  }

  async get(key: string): Promise<any> {
    // Check if key has expired
    if (this.ttlStore.has(key) && Date.now() > this.ttlStore.get(key)!) {
      this.store.delete(key);
      this.ttlStore.delete(key);
      return null;
    }

    return this.store.get(key) || null;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.ttlStore.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());

    if (pattern === '*') {
      return allKeys;
    }

    // Simple pattern matching (only supports * wildcard)
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async flushall(): Promise<string> {
    this.store.clear();
    this.ttlStore.clear();
    return 'OK';
  }

  async quit(): Promise<string> {
    this.emit('end');
    return 'OK';
  }

  // List operations for Bull queue compatibility
  async lpush(key: string, ...values: any[]): Promise<number> {
    let list = this.store.get(key) || [];
    if (!Array.isArray(list)) list = [];

    list.unshift(...values);
    this.store.set(key, list);
    return list.length;
  }

  async rpop(key: string): Promise<any> {
    const list = this.store.get(key);
    if (!Array.isArray(list) || list.length === 0) return null;

    const value = list.pop();
    this.store.set(key, list);
    return value;
  }

  async llen(key: string): Promise<number> {
    const list = this.store.get(key);
    return Array.isArray(list) ? list.length : 0;
  }

  // Hash operations
  async hset(key: string, field: string, value: any): Promise<number> {
    let hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') {
      hash = {};
    }

    const isNew = !(field in hash);
    hash[field] = value;
    this.store.set(key, hash);
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<any> {
    const hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') return null;
    return hash[field] || null;
  }

  async hgetall(key: string): Promise<any> {
    const hash = this.store.get(key);
    return (hash && typeof hash === 'object') ? hash : {};
  }
}

// Mock Bull Queue for development
export class MockQueue extends EventEmitter {
  private jobs: Map<string, any> = new Map();
  private processors: Map<string, Function> = new Map();
  private jobIdCounter = 1;

  constructor(public name: string, public options: any = {}) {
    super();
  }

  async add(jobType: string, data: any, options: any = {}): Promise<any> {
    const jobId = options.jobId || `job_${this.jobIdCounter++}`;
    const job = {
      id: jobId,
      type: jobType,
      data,
      options,
      timestamp: Date.now(),
      status: 'waiting',
      progress: () => this.jobs.get(jobId)?.progress || 0,
      update: (progress: number) => {
        const currentJob = this.jobs.get(jobId);
        if (currentJob) {
          currentJob.progress = progress;
          this.jobs.set(jobId, currentJob);
        }
      }
    };

    this.jobs.set(jobId, { ...job, progress: 0, status: 'waiting' });

    // Process job asynchronously
    setTimeout(() => {
      this.processJob(job);
    }, options.delay || 0);

    return job;
  }

  process(jobType: string, concurrency: number | Function, processor?: Function): void {
    if (typeof concurrency === 'function') {
      processor = concurrency;
      concurrency = 1;
    }

    if (processor) {
      this.processors.set(jobType, processor);
    }
  }

  private async processJob(job: any): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      console.warn(`No processor found for job type: ${job.type}`);
      return;
    }

    try {
      // Update job status to active
      const currentJob = this.jobs.get(job.id);
      if (currentJob) {
        currentJob.status = 'active';
        this.jobs.set(job.id, currentJob);
      }

      this.emit('active', job);
      const result = await processor(job);

      // Update job status to completed
      if (currentJob) {
        currentJob.status = 'completed';
        this.jobs.set(job.id, currentJob);
      }

      this.emit('completed', job, result);
    } catch (error) {
      // Update job status to failed
      const currentJob = this.jobs.get(job.id);
      if (currentJob) {
        currentJob.status = 'failed';
        this.jobs.set(job.id, currentJob);
      }

      this.emit('failed', job, error);
    }
  }

  async getJob(jobId: string): Promise<any> {
    return this.jobs.get(jobId) || null;
  }

  async close(): Promise<void> {
    this.emit('close');
  }

  // Queue status methods for health checks
  async waiting(): Promise<any[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === 'waiting');
  }

  async active(): Promise<any[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === 'active');
  }

  async completed(): Promise<any[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === 'completed');
  }

  async failed(): Promise<any[]> {
    return Array.from(this.jobs.values()).filter(job => job.status === 'failed');
  }

  // Event handlers
  override on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

export default MockRedis;