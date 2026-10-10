import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { CacheOptimizer } from '../launcher/src/performance/cache/cache-optimizer';

describe('CacheOptimizer & Fast File Verification', () => {
  let tempDir: string;
  let cacheOptimizer: CacheOptimizer;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fern-cache-test-'));
    cacheOptimizer = new CacheOptimizer();
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  });

  it('fails fast when file size does not match expected size without hashing', async () => {
    const filePath = path.join(tempDir, 'test.jar');
    await fs.promises.writeFile(filePath, 'dummy file content of known size', 'utf8');

    const result = await cacheOptimizer.validateFileFast(filePath, 999999, 'abc123sha1');
    expect(result.valid).toBe(false);
    expect(result.cached).toBe(false);
    expect(result.reason).toContain('Size mismatch');
  });

  it('caches successful SHA1 validations and provides fast cached hits on repeat checks', async () => {
    const filePath = path.join(tempDir, 'library.jar');
    const content = 'clean binary library stream';
    await fs.promises.writeFile(filePath, content, 'utf8');
    const expectedSha1 = crypto.createHash('sha1').update(content).digest('hex');
    const expectedSize = Buffer.byteLength(content);

    // First check: computes hash and caches result
    const firstCheck = await cacheOptimizer.validateFileFast(filePath, expectedSize, expectedSha1);
    expect(firstCheck.valid).toBe(true);
    expect(firstCheck.cached).toBe(false);
    expect(cacheOptimizer.getCacheSize()).toBe(1);

    // Second check: short-circuits via memory cache
    const secondCheck = await cacheOptimizer.validateFileFast(filePath, expectedSize, expectedSha1);
    expect(secondCheck.valid).toBe(true);
    expect(secondCheck.cached).toBe(true);
  });

  it('detects corrupted or tampered files when SHA1 does not match', async () => {
    const filePath = path.join(tempDir, 'corrupt.jar');
    await fs.promises.writeFile(filePath, 'corrupted file payload', 'utf8');

    const result = await cacheOptimizer.validateFileFast(filePath, undefined, '0000000000000000000000000000000000000000');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('SHA1 mismatch');
  });

  it('properly invalidates entries when requested', async () => {
    const filePath = path.join(tempDir, 'cached.jar');
    const content = 'sample';
    await fs.promises.writeFile(filePath, content, 'utf8');
    const sha1 = crypto.createHash('sha1').update(content).digest('hex');

    await cacheOptimizer.validateFileFast(filePath, undefined, sha1);
    expect(cacheOptimizer.getCacheSize()).toBe(1);

    cacheOptimizer.invalidate(filePath);
    expect(cacheOptimizer.getCacheSize()).toBe(0);
  });
});
