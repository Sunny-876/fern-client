import * as path from 'path';
import * as fs from 'fs/promises';
import { ResourcePack, ShaderPack } from '../../../shared/models/packs';
import { Installation } from '../../../shared/models/installation';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { readZipEntryText } from '../utils/zip';

export class PackManager {
  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  public getResourcePacksDir(installation: Installation): string {
    if (installation.gameDirectory) {
      return path.join(installation.gameDirectory, 'resourcepacks');
    }
    return this.pathManager.getInstanceResourcePacksDir(installation.id);
  }

  public getShaderPacksDir(installation: Installation): string {
    if (installation.gameDirectory) {
      return path.join(installation.gameDirectory, 'shaderpacks');
    }
    return this.pathManager.getInstanceShaderPacksDir(installation.id);
  }

  /**
   * Scans and returns all resource packs in the installation's resourcepacks directory.
   */
  public async getResourcePacks(installation: Installation): Promise<ResourcePack[]> {
    const dir = this.getResourcePacksDir(installation);
    await fs.mkdir(dir, { recursive: true });

    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return [];
    }

    const packs: ResourcePack[] = [];

    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const fullPath = path.join(dir, name);
      try {
        const stats = await fs.stat(fullPath);
        const isDir = stats.isDirectory();
        const enabled = !name.endsWith('.disabled');

        let description: string | undefined;
        let packFormat: number | undefined;

        // Try reading pack.mcmeta
        if (isDir) {
          try {
            const mcmetaPath = path.join(fullPath, 'pack.mcmeta');
            const data = JSON.parse(await fs.readFile(mcmetaPath, 'utf-8'));
            description = typeof data.pack?.description === 'string' ? data.pack.description : undefined;
            packFormat = data.pack?.pack_format;
          } catch {
            // No valid pack.mcmeta
          }
        } else if (name.endsWith('.zip') || name.endsWith('.zip.disabled')) {
          try {
            const buf = await fs.readFile(fullPath);
            const mcmetaStr = readZipEntryText(buf, 'pack.mcmeta');
            if (mcmetaStr) {
              const data = JSON.parse(mcmetaStr);
              description = typeof data.pack?.description === 'string' ? data.pack.description : undefined;
              packFormat = data.pack?.pack_format;
            }
          } catch {
            // Zip read error
          }
        }

        const cleanName = name.replace(/\.disabled$/, '').replace(/\.zip$/, '');

        packs.push({
          id: cleanName.toLowerCase(),
          name: cleanName,
          fileName: name,
          filePath: fullPath,
          description,
          packFormat,
          enabled,
          fileSize: stats.size,
          isDirectory: isDir,
        });
      } catch (err) {
        this.logger.warn('PackManager', `Error reading resource pack entry ${name}:`, err);
      }
    }

    return packs;
  }

  /**
   * Toggles a resource pack enabled/disabled status.
   */
  public async toggleResourcePack(installation: Installation, packFilePath: string): Promise<ResourcePack> {
    const fileName = path.basename(packFilePath);
    const dir = path.dirname(packFilePath);

    let newPath: string;
    if (fileName.endsWith('.disabled')) {
      newPath = path.join(dir, fileName.replace(/\.disabled$/, ''));
    } else {
      newPath = path.join(dir, `${fileName}.disabled`);
    }

    await fs.rename(packFilePath, newPath);
    this.logger.info('PackManager', `Toggled resource pack: ${fileName} -> ${path.basename(newPath)}`);

    const packs = await this.getResourcePacks(installation);
    const updated = packs.find((p) => p.filePath === newPath);
    if (!updated) {
      throw new Error(`Failed to locate updated resource pack at ${newPath}`);
    }
    return updated;
  }

  /**
   * Deletes a resource pack from disk.
   */
  public async removeResourcePack(packFilePath: string): Promise<void> {
    const stats = await fs.stat(packFilePath);
    if (stats.isDirectory()) {
      await fs.rm(packFilePath, { recursive: true, force: true });
    } else {
      await fs.unlink(packFilePath);
    }
    this.logger.info('PackManager', `Deleted resource pack: ${packFilePath}`);
  }

  /**
   * Scans and returns all shader packs in the installation's shaderpacks directory.
   */
  public async getShaderPacks(installation: Installation): Promise<ShaderPack[]> {
    const dir = this.getShaderPacksDir(installation);
    await fs.mkdir(dir, { recursive: true });

    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return [];
    }

    const shaders: ShaderPack[] = [];

    for (const name of entries) {
      if (name.startsWith('.')) continue;
      const fullPath = path.join(dir, name);
      try {
        const stats = await fs.stat(fullPath);
        const isDir = stats.isDirectory();
        const enabled = !name.endsWith('.disabled');
        const cleanName = name.replace(/\.disabled$/, '').replace(/\.zip$/, '');

        shaders.push({
          id: cleanName.toLowerCase(),
          name: cleanName,
          fileName: name,
          filePath: fullPath,
          enabled,
          fileSize: stats.size,
          isDirectory: isDir,
        });
      } catch (err) {
        this.logger.warn('PackManager', `Error reading shader pack entry ${name}:`, err);
      }
    }

    return shaders;
  }

  /**
   * Toggles a shader pack enabled/disabled status.
   */
  public async toggleShaderPack(installation: Installation, shaderFilePath: string): Promise<ShaderPack> {
    const fileName = path.basename(shaderFilePath);
    const dir = path.dirname(shaderFilePath);

    let newPath: string;
    if (fileName.endsWith('.disabled')) {
      newPath = path.join(dir, fileName.replace(/\.disabled$/, ''));
    } else {
      newPath = path.join(dir, `${fileName}.disabled`);
    }

    await fs.rename(shaderFilePath, newPath);
    this.logger.info('PackManager', `Toggled shader pack: ${fileName} -> ${path.basename(newPath)}`);

    const shaders = await this.getShaderPacks(installation);
    const updated = shaders.find((s) => s.filePath === newPath);
    if (!updated) {
      throw new Error(`Failed to locate updated shader pack at ${newPath}`);
    }
    return updated;
  }

  /**
   * Deletes a shader pack from disk.
   */
  public async removeShaderPack(shaderFilePath: string): Promise<void> {
    const stats = await fs.stat(shaderFilePath);
    if (stats.isDirectory()) {
      await fs.rm(shaderFilePath, { recursive: true, force: true });
    } else {
      await fs.unlink(shaderFilePath);
    }
    this.logger.info('PackManager', `Deleted shader pack: ${shaderFilePath}`);
  }
}
