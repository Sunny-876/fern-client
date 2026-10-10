import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { UpdateService } from '../launcher/src/core/update-service';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';

describe('Phase 8: Update System & Rollback Recovery', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let updateService: UpdateService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-updates-phase8-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);
    updateService = new UpdateService(paths, logger);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('correctly compares semantic versions', () => {
    // 1.0.0 vs 1.1.0 -> -1
    expect(UpdateService.compareSemver('1.0.0', '1.1.0')).toBe(-1);
    // 1.1.0 vs 1.0.0 -> 1
    expect(UpdateService.compareSemver('1.1.0', '1.0.0')).toBe(1);
    // 1.0.0 vs 1.0.0 -> 0
    expect(UpdateService.compareSemver('1.0.0', '1.0.0')).toBe(0);
    // 1.0.1 vs 1.0.0 -> 1
    expect(UpdateService.compareSemver('1.0.1', '1.0.0')).toBe(1);
    // 2.0.0 vs 1.9.9 -> 1
    expect(UpdateService.compareSemver('2.0.0', '1.9.9')).toBe(1);
    // Beta versions
    expect(UpdateService.compareSemver('1.0.0-beta.2', '1.0.0-beta.1')).toBe(1);
    expect(UpdateService.compareSemver('1.0.0', '1.0.0-beta.1')).toBe(1);
  });

  it('supports update channels (Stable vs Beta) with Stable as default', () => {
    expect(updateService.getChannel()).toBe('stable');

    updateService.setChannel('beta');
    expect(updateService.getChannel()).toBe('beta');

    updateService.setChannel('stable');
    expect(updateService.getChannel()).toBe('stable');
  });

  it('validates package integrity via SHA-256 hash calculation', async () => {
    const testFile = path.join(tempDir, 'update-pkg.tar');
    const content = 'fern-client-update-binary-payload-data';
    fs.writeFileSync(testFile, content, 'utf8');

    const expectedSha256 = crypto.createHash('sha256').update(content).digest('hex');

    expect(await UpdateService.verifyPackageIntegrity(testFile, expectedSha256)).toBe(true);
    expect(await UpdateService.verifyPackageIntegrity(testFile, 'bad-hash-abc-123')).toBe(false);
  });

  it('creates and restores rollback snapshot if update fails', async () => {
    // Create simulated original launcher files
    const appDir = path.join(tempDir, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(path.join(appDir, 'FernClient.exe'), 'ORIGINAL_BINARY_V1', 'utf8');
    fs.writeFileSync(path.join(appDir, 'version.json'), '{"version":"1.0.0"}', 'utf8');

    expect(await updateService.hasRollbackAvailable()).toBe(false);

    // Create rollback snapshot
    await updateService.createRollbackSnapshot(appDir, '1.0.0');

    expect(await updateService.hasRollbackAvailable()).toBe(true);

    // Simulate corrupted update replacing executable
    fs.writeFileSync(path.join(appDir, 'FernClient.exe'), 'CORRUPTED_BINARY_V2', 'utf8');
    expect(fs.readFileSync(path.join(appDir, 'FernClient.exe'), 'utf8')).toBe('CORRUPTED_BINARY_V2');

    // Trigger rollback restoration
    const restored = await updateService.rollbackUpdate(appDir);
    expect(restored).toBe(true);

    // Assert original binary is restored
    expect(fs.readFileSync(path.join(appDir, 'FernClient.exe'), 'utf8')).toBe('ORIGINAL_BINARY_V1');
  });
});
