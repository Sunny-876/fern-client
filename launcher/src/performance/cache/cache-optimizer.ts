import * as fs from 'fs';
import * as crypto from 'crypto';
import { FernLogger } from '../../core/logger';

export interface CacheEntry {
  path: string;
  size: number;
  mtimeMs: number;
  sha1: string;
  validatedAt: number;
}

export class CacheOptimizer {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private validationTtlMs: number = 3600_000; // 1 hour memory TTL

  constructor(private logger?: FernLogger) {}

  /**
   * Validates a file on disk against expected size and SHA1 with fast-path short-circuiting.
   * If the file size matches and mtime is unchanged, returns cached validation result without re-reading the entire file.
   */
  public async validateFileFast(
    filePath: string,
    expectedSize?: number,
    expectedSha1?: string
  ): Promise<{ valid: boolean; cached: boolean; reason?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, cached: false, reason: 'File does not exist' };
      }

      const stat = await fs.promises.stat(filePath);

      // Fast check 1: Size mismatch check
      if (expectedSize !== undefined && stat.size !== expectedSize) {
        return {
          valid: false,
          cached: false,
          reason: `Size mismatch: disk=${stat.size}, expected=${expectedSize}`,
        };
      }

      // Fast check 2: Check memory cache hit
      const cached = this.memoryCache.get(filePath);
      const now = Date.now();
      if (
        cached &&
        cached.size === stat.size &&
        cached.mtimeMs === stat.mtimeMs &&
        now - cached.validatedAt < this.validationTtlMs
      ) {
        if (!expectedSha1 || cached.sha1 === expectedSha1.toLowerCase()) {
          return { valid: true, cached: true };
        }
      }

      // If SHA1 is required and not cached, compute hash
      if (expectedSha1) {
        const computedSha1 = await this.computeSha1(filePath);
        if (computedSha1 !== expectedSha1.toLowerCase()) {
          return {
            valid: false,
            cached: false,
            reason: `SHA1 mismatch: disk=${computedSha1}, expected=${expectedSha1}`,
          };
        }

        // Store validated entry
        this.memoryCache.set(filePath, {
          path: filePath,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          sha1: computedSha1,
          validatedAt: now,
        });
      }

      return { valid: true, cached: false };
    } catch (err: any) {
      return { valid: false, cached: false, reason: err.message };
    }
  }

  public invalidate(filePath: string): void {
    this.memoryCache.delete(filePath);
  }

  public clear(): void {
    this.memoryCache.clear();
  }

  public getCacheSize(): number {
    return this.memoryCache.size;
  }

  private async computeSha1(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
      stream.on('error', (err) => reject(err));
    });
  }
}
