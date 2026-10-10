import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as http from 'http';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { VersionService } from '../launcher/src/versions/version-service';
import { MinecraftVersionManifest } from '../shared/models/version';

describe('VersionService', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let versionService: VersionService;

  const mockManifest: MinecraftVersionManifest = {
    latest: {
      release: '1.21.4',
      snapshot: '24w45a',
    },
    versions: [
      {
        id: '1.21.4',
        type: 'release',
        url: 'http://example.com/1.21.4.json',
        time: '2024-12-03T12:00:00Z',
        releaseTime: '2024-12-03T12:00:00Z',
        sha1: 'sha1_release_1_21_4',
        complianceLevel: 1,
      },
      {
        id: '24w45a',
        type: 'snapshot',
        url: 'http://example.com/24w45a.json',
        time: '2024-11-06T12:00:00Z',
        releaseTime: '2024-11-06T12:00:00Z',
        sha1: 'sha1_snapshot_24w45a',
        complianceLevel: 1,
      },
      {
        id: '1.20.4',
        type: 'release',
        url: 'http://example.com/1.20.4.json',
        time: '2023-12-07T12:00:00Z',
        releaseTime: '2023-12-07T12:00:00Z',
        sha1: 'sha1_release_1_20_4',
        complianceLevel: 1,
      },
    ],
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-version-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    versionService = new VersionService(pathManager, logger);

    // Populate disk cache file directly
    await fs.mkdir(pathManager.getVersionsDir(), { recursive: true });
    await fs.writeFile(
      path.join(pathManager.getVersionsDir(), 'version_manifest_v2.json'),
      JSON.stringify(mockManifest),
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loads and parses manifest from disk cache', async () => {
    const manifest = await versionService.getManifest();
    expect(manifest.latest.release).toBe('1.21.4');
    expect(manifest.versions.length).toBe(3);
  });

  it('filters versions by type (release, snapshot, installed)', async () => {
    const releases = await versionService.getVersions({ type: 'release' });
    expect(releases.length).toBe(2);
    expect(releases.map((r) => r.id)).toContain('1.21.4');
    expect(releases.map((r) => r.id)).toContain('1.20.4');

    const snapshots = await versionService.getVersions({ type: 'snapshot' });
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].id).toBe('24w45a');
  });

  it('searches versions with case-insensitive matching', async () => {
    const results = await versionService.getVersions({ search: '21.4' });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('1.21.4');
  });

  it('detects installed version status correctly', async () => {
    const versionDir = path.join(pathManager.getVersionsDir(), '1.21.4');
    await fs.mkdir(versionDir, { recursive: true });
    await fs.writeFile(path.join(versionDir, '1.21.4.json'), '{}');
    await fs.writeFile(path.join(versionDir, '1.21.4.jar'), 'dummy jar content');

    const isInstalled = await versionService.isVersionInstalled('1.21.4');
    expect(isInstalled).toBe(true);

    const isNotInstalled = await versionService.isVersionInstalled('1.20.4');
    expect(isNotInstalled).toBe(false);

    const installedIds = await versionService.getInstalledVersionIds();
    expect(installedIds).toContain('1.21.4');
    expect(installedIds).not.toContain('1.20.4');
  });
});
