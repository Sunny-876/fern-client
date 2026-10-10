import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { ModManager } from '../launcher/src/mods/mod-manager';
import { Installation } from '../shared/models/installation';
import { Mod } from '../shared/models/mod';

describe('Dependency & Conflict Validation', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let downloadManager: DownloadManager;
  let modManager: ModManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-deps-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);
    modManager = new ModManager(pathManager, logger, downloadManager);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('detects missing declared required dependencies', () => {
    const inst: Installation = {
      id: 'test-inst',
      name: 'Test',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      gameDirectory: tempDir,
      memoryAllocation: { minMb: 2048, maxMb: 4096 },
      launchArguments: [],
      status: 'INSTALLED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Mod requiring Fabric API, but Fabric API is NOT installed
    const mods: Mod[] = [
      {
        id: 'sodium',
        name: 'Sodium',
        version: '0.5.8',
        minecraftVersions: ['1.21.4'],
        loaders: ['fabric'],
        filePath: '/fake/sodium.jar',
        fileName: 'sodium.jar',
        enabled: true,
        installedAt: Date.now(),
        dependencies: [
          { id: 'fabric-api', name: 'Fabric API', type: 'required' },
        ],
      },
    ];

    const validation = modManager.validateConflicts(inst, mods);
    expect(validation.hasConflicts).toBe(true);
    expect(validation.missingDependencies.length).toBe(1);
    expect(validation.missingDependencies[0].requiredDependency).toBe('Fabric API');
  });

  it('passes validation when required dependency is installed', () => {
    const inst: Installation = {
      id: 'test-inst',
      name: 'Test',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      gameDirectory: tempDir,
      memoryAllocation: { minMb: 2048, maxMb: 4096 },
      launchArguments: [],
      status: 'INSTALLED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mods: Mod[] = [
      {
        id: 'sodium',
        name: 'Sodium',
        version: '0.5.8',
        minecraftVersions: ['1.21.4'],
        loaders: ['fabric'],
        filePath: '/fake/sodium.jar',
        fileName: 'sodium.jar',
        enabled: true,
        installedAt: Date.now(),
        dependencies: [
          { id: 'fabric-api', name: 'Fabric API', type: 'required' },
        ],
      },
      {
        id: 'fabric-api',
        name: 'Fabric API',
        version: '0.100.0',
        minecraftVersions: ['1.21.4'],
        loaders: ['fabric'],
        filePath: '/fake/fabric-api.jar',
        fileName: 'fabric-api.jar',
        enabled: true,
        installedAt: Date.now(),
      },
    ];

    const validation = modManager.validateConflicts(inst, mods);
    expect(validation.hasConflicts).toBe(false);
    expect(validation.missingDependencies.length).toBe(0);
  });

  it('detects loader incompatibility (e.g. Forge mod in Fabric instance)', () => {
    const inst: Installation = {
      id: 'test-inst',
      name: 'Test',
      minecraftVersion: '1.21.4',
      loader: 'fabric',
      gameDirectory: tempDir,
      memoryAllocation: { minMb: 2048, maxMb: 4096 },
      launchArguments: [],
      status: 'INSTALLED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mods: Mod[] = [
      {
        id: 'forge-mod',
        name: 'Classic Forge Mod',
        version: '1.0.0',
        minecraftVersions: ['1.21.4'],
        loaders: ['forge'],
        filePath: '/fake/forge-mod.jar',
        fileName: 'forge-mod.jar',
        enabled: true,
        installedAt: Date.now(),
      },
    ];

    const validation = modManager.validateConflicts(inst, mods);
    expect(validation.hasConflicts).toBe(true);
    expect(validation.incompatibleMods.length).toBe(1);
    expect(validation.incompatibleMods[0].reason).toContain('requires [forge]');
  });
});
