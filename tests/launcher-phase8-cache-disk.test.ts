import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CacheService } from '../launcher/src/core/cache-service';
import { DiskService } from '../launcher/src/core/disk-service';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';

describe('Phase 8: Cache Manager & Disk Space Service', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let cacheService: CacheService;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-cache-phase8-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);
    cacheService = new CacheService(paths, logger);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('calculates cache breakdown correctly across directories', async () => {
    // Populate fake minecraft client file
    const versionsDir = paths.getVersionsDir();
    const v121Dir = path.join(versionsDir, '1.21.4');
    fs.mkdirSync(v121Dir, { recursive: true });
    fs.writeFileSync(path.join(v121Dir, '1.21.4.jar'), Buffer.alloc(1024 * 1024)); // 1 MB

    // Populate fake libraries
    const libsDir = paths.getLibrariesDir();
    fs.mkdirSync(libsDir, { recursive: true });
    fs.writeFileSync(path.join(libsDir, 'authlib.jar'), Buffer.alloc(512 * 1024)); // 512 KB

    // Populate temporary mod metadata cache
    const cacheModsDir = path.join(paths.getFernDir(), 'cache', 'mods');
    fs.mkdirSync(cacheModsDir, { recursive: true });
    fs.writeFileSync(path.join(cacheModsDir, 'mod-meta.json'), Buffer.alloc(256 * 1024)); // 256 KB

    // Populate thumbnails cache
    const thumbsDir = path.join(paths.getFernDir(), 'cache', 'thumbnails');
    fs.mkdirSync(thumbsDir, { recursive: true });
    fs.writeFileSync(path.join(thumbsDir, 'icon.png'), Buffer.alloc(128 * 1024)); // 128 KB

    const breakdown = await cacheService.getCacheBreakdown();

    expect(breakdown.minecraftFilesBytes).toBeGreaterThanOrEqual(1024 * 1024);
    expect(breakdown.librariesBytes).toBeGreaterThanOrEqual(512 * 1024);
    expect(breakdown.modMetadataBytes).toBeGreaterThanOrEqual(256 * 1024);
    expect(breakdown.thumbnailsBytes).toBeGreaterThanOrEqual(128 * 1024);
    expect(breakdown.totalBytes).toBeGreaterThan(0);
    expect(breakdown.formatted.total).toBeDefined();
  });

  it('cleans safe caches while preserving required Minecraft files and libraries', async () => {
    // Crucial core files: MUST NOT BE DELETED
    const vDir = path.join(paths.getVersionsDir(), '1.21.4');
    fs.mkdirSync(vDir, { recursive: true });
    const clientJar = path.join(vDir, '1.21.4.jar');
    fs.writeFileSync(clientJar, 'IMPORTANT_MC_CLIENT_JAR', 'utf8');

    const libFile = path.join(paths.getLibrariesDir(), 'essential.jar');
    fs.writeFileSync(libFile, 'IMPORTANT_LIBRARY', 'utf8');

    // Safe transient cache files: MUST BE DELETED
    const thumbsDir = path.join(paths.getFernDir(), 'cache', 'thumbnails');
    fs.mkdirSync(thumbsDir, { recursive: true });
    const thumbFile = path.join(thumbsDir, 'temp-thumb.png');
    fs.writeFileSync(thumbFile, 'TEMP_THUMBNAIL', 'utf8');

    const tempDirLoc = paths.getTempDir();
    fs.mkdirSync(tempDirLoc, { recursive: true });
    const tempDownload = path.join(tempDirLoc, 'partial-download.tmp');
    fs.writeFileSync(tempDownload, 'PARTIAL_DOWNLOAD', 'utf8');

    // Perform safe cache clear
    const res = await cacheService.clearSafeCache();
    expect(res.freedBytes).toBeGreaterThan(0);

    // Assert transient files removed
    expect(fs.existsSync(thumbFile)).toBe(false);
    expect(fs.existsSync(tempDownload)).toBe(false);

    // CRITICAL INTEGRITY ASSERTION: Core Minecraft files are intact
    expect(fs.existsSync(clientJar)).toBe(true);
    expect(fs.existsSync(libFile)).toBe(true);
  });

  it('validates disk space requirements against available space', async () => {
    // Current working drive check
    const check = await DiskService.checkDiskSpace(tempDir, 1024 * 1024); // 1 MB required
    expect(check.requiredBytes).toBe(1024 * 1024);
    expect(check.availableBytes).toBeGreaterThan(0);
    expect(check.hasEnough).toBe(true);

    // Requesting impossible amount of space (100 Petabytes)
    const impossibleBytes = 100 * 1024 * 1024 * 1024 * 1024 * 1024;
    const checkFail = await DiskService.checkDiskSpace(tempDir, impossibleBytes);
    expect(checkFail.hasEnough).toBe(false);
  });
});
