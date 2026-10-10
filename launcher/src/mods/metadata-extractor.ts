import * as path from 'path';
import * as fs from 'fs/promises';
import { Mod, ModDependency, ModDependencyType } from '../../../shared/models/mod';
import { ModLoaderType } from '../../../shared/models/installation';
import { readZipEntryText } from '../utils/zip';

export class ModMetadataExtractor {
  /**
   * Reads a mod jar file from disk and extracts normalized Mod metadata.
   * Tolerates incomplete or corrupted metadata gracefully.
   */
  public async extractFromJar(filePath: string): Promise<Mod> {
    const fileName = path.basename(filePath);
    const enabled = !fileName.endsWith('.disabled');
    const stats = await fs.stat(filePath);
    const installedAt = stats.mtimeMs || stats.birthtimeMs || Date.now();
    const fileSize = stats.size;

    let buffer: Buffer | null = null;
    try {
      buffer = await fs.readFile(filePath);
    } catch {
      return this.buildFallbackFromFilename(filePath, fileName, enabled, installedAt, fileSize);
    }

    // 1. Try fabric.mod.json
    try {
      const fabricJsonStr = readZipEntryText(buffer, 'fabric.mod.json');
      if (fabricJsonStr) {
        const data = JSON.parse(fabricJsonStr);
        return this.parseFabricModJson(data, filePath, fileName, enabled, installedAt, fileSize);
      }
    } catch {
      // Continue to next format
    }

    // 2. Try quilt.mod.json
    try {
      const quiltJsonStr = readZipEntryText(buffer, 'quilt.mod.json');
      if (quiltJsonStr) {
        const data = JSON.parse(quiltJsonStr);
        return this.parseQuiltModJson(data, filePath, fileName, enabled, installedAt, fileSize);
      }
    } catch {
      // Continue to next format
    }

    // 3. Try META-INF/mods.toml (Forge / NeoForge)
    try {
      const modsTomlStr = readZipEntryText(buffer, 'META-INF/mods.toml');
      if (modsTomlStr) {
        return this.parseModsToml(modsTomlStr, filePath, fileName, enabled, installedAt, fileSize);
      }
    } catch {
      // Continue to next format
    }

    // 4. Try mcmod.info (Legacy Forge)
    try {
      const mcmodStr = readZipEntryText(buffer, 'mcmod.info');
      if (mcmodStr) {
        const data = JSON.parse(mcmodStr);
        return this.parseLegacyForgeJson(data, filePath, fileName, enabled, installedAt, fileSize);
      }
    } catch {
      // Continue to fallback
    }

    // 5. Fallback heuristic from file name
    return this.buildFallbackFromFilename(filePath, fileName, enabled, installedAt, fileSize);
  }

  private parseFabricModJson(
    data: any,
    filePath: string,
    fileName: string,
    enabled: boolean,
    installedAt: number,
    fileSize: number
  ): Mod {
    const id = data.id || path.parse(fileName).name;
    const name = data.name || id;
    const version = String(data.version || 'unknown');
    const summary = data.description || '';

    const dependencies: ModDependency[] = [];
    const optionalDependencies: ModDependency[] = [];

    if (data.depends && typeof data.depends === 'object') {
      for (const [depId, versionReq] of Object.entries(data.depends)) {
        if (depId !== 'fabricloader' && depId !== 'minecraft' && depId !== 'java') {
          dependencies.push({
            id: depId,
            versionRequirement: String(versionReq),
            type: 'required',
          });
        }
      }
    }

    if (data.recommends && typeof data.recommends === 'object') {
      for (const [depId, versionReq] of Object.entries(data.recommends)) {
        optionalDependencies.push({
          id: depId,
          versionRequirement: String(versionReq),
          type: 'optional',
        });
      }
    }

    // Extract supported Minecraft version if specified in depends.minecraft
    const mcVersions: string[] = [];
    if (data.depends?.minecraft) {
      mcVersions.push(String(data.depends.minecraft));
    }

    return {
      id,
      name,
      version,
      summary,
      minecraftVersions: mcVersions,
      loaders: ['fabric', 'quilt'],
      filePath,
      fileName,
      enabled,
      source: 'local',
      dependencies,
      optionalDependencies,
      installedAt,
      fileSize,
    };
  }

  private parseQuiltModJson(
    data: any,
    filePath: string,
    fileName: string,
    enabled: boolean,
    installedAt: number,
    fileSize: number
  ): Mod {
    const qloader = data.quilt_loader || {};
    const id = qloader.id || path.parse(fileName).name;
    const name = qloader.metadata?.name || id;
    const version = String(qloader.version || 'unknown');
    const summary = qloader.metadata?.description || '';

    return {
      id,
      name,
      version,
      summary,
      minecraftVersions: [],
      loaders: ['quilt'],
      filePath,
      fileName,
      enabled,
      source: 'local',
      dependencies: [],
      optionalDependencies: [],
      installedAt,
      fileSize,
    };
  }

  private parseModsToml(
    tomlStr: string,
    filePath: string,
    fileName: string,
    enabled: boolean,
    installedAt: number,
    fileSize: number
  ): Mod {
    // Basic regex extraction for key fields in mods.toml
    const modIdMatch = tomlStr.match(/modId\s*=\s*["']([^"']+)["']/i);
    const displayNameMatch = tomlStr.match(/displayName\s*=\s*["']([^"']+)["']/i);
    const versionMatch = tomlStr.match(/(?:^|[\r\n])\s*version\s*=\s*["']([^"']+)["']/i);
    const descMatch = tomlStr.match(/description\s*=\s*'''([\s\S]*?)'''|description\s*=\s*["']([^"']+)["']/i);

    const id = modIdMatch ? modIdMatch[1] : path.parse(fileName).name;
    const name = displayNameMatch ? displayNameMatch[1] : id;
    const version = versionMatch ? versionMatch[1] : 'unknown';
    const summary = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';

    return {
      id,
      name,
      version,
      summary,
      minecraftVersions: [],
      loaders: ['forge', 'neoforge'],
      filePath,
      fileName,
      enabled,
      source: 'local',
      dependencies: [],
      optionalDependencies: [],
      installedAt,
      fileSize,
    };
  }

  private parseLegacyForgeJson(
    data: any,
    filePath: string,
    fileName: string,
    enabled: boolean,
    installedAt: number,
    fileSize: number
  ): Mod {
    const item = Array.isArray(data) ? data[0] : (data.modList && data.modList[0]) || data;
    const id = item.modid || path.parse(fileName).name;
    const name = item.name || id;
    const version = String(item.version || 'unknown');

    return {
      id,
      name,
      version,
      summary: item.description || '',
      minecraftVersions: item.mcversion ? [String(item.mcversion)] : [],
      loaders: ['forge'],
      filePath,
      fileName,
      enabled,
      source: 'local',
      dependencies: [],
      optionalDependencies: [],
      installedAt,
      fileSize,
    };
  }

  private buildFallbackFromFilename(
    filePath: string,
    fileName: string,
    enabled: boolean,
    installedAt: number,
    fileSize: number
  ): Mod {
    // Strip trailing .disabled and .jar
    let clean = fileName.replace(/\.disabled$/, '').replace(/\.jar$/, '');
    const loaders: ModLoaderType[] = [];

    const lower = clean.toLowerCase();
    if (lower.includes('fabric')) loaders.push('fabric');
    if (lower.includes('quilt')) loaders.push('quilt');
    if (lower.includes('neoforge')) loaders.push('neoforge');
    if (lower.includes('forge')) loaders.push('forge');
    if (loaders.length === 0) loaders.push('fabric'); // default assumption

    // Attempt to parse name-version pattern (e.g. sodium-0.5.8 or lithium-fabric-mc1.21-0.12.0)
    const match = clean.match(/^([a-zA-Z0-9_\-]+?)[-_]([0-9]+(?:\.[0-9]+.*)?)$/);
    const id = match ? match[1].toLowerCase() : clean.toLowerCase();
    const name = match ? this.capitalize(match[1]) : this.capitalize(clean);
    const version = match ? match[2] : 'unknown';

    return {
      id,
      name,
      version,
      minecraftVersions: [],
      loaders,
      filePath,
      fileName,
      enabled,
      source: 'local',
      dependencies: [],
      optionalDependencies: [],
      installedAt,
      fileSize,
    };
  }

  private capitalize(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
