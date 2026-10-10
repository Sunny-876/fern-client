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

describe('ModManager Lifecycle & Toggling', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let downloadManager: DownloadManager;
  let modManager: ModManager;
  let testInst: Installation;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-modmgr-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);
    modManager = new ModManager(pathManager, logger, downloadManager);

    testInst = {
      id: 'test-inst',
      name: 'Test Instance',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      gameDirectory: path.join(tempDir, 'instances', 'test-inst'),
      memoryAllocation: { minMb: 2048, maxMb: 4096 },
      launchArguments: [],
      status: 'INSTALLED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const modsDir = modManager.getModsDir(testInst);
    await fs.mkdir(modsDir, { recursive: true });

    // Populate mock mods
    const sodiumJar = createZipArchive([
      {
        relativePath: 'fabric.mod.json',
        content: JSON.stringify({ id: 'sodium', name: 'Sodium', version: '0.5.8' }),
      },
    ]);
    const lithiumJar = createZipArchive([
      {
        relativePath: 'fabric.mod.json',
        content: JSON.stringify({ id: 'lithium', name: 'Lithium', version: '0.12.0' }),
      },
    ]);

    await fs.writeFile(path.join(modsDir, 'sodium.jar'), sodiumJar);
    await fs.writeFile(path.join(modsDir, 'lithium.jar'), lithiumJar);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('scans and returns installed mods', async () => {
    const mods = await modManager.getInstalledMods(testInst);
    expect(mods.length).toBe(2);
    expect(mods.map((m) => m.name)).toContain('Sodium');
    expect(mods.map((m) => m.name)).toContain('Lithium');
    expect(mods.every((m) => m.enabled)).toBe(true);
  });

  it('toggles a mod between active (.jar) and disabled (.jar.disabled)', async () => {
    const mods = await modManager.getInstalledMods(testInst);
    const sodium = mods.find((m) => m.id === 'sodium')!;

    // Toggle off
    const toggledOff = await modManager.toggleMod(testInst, sodium.filePath);
    expect(toggledOff.enabled).toBe(false);
    expect(toggledOff.fileName.endsWith('.disabled')).toBe(true);

    const reloaded = await modManager.getInstalledMods(testInst);
    const updatedSodium = reloaded.find((m) => m.id === 'sodium')!;
    expect(updatedSodium.enabled).toBe(false);

    // Toggle back on
    const toggledOn = await modManager.toggleMod(testInst, toggledOff.filePath);
    expect(toggledOn.enabled).toBe(true);
    expect(toggledOn.fileName.endsWith('.disabled')).toBe(false);
  });

  it('disables all mods and re-enables all mods', async () => {
    await modManager.disableAll(testInst);
    let mods = await modManager.getInstalledMods(testInst);
    expect(mods.every((m) => !m.enabled)).toBe(true);

    await modManager.enableAll(testInst);
    mods = await modManager.getInstalledMods(testInst);
    expect(mods.every((m) => m.enabled)).toBe(true);
  });

  it('safely removes a mod file from disk', async () => {
    const mods = await modManager.getInstalledMods(testInst);
    const lithium = mods.find((m) => m.id === 'lithium')!;

    await modManager.removeMod(testInst, lithium.filePath);

    const reloaded = await modManager.getInstalledMods(testInst);
    expect(reloaded.length).toBe(1);
    expect(reloaded.find((m) => m.id === 'lithium')).toBeUndefined();
  });
});
