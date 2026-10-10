import * as path from 'path';
import * as fs from 'fs/promises';
import { Mod, ModDependency, ConflictValidationResult } from '../../../shared/models/mod';
import { Installation } from '../../../shared/models/installation';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { ModMetadataExtractor } from './metadata-extractor';
import { ModrinthProvider } from './providers/modrinth-provider';
import { DownloadManager } from '../downloads/download-manager';

interface CacheEntry {
  mtime: number;
  mod: Mod;
}

export class ModManager {
  private metadataExtractor: ModMetadataExtractor;
  private modrinthProvider: ModrinthProvider;
  private modCache: Map<string, CacheEntry> = new Map();

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger,
    private downloadManager: DownloadManager
  ) {
    this.metadataExtractor = new ModMetadataExtractor();
    this.modrinthProvider = new ModrinthProvider(logger, downloadManager);
  }

  public getProvider(): ModrinthProvider {
    return this.modrinthProvider;
  }

  /**
   * Resolves the instance mods directory.
   */
  public getModsDir(installation: Installation): string {
    if (installation.gameDirectory) {
      return path.join(installation.gameDirectory, 'mods');
    }
    return this.pathManager.getInstanceModsDir(installation.id);
  }

  /**
   * Scans and returns all installed mods (both enabled and disabled) for an installation.
   * Leverages mtime-based memory cache for high-performance handling of 100+ mods.
   */
  public async getInstalledMods(installation: Installation): Promise<Mod[]> {
    const modsDir = this.getModsDir(installation);
    await fs.mkdir(modsDir, { recursive: true });

    let fileNames: string[];
    try {
      fileNames = await fs.readdir(modsDir);
    } catch (err) {
      this.logger.error('ModManager', `Failed to read mods directory: ${modsDir}`, err);
      return [];
    }

    const candidateFiles = fileNames.filter(
      (name) => (name.endsWith('.jar') || name.endsWith('.jar.disabled')) && !name.startsWith('.')
    );

    const mods: Mod[] = [];

    // Parallel metadata extraction with caching
    await Promise.all(
      candidateFiles.map(async (fileName) => {
        const filePath = path.join(modsDir, fileName);
        try {
          const stats = await fs.stat(filePath);
          const cached = this.modCache.get(filePath);

          if (cached && cached.mtime === stats.mtimeMs) {
            mods.push(cached.mod);
          } else {
            const mod = await this.metadataExtractor.extractFromJar(filePath);
            this.modCache.set(filePath, { mtime: stats.mtimeMs, mod });
            mods.push(mod);
          }
        } catch (err) {
          this.logger.warn('ModManager', `Could not parse mod metadata for ${fileName}:`, err);
        }
      })
    );

    // Sort by name alphabetically
    return mods.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Toggles a mod's enabled status safely by renaming the file extension (.jar <-> .jar.disabled).
   */
  public async toggleMod(installation: Installation, modFilePath: string): Promise<Mod> {
    const fileName = path.basename(modFilePath);
    const dir = path.dirname(modFilePath);

    let newPath: string;
    if (fileName.endsWith('.disabled')) {
      newPath = path.join(dir, fileName.replace(/\.disabled$/, ''));
    } else {
      newPath = path.join(dir, `${fileName}.disabled`);
    }

    await fs.rename(modFilePath, newPath);
    this.modCache.delete(modFilePath);

    this.logger.info('ModManager', `Toggled mod: ${fileName} -> ${path.basename(newPath)}`);
    const updated = await this.metadataExtractor.extractFromJar(newPath);
    const stats = await fs.stat(newPath);
    this.modCache.set(newPath, { mtime: stats.mtimeMs, mod: updated });

    return updated;
  }

  /**
   * Enables all disabled mods for an installation.
   */
  public async enableAll(installation: Installation): Promise<void> {
    const modsDir = this.getModsDir(installation);
    const files = await fs.readdir(modsDir);

    for (const f of files) {
      if (f.endsWith('.jar.disabled')) {
        const oldP = path.join(modsDir, f);
        const newP = path.join(modsDir, f.replace(/\.disabled$/, ''));
        await fs.rename(oldP, newP);
        this.modCache.delete(oldP);
      }
    }
    this.logger.info('ModManager', `Enabled all mods for installation ${installation.id}`);
  }

  /**
   * Disables all active mods for an installation.
   */
  public async disableAll(installation: Installation): Promise<void> {
    const modsDir = this.getModsDir(installation);
    const files = await fs.readdir(modsDir);

    for (const f of files) {
      if (f.endsWith('.jar') && !f.endsWith('.disabled')) {
        const oldP = path.join(modsDir, f);
        const newP = path.join(modsDir, `${f}.disabled`);
        await fs.rename(oldP, newP);
        this.modCache.delete(oldP);
      }
    }
    this.logger.info('ModManager', `Disabled all mods for installation ${installation.id}`);
  }

  /**
   * Safely deletes a mod file from disk.
   */
  public async removeMod(installation: Installation, modFilePath: string): Promise<void> {
    await fs.unlink(modFilePath);
    this.modCache.delete(modFilePath);
    this.logger.info('ModManager', `Removed mod file: ${modFilePath}`);
  }

  /**
   * Installs a mod by downloading its file into the instance mods directory.
   */
  public async installModFromUrl(
    installation: Installation,
    downloadUrl: string,
    fileName: string,
    sha1?: string
  ): Promise<Mod> {
    const modsDir = this.getModsDir(installation);
    await fs.mkdir(modsDir, { recursive: true });

    // Clean filename
    const safeName = path.basename(fileName);
    const destPath = path.join(modsDir, safeName);

    this.logger.info('ModManager', `Installing mod from ${downloadUrl} to ${destPath}`);
    await this.modrinthProvider.download(downloadUrl, destPath, sha1);

    const mod = await this.metadataExtractor.extractFromJar(destPath);
    const stats = await fs.stat(destPath);
    this.modCache.set(destPath, { mtime: stats.mtimeMs, mod });
    return mod;
  }

  /**
   * Copies a local jar file into the instance mods folder.
   */
  public async installLocalMod(installation: Installation, sourcePath: string): Promise<Mod> {
    const modsDir = this.getModsDir(installation);
    await fs.mkdir(modsDir, { recursive: true });

    const fileName = path.basename(sourcePath);
    const destPath = path.join(modsDir, fileName);

    await fs.copyFile(sourcePath, destPath);
    const mod = await this.metadataExtractor.extractFromJar(destPath);
    const stats = await fs.stat(destPath);
    this.modCache.set(destPath, { mtime: stats.mtimeMs, mod });
    return mod;
  }

  /**
   * Validates conflicts and missing dependencies among installed mods.
   */
  public validateConflicts(installation: Installation, mods: Mod[]): ConflictValidationResult {
    const result: ConflictValidationResult = {
      hasConflicts: false,
      warnings: [],
      incompatibleMods: [],
      missingDependencies: [],
    };

    const activeMods = mods.filter((m) => m.enabled);
    const installedModIds = new Set<string>();

    for (const m of activeMods) {
      installedModIds.add(m.id.toLowerCase());
      // Also add sanitized name
      installedModIds.add(m.name.toLowerCase().replace(/\s+/g, '-'));
    }

    for (const mod of activeMods) {
      // 1. Check loader compatibility
      if (
        installation.loader !== 'vanilla' &&
        mod.loaders.length > 0 &&
        !mod.loaders.includes(installation.loader)
      ) {
        // Exception: Quilt can run Fabric mods
        const quiltCanRunFabric = installation.loader === 'quilt' && mod.loaders.includes('fabric');
        if (!quiltCanRunFabric) {
          result.hasConflicts = true;
          result.incompatibleMods.push({
            modName: mod.name,
            reason: `Mod requires [${mod.loaders.join(', ')}], but current installation uses [${installation.loader}].`,
          });
        }
      }

      // 2. Check declared required dependencies
      if (mod.dependencies && mod.dependencies.length > 0) {
        for (const dep of mod.dependencies) {
          if (dep.type === 'required') {
            const depLower = dep.id.toLowerCase();
            // Check if installed
            const isInstalled =
              installedModIds.has(depLower) ||
              activeMods.some(
                (m) =>
                  m.id.toLowerCase().includes(depLower) ||
                  m.name.toLowerCase().includes(depLower)
              );

            if (!isInstalled) {
              result.missingDependencies.push({
                modName: mod.name,
                requiredDependency: dep.name || dep.id,
              });
            }
          }
        }
      }
    }

    if (result.incompatibleMods.length > 0 || result.missingDependencies.length > 0) {
      result.hasConflicts = true;
    }

    return result;
  }
}
