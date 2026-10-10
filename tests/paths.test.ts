import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';

describe('FernPathManager', () => {
  let tempDir: string;
  let pathManager: FernPathManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-paths-test-'));
    pathManager = new FernPathManager(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('correctly resolves subdirectories within the base directory', () => {
    expect(pathManager.getBaseDir()).toBe(tempDir);
    expect(pathManager.getLauncherDir()).toBe(path.join(tempDir, 'launcher'));
    expect(pathManager.getInstallationsDir()).toBe(path.join(tempDir, 'installations'));
    expect(pathManager.getVersionsDir()).toBe(path.join(tempDir, 'versions'));
    expect(pathManager.getLibrariesDir()).toBe(path.join(tempDir, 'libraries'));
    expect(pathManager.getAssetsDir()).toBe(path.join(tempDir, 'assets'));
    expect(pathManager.getJavaDir()).toBe(path.join(tempDir, 'java'));
    expect(pathManager.getAccountsDir()).toBe(path.join(tempDir, 'accounts'));
    expect(pathManager.getModpacksDir()).toBe(path.join(tempDir, 'modpacks'));
    expect(pathManager.getResourcePacksDir()).toBe(path.join(tempDir, 'resourcepacks'));
    expect(pathManager.getShaderPacksDir()).toBe(path.join(tempDir, 'shaderpacks'));
    expect(pathManager.getLogsDir()).toBe(path.join(tempDir, 'logs'));
    expect(pathManager.getCacheDir()).toBe(path.join(tempDir, 'cache'));
  });

  it('creates all required directories on initialization', async () => {
    await pathManager.initializeDirectories();

    const expectedDirs = [
      pathManager.getLauncherDir(),
      pathManager.getInstallationsDir(),
      pathManager.getVersionsDir(),
      pathManager.getLibrariesDir(),
      pathManager.getAssetsDir(),
      pathManager.getJavaDir(),
      pathManager.getAccountsDir(),
      pathManager.getModpacksDir(),
      pathManager.getResourcePacksDir(),
      pathManager.getShaderPacksDir(),
      pathManager.getLogsDir(),
      pathManager.getCacheDir(),
    ];

    for (const dir of expectedDirs) {
      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    }
  });
});
