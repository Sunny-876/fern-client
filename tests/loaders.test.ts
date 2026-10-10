import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { ModLoaderManager } from '../launcher/src/loaders/loader-manager';
import { Installation } from '../shared/models/installation';

describe('ModLoaderManager & Loaders', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let downloadManager: DownloadManager;
  let loaderManager: ModLoaderManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-loaders-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);
    loaderManager = new ModLoaderManager(pathManager, logger, downloadManager);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('lists all supported mod loaders', () => {
    const loaders = loaderManager.getAvailableLoaders();
    const ids = loaders.map((l) => l.id);
    expect(ids).toContain('vanilla');
    expect(ids).toContain('fabric');
    expect(ids).toContain('quilt');
    expect(ids).toContain('forge');
    expect(ids).toContain('neoforge');
  });

  it('validates compatibility restrictions for NeoForge', () => {
    // 1.20.1 is incompatible with NeoForge
    const oldRes = loaderManager.checkCompatibility('1.20.1', 'neoforge');
    expect(oldRes.compatible).toBe(false);
    expect(oldRes.reason).toBeDefined();

    // 1.20.4 is compatible
    const okRes = loaderManager.checkCompatibility('1.20.4', 'neoforge');
    expect(okRes.compatible).toBe(true);

    // Fabric is compatible
    const fabricRes = loaderManager.checkCompatibility('1.21.4', 'fabric');
    expect(fabricRes.compatible).toBe(true);
  });

  it('provides launch info with KnotClient for Fabric installations', async () => {
    const inst: Installation = {
      id: 'test-fabric',
      name: 'Fabric Instance',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      loaderVersion: '0.16.10',
      gameDirectory: path.join(tempDir, 'instances', 'test-fabric'),
      memoryAllocation: { minMb: 2048, maxMb: 4096 },
      launchArguments: [],
      status: 'INSTALLED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const info = await loaderManager.getLaunchInfo(inst);
    expect(info.mainClass).toBe('net.fabricmc.loader.impl.launch.knot.KnotClient');
    expect(info.libraries.length).toBeGreaterThan(0);
    expect(info.libraries.some((l) => l.name.includes('fabric-loader'))).toBe(true);
  });

  it('installs and validates Fabric profile', async () => {
    const inst: Installation = {
      id: 'inst-install',
      name: 'Test Inst',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      loaderVersion: '0.16.10',
      gameDirectory: path.join(tempDir, 'instances', 'inst-install'),
      memoryAllocation: { minMb: 2048, maxMb: 4096 },
      launchArguments: [],
      status: 'NOT_INSTALLED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const res = await loaderManager.installLoader(inst, '0.16.10');
    expect(res.success).toBe(true);
    expect(res.loaderType).toBe('fabric');

    const isValid = await loaderManager.validateLoader({ ...inst, loaderVersion: '0.16.10' });
    expect(isValid).toBe(true);
  }, 15000);
});
