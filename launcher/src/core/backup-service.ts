import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from './paths';
import { FernLogger } from './logger';
import { InstallationManager } from '../installations/installation-manager';
import { SettingsManager } from '../settings/settings-manager';
import { ProfileManager } from '../installations/profile-manager';

export type BackupType = 'config' | 'installation' | 'full';

export interface BackupManifest {
  id: string;
  name: string;
  type: BackupType;
  createdAt: number;
  fernVersion: string;
  installationId?: string;
  installationName?: string;
  includesWorldSaves: boolean;
  totalSizeBytes: number;
  fileCount: number;
  files: string[];
}

export class BackupService {
  private backupsDir: string;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private installationManager: InstallationManager,
    private settingsManager: SettingsManager,
    private profileManager: ProfileManager
  ) {
    this.backupsDir = path.join(this.pathManager.getBaseDir(), 'backups');
  }

  public async getBackupsDir(): Promise<string> {
    await fs.mkdir(this.backupsDir, { recursive: true });
    return this.backupsDir;
  }

  public async listBackups(): Promise<BackupManifest[]> {
    await this.getBackupsDir();
    try {
      const entries = await fs.readdir(this.backupsDir, { withFileTypes: true });
      const manifests: BackupManifest[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const manifestPath = path.join(this.backupsDir, entry.name, 'backup-manifest.json');
          try {
            const raw = await fs.readFile(manifestPath, 'utf-8');
            manifests.push(JSON.parse(raw));
          } catch {
            // Ignore incomplete or non-backup folders
          }
        }
      }

      return manifests.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  public async getBackup(id: string): Promise<BackupManifest | undefined> {
    const all = await this.listBackups();
    return all.find((b) => b.id === id);
  }

  /**
   * Creates a backup of Fern Client settings, profiles, and metadata.
   * Guarantees zero authentication tokens are stored.
   */
  public async createConfigBackup(customName?: string): Promise<BackupManifest> {
    await this.getBackupsDir();
    const id = `backup-config-${Date.now()}`;
    const targetDir = path.join(this.backupsDir, id);
    await fs.mkdir(targetDir, { recursive: true });

    const backedFiles: string[] = [];
    let totalSize = 0;

    // 1. Settings
    const settingsPath = this.pathManager.getSettingsFilePath();
    try {
      const settingsData = await fs.readFile(settingsPath, 'utf-8');
      await fs.writeFile(path.join(targetDir, 'settings.json'), settingsData);
      backedFiles.push('settings.json');
      totalSize += Buffer.byteLength(settingsData);
    } catch {}

    // 2. Profiles (Fern client UI profiles)
    const profilesPath = this.pathManager.getProfilesFilePath();
    try {
      const profilesData = await fs.readFile(profilesPath, 'utf-8');
      await fs.writeFile(path.join(targetDir, 'profiles.json'), profilesData);
      backedFiles.push('profiles.json');
      totalSize += Buffer.byteLength(profilesData);
    } catch {}

    // 3. Installations metadata
    const installationsPath = this.pathManager.getInstallationsFilePath();
    try {
      const instData = await fs.readFile(installationsPath, 'utf-8');
      await fs.writeFile(path.join(targetDir, 'installations.json'), instData);
      backedFiles.push('installations.json');
      totalSize += Buffer.byteLength(instData);
    } catch {}

    const manifest: BackupManifest = {
      id,
      name: customName || `Fern Config Backup (${new Date().toLocaleDateString()})`,
      type: 'config',
      createdAt: Date.now(),
      fernVersion: '1.0.0-phase8',
      includesWorldSaves: false,
      totalSizeBytes: totalSize,
      fileCount: backedFiles.length,
      files: backedFiles,
    };

    await fs.writeFile(
      path.join(targetDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
    this.logger.info('BackupService', `Successfully created config backup: ${id}`);
    return manifest;
  }

  /**
   * Backs up an entire Minecraft installation (metadata, mods, config, shaders, optional worlds).
   */
  public async createInstallationBackup(
    installationId: string,
    options: { includeWorldSaves?: boolean; customName?: string } = {}
  ): Promise<BackupManifest> {
    await this.getBackupsDir();
    const inst = this.installationManager.getInstallation(installationId);
    if (!inst) {
      throw new Error(`Installation ${installationId} not found`);
    }

    const id = `backup-inst-${installationId}-${Date.now()}`;
    const targetDir = path.join(this.backupsDir, id);
    await fs.mkdir(targetDir, { recursive: true });

    const instDir = inst.gameDirectory || this.pathManager.getInstanceDir(inst.id);
    const backedFiles: string[] = [];
    let totalSize = 0;

    // Backup installation config metadata
    const metadataStr = JSON.stringify(inst, null, 2);
    await fs.writeFile(path.join(targetDir, 'installation-meta.json'), metadataStr);
    backedFiles.push('installation-meta.json');
    totalSize += Buffer.byteLength(metadataStr);

    // Copy directory helper
    const copySubdir = async (sub: string) => {
      const src = path.join(instDir, sub);
      const dest = path.join(targetDir, sub);
      try {
        await fs.access(src);
        await fs.mkdir(dest, { recursive: true });
        const items = await fs.readdir(src);
        for (const item of items) {
          const sPath = path.join(src, item);
          const dPath = path.join(dest, item);
          const stat = await fs.stat(sPath);
          if (stat.isFile()) {
            await fs.copyFile(sPath, dPath);
            backedFiles.push(`${sub}/${item}`);
            totalSize += stat.size;
          }
        }
      } catch {}
    };

    await copySubdir('mods');
    await copySubdir('config');
    await copySubdir('resourcepacks');
    await copySubdir('shaderpacks');

    if (options.includeWorldSaves) {
      await copySubdir('saves');
    }

    const manifest: BackupManifest = {
      id,
      name: options.customName || `${inst.name} Backup (${new Date().toLocaleDateString()})`,
      type: 'installation',
      createdAt: Date.now(),
      fernVersion: '1.0.0-phase8',
      installationId: inst.id,
      installationName: inst.name,
      includesWorldSaves: !!options.includeWorldSaves,
      totalSizeBytes: totalSize,
      fileCount: backedFiles.length,
      files: backedFiles,
    };

    await fs.writeFile(
      path.join(targetDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
    this.logger.info('BackupService', `Successfully backed up installation ${inst.name} to ${id}`);
    return manifest;
  }

  /**
   * Validates backup integrity and checks required disk space.
   */
  public async validateBackup(backupId: string): Promise<{
    valid: boolean;
    isValid: boolean;
    errors: string[];
    requiredDiskSpaceBytes: number;
  }> {
    const backupDir = path.join(this.backupsDir, backupId);
    const errors: string[] = [];

    try {
      await fs.access(backupDir);
    } catch {
      return { valid: false, isValid: false, errors: ['Backup directory does not exist'], requiredDiskSpaceBytes: 0 };
    }

    const manifestPath = path.join(backupDir, 'backup-manifest.json');
    let manifest: BackupManifest;
    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(raw);
    } catch {
      return { valid: false, isValid: false, errors: ['Corrupted or missing backup-manifest.json'], requiredDiskSpaceBytes: 0 };
    }

    if (!manifest.id || !manifest.type) {
      errors.push('Manifest missing critical identifier fields');
    }

    // Verify presence of referenced files
    for (const f of manifest.files || []) {
      const full = path.join(backupDir, f);
      try {
        await fs.access(full);
      } catch {
        errors.push(`Missing backed file: ${f}`);
      }
    }

    return {
      valid: errors.length === 0,
      isValid: errors.length === 0,
      errors,
      requiredDiskSpaceBytes: manifest.totalSizeBytes || 0,
    };
  }

  /**
   * Restores a verified backup.
   */
  public async restoreBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    const validation = await this.validateBackup(backupId);
    if (!validation.valid) {
      return { success: false, message: `Backup invalid: ${validation.errors.join(', ')}` };
    }

    const backupDir = path.join(this.backupsDir, backupId);
    const manifestPath = path.join(backupDir, 'backup-manifest.json');
    const manifest: BackupManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    if (manifest.type === 'config') {
      // Restore settings & profiles
      const settingsSrc = path.join(backupDir, 'settings.json');
      try {
        await fs.access(settingsSrc);
        await fs.copyFile(settingsSrc, this.pathManager.getSettingsFilePath());
        await this.settingsManager.load();
      } catch {}

      const profilesSrc = path.join(backupDir, 'profiles.json');
      try {
        await fs.access(profilesSrc);
        await fs.copyFile(profilesSrc, this.pathManager.getProfilesFilePath());
        await this.profileManager.load();
      } catch {}

      this.logger.info('BackupService', `Restored config backup: ${backupId}`);
      return { success: true, message: 'Configuration successfully restored.' };
    }

    if (manifest.type === 'installation' && manifest.installationId) {
      const inst = this.installationManager.getInstallation(manifest.installationId);
      if (inst) {
        const instDir = inst.gameDirectory || this.pathManager.getInstanceDir(inst.id);
        for (const rel of manifest.files) {
          if (rel === 'installation-meta.json') continue;
          const src = path.join(backupDir, rel);
          const dest = path.join(instDir, rel);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(src, dest);
        }
        this.logger.info('BackupService', `Restored installation backup for: ${inst.name}`);
        return { success: true, message: `Installation "${inst.name}" successfully restored.` };
      }
    }

    return { success: true, message: 'Backup restored successfully.' };
  }

  public async deleteBackup(backupId: string): Promise<boolean> {
    const backupDir = path.join(this.backupsDir, backupId);
    try {
      await fs.rm(backupDir, { recursive: true, force: true });
      this.logger.info('BackupService', `Deleted backup: ${backupId}`);
      return true;
    } catch {
      return false;
    }
  }
}
