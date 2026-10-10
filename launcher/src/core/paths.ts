import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

export class FernPathManager {
  private baseDirectory: string;

  constructor(customBaseDir?: string) {
    if (customBaseDir) {
      this.baseDirectory = customBaseDir;
    } else if (process.env.FERN_HOME) {
      this.baseDirectory = process.env.FERN_HOME;
    } else if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      this.baseDirectory = path.join(appData, 'Fern Client');
    } else if (process.platform === 'darwin') {
      this.baseDirectory = path.join(os.homedir(), 'Library', 'Application Support', 'Fern Client');
    } else {
      this.baseDirectory = path.join(os.homedir(), '.fern-client');
    }
  }

  public getBaseDir(): string {
    return this.baseDirectory;
  }

  public getFernDir(): string {
    return this.baseDirectory;
  }

  public getTempDir(): string {
    return path.join(this.baseDirectory, 'temp');
  }

  public setBaseDir(dir: string): void {
    this.baseDirectory = dir;
  }

  public getLauncherDir(): string {
    return path.join(this.baseDirectory, 'launcher');
  }

  public getDataDir(): string {
    return path.join(this.baseDirectory, 'data');
  }

  public getInstallationsDir(): string {
    return path.join(this.baseDirectory, 'installations');
  }

  public getVersionsDir(): string {
    return path.join(this.baseDirectory, 'versions');
  }

  public getLibrariesDir(): string {
    return path.join(this.baseDirectory, 'libraries');
  }

  public getAssetsDir(): string {
    return path.join(this.baseDirectory, 'assets');
  }

  public getJavaDir(): string {
    return path.join(this.baseDirectory, 'java');
  }

  public getAccountsDir(): string {
    return path.join(this.baseDirectory, 'accounts');
  }

  public getModpacksDir(): string {
    return path.join(this.baseDirectory, 'modpacks');
  }

  public getInstancesDir(): string {
    return path.join(this.baseDirectory, 'instances');
  }

  public getInstanceDir(instanceId: string): string {
    return path.join(this.getInstancesDir(), instanceId);
  }

  public getInstanceModsDir(instanceId: string): string {
    return path.join(this.getInstanceDir(instanceId), 'mods');
  }

  public getInstanceConfigDir(instanceId: string): string {
    return path.join(this.getInstanceDir(instanceId), 'config');
  }

  public getInstanceResourcePacksDir(instanceId: string): string {
    return path.join(this.getInstanceDir(instanceId), 'resourcepacks');
  }

  public getInstanceShaderPacksDir(instanceId: string): string {
    return path.join(this.getInstanceDir(instanceId), 'shaderpacks');
  }

  public getInstanceSavesDir(instanceId: string): string {
    return path.join(this.getInstanceDir(instanceId), 'saves');
  }

  public getResourcePacksDir(): string {
    return path.join(this.baseDirectory, 'resourcepacks');
  }

  public getShaderPacksDir(): string {
    return path.join(this.baseDirectory, 'shaderpacks');
  }

  public getLogsDir(): string {
    return path.join(this.baseDirectory, 'logs');
  }

  public getCacheDir(): string {
    return path.join(this.baseDirectory, 'cache');
  }

  public getSettingsFilePath(): string {
    return path.join(this.getLauncherDir(), 'settings.json');
  }

  public getAccountsFilePath(): string {
    return path.join(this.getAccountsDir(), 'accounts.json');
  }

  public getInstallationsFilePath(): string {
    return path.join(this.getInstallationsDir(), 'installations.json');
  }

  public getProfilesFilePath(): string {
    return path.join(this.getLauncherDir(), 'profiles.json');
  }

  public getMinecraftDir(): string {
    return this.baseDirectory;
  }

  public getSocialDir(): string {
    return path.join(this.baseDirectory, 'social');
  }

  public getCosmeticsDir(): string {
    return path.join(this.baseDirectory, 'cosmetics');
  }

  public getBackupsDir(): string {
    return path.join(this.baseDirectory, 'backups');
  }

  public getSnapshotsDir(): string {
    return path.join(this.baseDirectory, 'snapshots');
  }

  public getWorkspacesFilePath(): string {
    return path.join(this.getLauncherDir(), 'workspaces.json');
  }

  public getTemplatesFilePath(): string {
    return path.join(this.getLauncherDir(), 'instance-templates.json');
  }

  public getScreenshotsDir(): string {
    return path.join(this.baseDirectory, 'screenshots');
  }

  /**
   * Ensures that all standard directories exist on disk.
   */
  public async initializeDirectories(): Promise<void> {
    const dirs = [
      this.getBaseDir(),
      this.getDataDir(),
      this.getLauncherDir(),
      this.getInstallationsDir(),
      this.getInstancesDir(),
      this.getVersionsDir(),
      this.getLibrariesDir(),
      this.getAssetsDir(),
      this.getJavaDir(),
      this.getAccountsDir(),
      this.getModpacksDir(),
      this.getResourcePacksDir(),
      this.getShaderPacksDir(),
      this.getLogsDir(),
      this.getCacheDir(),
      this.getTempDir(),
      this.getSocialDir(),
      this.getCosmeticsDir(),
      this.getBackupsDir(),
      this.getSnapshotsDir(),
      this.getScreenshotsDir(),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

export const defaultPathManager = new FernPathManager();
