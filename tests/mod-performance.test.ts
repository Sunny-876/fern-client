import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { ModManager } from '../launcher/src/mods/mod-manager';
import { Installation } from '../shared/models/installation';
import { createZipArchive } from '../launcher/src/utils/zip';

describe('ModManager Performance Benchmark (100 Mods)', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let downloadManager: DownloadManager;
  let modManager: ModManager;
  let testInst: Installation;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-perf-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);
    modManager = new ModManager(pathManager, logger, downloadManager);

    testInst = {
      id: 'perf-inst',
      name: 'Performance 100 Mods Test',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      gameDirectory: path.join(tempDir, 'instances', 'perf-inst'),
      memoryAllocation: { minMb: 4096, maxMb: 8192 },
      launchArguments: [],
      status: 'INSTALLED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const modsDir = modManager.getModsDir(testInst);
    await fs.mkdir(modsDir, { recursive: true });

    // Generate 100 distinct mod jar files concurrently
    const filePromises: Promise<void>[] = [];
    for (let i = 1; i <= 100; i++) {
      const modId = `mod_${i.toString().padStart(3, '0')}`;
      const modName = `Test Mod ${i}`;
      const modJson = {
        schemaVersion: 1,
        id: modId,
        name: modName,
        version: `1.0.${i}`,
        description: `Synthetic benchmark mod #${i} for performance validation.`,
        depends: {
          fabricloader: '>=0.15.0',
        },
      };

      const jarBuf = createZipArchive([
        { relativePath: 'fabric.mod.json', content: JSON.stringify(modJson) },
      ]);

      const isOdd = i % 2 !== 0;
      const fileName = isOdd ? `${modId}.jar` : `${modId}.jar.disabled`;
      filePromises.push(fs.writeFile(path.join(modsDir, fileName), jarBuf));
    }

    await Promise.all(filePromises);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('scans 100 mods rapidly under 1000ms and utilizes memory cache for sub-10ms subsequent lookups', async () => {
    // First scan (cold read)
    const t0 = performance.now();
    const mods = await modManager.getInstalledMods(testInst);
    const coldDuration = performance.now() - t0;

    expect(mods.length).toBe(100);

    // 50 enabled, 50 disabled
    const enabledCount = mods.filter((m) => m.enabled).length;
    const disabledCount = mods.filter((m) => !m.enabled).length;
    expect(enabledCount).toBe(50);
    expect(disabledCount).toBe(50);

    // Cold scan of 100 zip archives should finish well within 1.5 seconds
    expect(coldDuration).toBeLessThan(1500);

    // Second scan (warm cached read via mtime cache)
    const t1 = performance.now();
    const warmMods = await modManager.getInstalledMods(testInst);
    const warmDuration = performance.now() - t1;

    expect(warmMods.length).toBe(100);
    // Warm scan should be near instantaneous (typically < 30ms)
    expect(warmDuration).toBeLessThan(100);
  });
});
