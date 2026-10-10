import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Installation,
  CreateInstallationDTO,
  UpdateInstallationDTO,
  InstallationStatus,
  InstallationProgressInfo,
} from '../../../shared/models/installation';
import { DEFAULT_INSTALLATIONS } from '../../../shared/config/defaults';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';
import { VersionService } from '../versions/version-service';
import { createZipArchive, readZipEntries } from '../utils/zip';

interface StoredInstallationsData {
  version: number;
  activeInstallationId: string | null;
  installations: Installation[];
}

export class InstallationManager {
  private installations: Map<string, Installation> = new Map();
  private activeInstallationId: string | null = null;
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private versionService?: VersionService
  ) {}

  public async load(): Promise<void> {
    const filePath = this.pathManager.getInstallationsFilePath();

    try {
      await fs.access(filePath);
      const raw = await fs.readFile(filePath, 'utf-8');
      const data: StoredInstallationsData = JSON.parse(raw);

      this.installations.clear();
      if (Array.isArray(data.installations)) {
        for (const inst of data.installations) {
          const minRam = inst.minMemory || inst.memoryAllocation?.minMb || 2048;
          const maxRam = inst.maxMemory || inst.memoryAllocation?.maxMb || 4096;

          this.installations.set(inst.id, {
            ...inst,
            versionId: inst.versionId || inst.minecraftVersion,
            minMemory: minRam,
            maxMemory: maxRam,
            memoryAllocation: {
              minMb: minRam,
              maxMb: maxRam,
            },
            status: inst.status || 'NOT_INSTALLED',
          });
        }
      }

      this.activeInstallationId = data.activeInstallationId || null;

      if (!this.activeInstallationId || !this.installations.has(this.activeInstallationId)) {
        const first = this.installations.keys().next().value;
        this.activeInstallationId = first || null;
      }

      this.isLoaded = true;
      this.logger.info('InstallationManager', `Loaded ${this.installations.size} installation(s).`);

      // Verify installed statuses against filesystem
      await this.refreshInstalledStatuses();
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.info('InstallationManager', 'No installations found. Populating default installations.');
        this.installations.clear();
        for (const inst of DEFAULT_INSTALLATIONS) {
          const instDir = path.join(this.pathManager.getInstallationsDir(), inst.id);
          this.installations.set(inst.id, {
            ...inst,
            gameDirectory: instDir,
            minMemory: inst.memoryAllocation.minMb,
            maxMemory: inst.memoryAllocation.maxMb,
            status: 'NOT_INSTALLED',
          });
        }
        this.activeInstallationId = 'fabric-1-21-4';
        await this.save();
        this.isLoaded = true;
        await this.refreshInstalledStatuses();
      } else {
        this.logger.error('InstallationManager', 'Failed to load installations file, backing up and fallback to defaults:', err);
        try {
          const corruptBackupPath = `${filePath}.corrupt.${Date.now()}.bak`;
          await fs.copyFile(filePath, corruptBackupPath);
          this.logger.info('InstallationManager', `Backed up corrupted installations to ${corruptBackupPath}`);
        } catch (backupErr) {
          this.logger.warn('InstallationManager', `Could not create backup of corrupted installations: ${backupErr}`);
        }
        this.installations.clear();
        for (const inst of DEFAULT_INSTALLATIONS) {
          const instDir = path.join(this.pathManager.getInstallationsDir(), inst.id);
          this.installations.set(inst.id, {
            ...inst,
            gameDirectory: instDir,
            minMemory: inst.memoryAllocation.minMb,
            maxMemory: inst.memoryAllocation.maxMb,
            status: 'NOT_INSTALLED',
          });
        }
        this.activeInstallationId = 'fabric-1-21-4';
        this.isLoaded = true;
        await this.refreshInstalledStatuses();
      }
    }
  }

  public async refreshInstalledStatuses(): Promise<void> {
    if (!this.versionService) return;

    for (const [id, inst] of this.installations.entries()) {
      const vId = inst.versionId || inst.minecraftVersion;
      const isInstalled = await this.versionService.isVersionInstalled(vId);

      if (isInstalled && inst.status === 'NOT_INSTALLED') {
        inst.status = 'INSTALLED';
      } else if (!isInstalled && inst.status === 'INSTALLED') {
        inst.status = 'NOT_INSTALLED';
      }
    }
  }

  public getInstallations(): Installation[] {
    return Array.from(this.installations.values());
  }

  public getInstallation(id: string): Installation | undefined {
    return this.installations.get(id);
  }

  public getActiveInstallation(): Installation | null {
    if (!this.activeInstallationId) return null;
    return this.installations.get(this.activeInstallationId) || null;
  }

  public async selectInstallation(id: string): Promise<Installation> {
    const inst = this.installations.get(id);
    if (!inst) {
      throw new FernError(
        FernErrorCode.INSTALLATION_NOT_FOUND,
        `Installation with ID ${id} was not found.`
      );
    }
    this.activeInstallationId = id;
    await this.save();
    this.logger.info('InstallationManager', `Selected active installation: ${inst.name} (${inst.minecraftVersion})`);
    return inst;
  }

  public async createInstallation(dto: CreateInstallationDTO): Promise<Installation> {
    if (!dto.name || !dto.name.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Installation name cannot be empty.');
    }
    if (!dto.minecraftVersion || !dto.minecraftVersion.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Minecraft version is required.');
    }

    const versionId = dto.versionId || dto.minecraftVersion.trim();
    const cleanId = `${(dto.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}-${Date.now().toString(36)}`;
    const instDir = dto.gameDirectory || path.join(this.pathManager.getInstallationsDir(), cleanId);

    const minRam = dto.minMemory ?? dto.memoryAllocation?.minMb ?? 2048;
    const maxRam = dto.maxMemory ?? dto.memoryAllocation?.maxMb ?? 4096;

    if (minRam > maxRam) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Minimum RAM cannot exceed Maximum RAM.');
    }

    let initialStatus: InstallationStatus = 'NOT_INSTALLED';
    if (this.versionService) {
      const isInstalled = await this.versionService.isVersionInstalled(versionId);
      if (isInstalled) initialStatus = 'INSTALLED';
    }

    const now = Date.now();
    const installation: Installation = {
      id: cleanId,
      name: dto.name.trim(),
      minecraftVersion: dto.minecraftVersion.trim(),
      versionId,
      loader: dto.loader || 'vanilla',
      loaderVersion: dto.loaderVersion,
      gameDirectory: instDir,
      javaPath: dto.javaPath,
      minMemory: minRam,
      maxMemory: maxRam,
      memoryAllocation: {
        minMb: minRam,
        maxMb: maxRam,
      },
      launchArguments: dto.launchArguments || [],
      jvmArguments: dto.jvmArguments || [],
      fernProfileId: dto.fernProfileId,
      performanceProfile: dto.performanceProfile,
      performanceSettings: dto.performanceSettings,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
    };

    // Ensure instance directory exists
    await fs.mkdir(instDir, { recursive: true });

    this.installations.set(installation.id, installation);
    if (!this.activeInstallationId) {
      this.activeInstallationId = installation.id;
    }

    await this.save();
    this.logger.info('InstallationManager', `Created installation: ${installation.name} (${installation.id})`);
    return installation;
  }

  public async updateInstallation(id: string, dto: UpdateInstallationDTO): Promise<Installation> {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.INSTALLATION_NOT_FOUND, `Installation ${id} not found.`);
    }

    const minRam = dto.minMemory ?? dto.memoryAllocation?.minMb ?? existing.minMemory ?? existing.memoryAllocation.minMb;
    const maxRam = dto.maxMemory ?? dto.memoryAllocation?.maxMb ?? existing.maxMemory ?? existing.memoryAllocation.maxMb;

    if (minRam > maxRam) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Minimum RAM cannot exceed Maximum RAM.');
    }

    const updated: Installation = {
      ...existing,
      ...dto,
      id: existing.id,
      minMemory: minRam,
      maxMemory: maxRam,
      memoryAllocation: {
        minMb: minRam,
        maxMb: maxRam,
      },
      updatedAt: Date.now(),
    };

    this.installations.set(id, updated);
    await this.save();
    this.logger.info('InstallationManager', `Updated installation: ${updated.name}`);
    return updated;
  }

  public async renameInstallation(id: string, newName: string): Promise<Installation> {
    if (!newName || !newName.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Installation name cannot be empty.');
    }
    return this.updateInstallation(id, { name: newName.trim() });
  }

  public async duplicateInstallation(id: string, newName?: string): Promise<Installation> {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.INSTALLATION_NOT_FOUND, `Installation ${id} not found.`);
    }

    const targetName = newName?.trim() || `${existing.name} (Copy)`;
    const created = await this.createInstallation({
      name: targetName,
      minecraftVersion: existing.minecraftVersion,
      versionId: existing.versionId,
      loader: existing.loader,
      loaderVersion: existing.loaderVersion,
      javaPath: existing.javaPath,
      minMemory: existing.minMemory,
      maxMemory: existing.maxMemory,
      launchArguments: [...existing.launchArguments],
      jvmArguments: [...(existing.jvmArguments || [])],
      fernProfileId: existing.fernProfileId,
      performanceProfile: existing.performanceProfile,
      performanceSettings: existing.performanceSettings ? { ...existing.performanceSettings } : undefined,
    });

    // Safely copy isolated configuration files if present
    if (existing.gameDirectory) {
      try {
        const sourceOptions = path.join(existing.gameDirectory, 'options.txt');
        const destOptions = path.join(created.gameDirectory, 'options.txt');
        await fs.copyFile(sourceOptions, destOptions).catch(() => {});

        const sourceConfig = path.join(existing.gameDirectory, 'config');
        const destConfig = path.join(created.gameDirectory, 'config');
        await fs.cp(sourceConfig, destConfig, { recursive: true }).catch(() => {});
      } catch (copyErr) {
        this.logger.warn('InstallationManager', `Could not copy config during duplicate:`, copyErr);
      }
    }

    return created;
  }

  public exportInstallationMetadata(id: string): string {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.INSTALLATION_NOT_FOUND, `Installation ${id} not found.`);
    }

    const exportData = {
      format: 'fern-instance-metadata-v1',
      exportedAt: new Date().toISOString(),
      name: existing.name,
      minecraftVersion: existing.minecraftVersion,
      versionId: existing.versionId,
      loader: existing.loader,
      loaderVersion: existing.loaderVersion,
      minMemory: existing.minMemory,
      maxMemory: existing.maxMemory,
      launchArguments: existing.launchArguments,
      jvmArguments: existing.jvmArguments,
      fernProfileId: existing.fernProfileId,
      performanceProfile: existing.performanceProfile,
      performanceSettings: existing.performanceSettings,
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async importInstallationMetadata(rawJson: string, nameOverride?: string): Promise<Installation> {
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Invalid JSON metadata.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Metadata must be an object.');
    }

    if (!parsed.minecraftVersion || typeof parsed.minecraftVersion !== 'string') {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Metadata missing required "minecraftVersion".');
    }

    const name = nameOverride?.trim() || parsed.name || `Imported ${parsed.minecraftVersion}`;

    return this.createInstallation({
      name,
      minecraftVersion: parsed.minecraftVersion,
      versionId: parsed.versionId,
      loader: parsed.loader || 'vanilla',
      loaderVersion: parsed.loaderVersion,
      minMemory: parsed.minMemory ?? parsed.memoryAllocation?.minMb,
      maxMemory: parsed.maxMemory ?? parsed.memoryAllocation?.maxMb,
      launchArguments: Array.isArray(parsed.launchArguments) ? parsed.launchArguments : [],
      jvmArguments: Array.isArray(parsed.jvmArguments) ? parsed.jvmArguments : [],
      fernProfileId: parsed.fernProfileId,
      performanceProfile: parsed.performanceProfile,
      performanceSettings: parsed.performanceSettings,
    });
  }

  public async backupInstallationConfig(
    id: string,
    targetBackupPath?: string
  ): Promise<{ backupPath: string; filesCount: number; bytesCount: number }> {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.INSTALLATION_NOT_FOUND, `Installation ${id} not found.`);
    }

    const instDir = existing.gameDirectory;
    const entriesToZip: Array<{ relativePath: string; content: Buffer }> = [];

    // Include instance metadata
    const metaBuffer = Buffer.from(this.exportInstallationMetadata(id), 'utf-8');
    entriesToZip.push({ relativePath: 'instance-metadata.json', content: metaBuffer });

    // Collect config files recursively (excluding sensitive auth and large media/assets)
    const collectFilesRecursively = async (dir: string, baseDir: string) => {
      try {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');

          // Never back up sensitive files or big immutable game assets
          if (
            file.name === 'launcher_accounts.json' ||
            file.name === 'usercache.json' ||
            file.name === 'token.json' ||
            rel.startsWith('assets/') ||
            rel.startsWith('libraries/') ||
            rel.startsWith('saves/') ||
            rel.startsWith('logs/')
          ) {
            continue;
          }

          if (file.isDirectory()) {
            await collectFilesRecursively(fullPath, baseDir);
          } else if (file.isFile()) {
            const buf = await fs.readFile(fullPath);
            if (buf.length <= 5 * 1024 * 1024) {
              entriesToZip.push({ relativePath: path.join('config-data', rel).replace(/\\/g, '/'), content: buf });
            }
          }
        }
      } catch {
        // Ignored if folder doesn't exist
      }
    };

    // Collect options.txt
    const optionsPath = path.join(instDir, 'options.txt');
    try {
      const optBuf = await fs.readFile(optionsPath);
      entriesToZip.push({ relativePath: 'config-data/options.txt', content: optBuf });
    } catch {}

    // Collect config directory
    const configDir = path.join(instDir, 'config');
    await collectFilesRecursively(configDir, instDir);

    const zipBuffer = createZipArchive(entriesToZip);
    const dest =
      targetBackupPath ||
      path.join(
        this.pathManager.getBackupsDir(),
        `${existing.id}-config-backup-${Date.now()}.fernbackup`
      );

    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, zipBuffer);

    this.logger.info(
      'InstallationManager',
      `Created config backup for ${id} with ${entriesToZip.length} files at ${dest}`
    );

    return {
      backupPath: dest,
      filesCount: entriesToZip.length,
      bytesCount: zipBuffer.length,
    };
  }

  public async restoreInstallationConfig(
    id: string,
    backupFilePath: string
  ): Promise<{ restoredFiles: string[] }> {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.INSTALLATION_NOT_FOUND, `Installation ${id} not found.`);
    }

    const buf = await fs.readFile(backupFilePath);
    const zipEntries = readZipEntries(buf);
    const restoredFiles: string[] = [];
    const instDir = path.resolve(existing.gameDirectory);

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const rawName = entry.name.replace(/\\/g, '/');
      if (rawName.includes('..') || rawName.startsWith('/') || /^[a-zA-Z]:/.test(rawName)) {
        throw new FernError(FernErrorCode.SECURITY_VIOLATION, `Invalid entry in backup: ${entry.name}`);
      }

      if (rawName.startsWith('config-data/')) {
        const subPath = rawName.substring('config-data/'.length);
        const targetPath = path.resolve(instDir, subPath);
        if (!targetPath.startsWith(instDir + path.sep) && targetPath !== instDir) {
          throw new FernError(FernErrorCode.SECURITY_VIOLATION, `Restored file path escapes instance directory: ${rawName}`);
        }

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, entry.getData());
        restoredFiles.push(targetPath);
      }
    }

    this.logger.info(
      'InstallationManager',
      `Restored ${restoredFiles.length} config file(s) to installation ${id}`
    );
    return { restoredFiles };
  }

  public async getInstalledMods(id: string): Promise<Array<{ filename: string; size: number; enabled: boolean; lastModified: number }>> {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.INSTALLATION_NOT_FOUND, `Installation ${id} not found.`);
    }

    const modsDir = path.join(existing.gameDirectory, 'mods');
    try {
      await fs.access(modsDir);
      const entries = await fs.readdir(modsDir, { withFileTypes: true });
      const mods: Array<{ filename: string; size: number; enabled: boolean; lastModified: number }> = [];

      for (const ent of entries) {
        if (!ent.isFile()) continue;
        const name = ent.name;
        if (name.endsWith('.jar') || name.endsWith('.jar.disabled')) {
          const stat = await fs.stat(path.join(modsDir, name));
          mods.push({
            filename: name,
            size: stat.size,
            enabled: !name.endsWith('.disabled'),
            lastModified: stat.mtimeMs,
          });
        }
      }
      return mods;
    } catch {
      return [];
    }
  }

  public async setInstallationStatus(
    id: string,
    status: InstallationStatus,
    progress?: InstallationProgressInfo
  ): Promise<void> {
    const inst = this.installations.get(id);
    if (!inst) return;

    inst.status = status;
    inst.installProgress = progress;
    if (status === 'RUNNING') {
      inst.lastPlayedAt = Date.now();
    }
    await this.save();
  }

  public async deleteInstallation(id: string, deleteFiles = false, confirmationName?: string): Promise<void> {
    const existing = this.installations.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.INSTALLATION_NOT_FOUND, `Installation ${id} not found.`);
    }

    if (confirmationName !== undefined && confirmationName !== existing.name) {
      throw new FernError(
        FernErrorCode.VALIDATION_ERROR,
        `Confirmation name "${confirmationName}" does not match installation name "${existing.name}".`
      );
    }

    if (deleteFiles && existing.gameDirectory) {
      try {
        const defaultInstsDir = this.pathManager.getInstallationsDir();
        // Safe check: only delete if subdirectory of installations directory
        if (path.resolve(existing.gameDirectory).startsWith(path.resolve(defaultInstsDir))) {
          await fs.rm(existing.gameDirectory, { recursive: true, force: true });
          this.logger.info('InstallationManager', `Deleted game directory for ${id}: ${existing.gameDirectory}`);
        }
      } catch (rmErr) {
        this.logger.warn('InstallationManager', `Failed to delete instance directory:`, rmErr);
      }
    }

    this.installations.delete(id);
    if (this.activeInstallationId === id) {
      const remaining = this.installations.keys().next().value;
      this.activeInstallationId = remaining || null;
    }

    await this.save();
    this.logger.info('InstallationManager', `Deleted installation: ${id}`);
  }

  private async save(): Promise<void> {
    const data: StoredInstallationsData = {
      version: 1,
      activeInstallationId: this.activeInstallationId,
      installations: Array.from(this.installations.values()),
    };

    const filePath = this.pathManager.getInstallationsFilePath();
    await fs.mkdir(this.pathManager.getInstallationsDir(), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
