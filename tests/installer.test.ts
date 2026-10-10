import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { VersionService } from '../launcher/src/versions/version-service';
import { DownloadManager } from '../launcher/src/downloads/download-manager';
import { MinecraftInstallerService } from '../launcher/src/installations/installer-service';
import { MinecraftLibrary, AssetIndexPayload } from '../shared/models/version';

describe('MinecraftInstallerService', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let versionService: VersionService;
  let downloadManager: DownloadManager;
  let installerService: MinecraftInstallerService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-installer-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    downloadManager = new DownloadManager(logger);
    versionService = new VersionService(pathManager, logger);
    installerService = new MinecraftInstallerService(pathManager, versionService, downloadManager, logger);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('correctly evaluates OS compatibility rules for libraries', () => {
    // 1. No rules -> allowed everywhere
    expect(installerService.isLibraryAllowed(undefined, 'windows')).toBe(true);
    expect(installerService.isLibraryAllowed([], 'osx')).toBe(true);

    // 2. Allow rule for osx only
    const osxOnly = [{ action: 'allow' as const, os: { name: 'osx' as const } }];
    expect(installerService.isLibraryAllowed(osxOnly, 'osx')).toBe(true);
    expect(installerService.isLibraryAllowed(osxOnly, 'windows')).toBe(false);
    expect(installerService.isLibraryAllowed(osxOnly, 'linux')).toBe(false);

    // 3. Disallow rule for windows
    const disallowWindows = [
      { action: 'allow' as const },
      { action: 'disallow' as const, os: { name: 'windows' as const } },
    ];
    expect(installerService.isLibraryAllowed(disallowWindows, 'windows')).toBe(false);
    expect(installerService.isLibraryAllowed(disallowWindows, 'linux')).toBe(true);
    expect(installerService.isLibraryAllowed(disallowWindows, 'osx')).toBe(true);
  });

  it('resolves library downloads from metadata', () => {
    const mockLibs: MinecraftLibrary[] = [
      {
        name: 'com.mojang:authlib:6.0.55',
        downloads: {
          artifact: {
            path: 'com/mojang/authlib/6.0.55/authlib-6.0.55.jar',
            sha1: 'abcdef1234567890abcdef1234567890abcdef12',
            size: 1024,
            url: 'https://libraries.minecraft.net/com/mojang/authlib/6.0.55/authlib-6.0.55.jar',
          },
        },
      },
      {
        name: 'org.lwjgl:lwjgl-jemalloc:3.3.3',
        rules: [{ action: 'allow', os: { name: 'osx' } }],
        downloads: {
          artifact: {
            path: 'org/lwjgl/lwjgl-jemalloc/3.3.3/lwjgl-jemalloc-3.3.3.jar',
            sha1: '1234567890abcdef1234567890abcdef12345678',
            size: 2048,
            url: 'https://libraries.minecraft.net/org/lwjgl/lwjgl-jemalloc/3.3.3/lwjgl-jemalloc-3.3.3.jar',
          },
        },
      },
    ];

    const resolved = installerService.resolveLibraryDownloads(mockLibs);
    // On Windows, the osx-only library should be excluded
    const currentOs = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    if (currentOs === 'windows') {
      expect(resolved.length).toBe(1);
      expect(resolved[0].id).toBe('com.mojang:authlib:6.0.55');
      expect(resolved[0].expectedSha1).toBe('abcdef1234567890abcdef1234567890abcdef12');
    }
  });

  it('resolves asset download items to Mojang CDN prefix hash URLs', () => {
    const mockIndex: AssetIndexPayload = {
      objects: {
        'icons/icon_16x16.png': {
          hash: 'bdf48ef6b5d0d23ebb5deec60d8632c5877e41b9',
          size: 1540,
        },
        'sounds/ambient/cave/cave1.ogg': {
          hash: 'c81e728d9d4c2f636f067f89cc14862c1ecd7700',
          size: 12044,
        },
      },
    };

    const assetItems = installerService.resolveAssetDownloads(mockIndex);
    expect(assetItems.length).toBe(2);

    const first = assetItems.find((a) => a.id === 'bdf48ef6b5d0d23ebb5deec60d8632c5877e41b9');
    expect(first).toBeDefined();
    expect(first?.url).toBe('https://resources.download.minecraft.net/bd/bdf48ef6b5d0d23ebb5deec60d8632c5877e41b9');
    expect(first?.destination).toContain(path.join('assets', 'objects', 'bd', 'bdf48ef6b5d0d23ebb5deec60d8632c5877e41b9'));
  });
});
