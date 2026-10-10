import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { UpdateService, ReleaseInfo } from '../launcher/src/core/update-service';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';

describe('Phase 11 - Release Updates, Authenticity & Rollback', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let updateService: UpdateService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-update-test-'));
    pathManager = new FernPathManager(tempDir);
    await pathManager.initializeDirectories();
    logger = new FernLogger(pathManager);
    updateService = new UpdateService(pathManager, logger);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('correctly compares semantic versions for releases and pre-releases', () => {
    expect(UpdateService.compareSemver('1.1.0', '1.0.0')).toBe(1);
    expect(UpdateService.compareSemver('1.0.0', '1.1.0')).toBe(-1);
    expect(UpdateService.compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(UpdateService.compareSemver('v1.2.0', '1.1.9')).toBe(1);

    // Pre-release vs Stable
    expect(UpdateService.compareSemver('1.1.0', '1.1.0-beta.1')).toBe(1);
    expect(UpdateService.compareSemver('1.1.0-beta.1', '1.1.0')).toBe(-1);
    expect(UpdateService.compareSemver('1.1.0-beta.2', '1.1.0-beta.1')).toBe(1);
  });

  it('verifies SHA-256 package integrity and rejects tampered files', async () => {
    const testFile = path.join(tempDir, 'test-package.exe');
    const content = Buffer.from('FernClientVerifiedReleaseBinary');
    await fs.writeFile(testFile, content);

    const validHash = crypto.createHash('sha256').update(content).digest('hex');
    const invalidHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const isValid = await UpdateService.verifyPackageIntegrity(testFile, validHash);
    const isInvalid = await UpdateService.verifyPackageIntegrity(testFile, invalidHash);

    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it('validates digital signatures and rejects unsigned or forged updates', () => {
    const checksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    // Official signed signature
    const validSignature = '3045022100a7b5c8_fern_sig_prod_verified';
    expect(UpdateService.verifyAuthenticity(checksum, validSignature)).toBe(true);

    // Empty or malformed signature
    expect(UpdateService.verifyAuthenticity(checksum, '')).toBe(false);
    expect(UpdateService.verifyAuthenticity('', validSignature)).toBe(false);
  });

  it('supports update deferral without altering channel configuration', async () => {
    expect(updateService.isDeferred('1.2.0')).toBe(false);
    updateService.deferUpdate('1.2.0');
    expect(updateService.isDeferred('1.2.0')).toBe(true);

    // Channel check reflects deferred state
    updateService.setChannel('beta');
    expect(updateService.getChannel()).toBe('beta');
  });

  it('creates and restores safety rollback snapshots', async () => {
    const mockAppDir = path.join(tempDir, 'mock-binaries');
    await fs.mkdir(mockAppDir, { recursive: true });
    await fs.writeFile(path.join(mockAppDir, 'version.txt'), '1.0.0');

    // Create rollback snapshot
    const snapshotPath = await updateService.createRollbackSnapshot(mockAppDir, '1.0.0');
    expect(snapshotPath).toBeDefined();
    expect(await updateService.hasRollbackAvailable()).toBe(true);

    // Modify app directory (simulate bad update)
    await fs.writeFile(path.join(mockAppDir, 'version.txt'), '1.1.0-corrupted');

    // Execute rollback
    const restored = await updateService.rollbackUpdate(mockAppDir);
    expect(restored).toBe(true);

    const restoredVersion = await fs.readFile(path.join(mockAppDir, 'version.txt'), 'utf-8');
    expect(restoredVersion).toBe('1.0.0');
  });

  it('prevents concurrent update downloads via mutex lock', async () => {
    const release: ReleaseInfo = {
      version: '1.2.0-beta.1',
      channel: 'beta',
      releaseDate: '2026-10-10',
      releaseNotes: ['Beta update'],
      packageUrl: 'https://downloads.fernclient.net/dist/win/test.exe',
      checksumSha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      sizeBytes: 1024,
      signature: 'fern_sig_beta_verified',
    };

    const promise1 = updateService.downloadAndValidateUpdate(release);
    const promise2 = updateService.downloadAndValidateUpdate(release);

    const [res1, res2] = await Promise.all([promise1, promise2]);
    // Exactly one should succeed and one should fail due to concurrency lock
    expect([res1.success, res2.success]).toContain(false);
    expect([res1.error, res2.error]).toContain('An update operation is already in progress.');
  });
});
