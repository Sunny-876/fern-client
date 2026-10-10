import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

export type ShaderPerformanceImpact = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface ShaderPreset {
  id: string;
  name: string;
  description: string;
  shaderPackName: string; // e.g. "ComplementaryReimagined.zip" or "OFF"
  profileName?: string; // Profile selector inside pack if supported (e.g. "Performance", "Medium", "Ultra")
  performanceImpact: ShaderPerformanceImpact;
  options: Record<string, string | number | boolean>;
  createdAt: number;
  updatedAt: number;
}

export const BUILTIN_SHADER_PRESETS: ShaderPreset[] = [
  {
    id: 'shader-preset-vanilla-fast',
    name: 'Vanilla Native (No Shaders)',
    description: 'Direct rasterization with zero shader overhead for maximum FPS.',
    shaderPackName: 'OFF',
    performanceImpact: 'LOW',
    options: {
      shaderPack: 'OFF',
      shadowDistance: 0,
      renderDistanceRatio: 1.0,
    },
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'shader-preset-balanced-iris',
    name: 'Balanced Atmosphere',
    description: 'Standard shadow mapping and gentle water reflections with medium GPU load.',
    shaderPackName: 'ComplementaryReimagined.zip',
    profileName: 'Medium',
    performanceImpact: 'MEDIUM',
    options: {
      shaderPack: 'ComplementaryReimagined.zip',
      shadowDistance: 120,
      renderDistanceRatio: 1.0,
      profile: 'MEDIUM',
    },
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'shader-preset-cinematic-ultra',
    name: 'Cinematic Path Tracing',
    description: 'High-intensity volumetric lighting, depth of field, and raytraced reflections for screenshots.',
    shaderPackName: 'ComplementaryReimagined.zip',
    profileName: 'Ultra',
    performanceImpact: 'ULTRA',
    options: {
      shaderPack: 'ComplementaryReimagined.zip',
      shadowDistance: 256,
      renderDistanceRatio: 1.25,
      profile: 'ULTRA',
      volumetricLight: true,
      motionBlur: false,
    },
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

export class ShaderPresetService {
  private userPresets: Map<string, ShaderPreset> = new Map();
  private filePath: string;
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.filePath = path.join(this.pathManager.getLauncherDir(), 'shader-presets.json');
  }

  public async load(): Promise<void> {
    try {
      await fs.access(this.filePath);
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(raw);
      this.userPresets.clear();
      if (Array.isArray(data.presets)) {
        for (const p of data.presets) {
          this.userPresets.set(p.id, p);
        }
      }
    } catch {
      this.userPresets.clear();
    }
    this.isLoaded = true;
    this.logger.info('ShaderPresetService', `Loaded ${this.userPresets.size} user shader preset(s).`);
  }

  public getAllPresets(): ShaderPreset[] {
    return [...BUILTIN_SHADER_PRESETS, ...Array.from(this.userPresets.values())];
  }

  public getPreset(id: string): ShaderPreset | undefined {
    return (
      BUILTIN_SHADER_PRESETS.find((p) => p.id === id) ||
      this.userPresets.get(id)
    );
  }

  public async createPreset(params: {
    name: string;
    description: string;
    shaderPackName: string;
    profileName?: string;
    performanceImpact?: ShaderPerformanceImpact;
    options?: Record<string, string | number | boolean>;
  }): Promise<ShaderPreset> {
    if (!params.name || !params.name.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Preset name cannot be empty.');
    }

    const id = `shader-preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const preset: ShaderPreset = {
      id,
      name: params.name.trim(),
      description: params.description.trim(),
      shaderPackName: params.shaderPackName.trim(),
      profileName: params.profileName,
      performanceImpact: params.performanceImpact || 'MEDIUM',
      options: params.options || { shaderPack: params.shaderPackName },
      createdAt: now,
      updatedAt: now,
    };

    this.userPresets.set(id, preset);
    await this.save();
    return preset;
  }

  public async renamePreset(id: string, newName: string): Promise<ShaderPreset> {
    const existing = this.userPresets.get(id);
    if (!existing) {
      if (BUILTIN_SHADER_PRESETS.some((p) => p.id === id)) {
        throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Cannot rename built-in preset. Duplicate it first.');
      }
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Preset ${id} not found.`);
    }

    if (!newName || !newName.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Preset name cannot be empty.');
    }

    existing.name = newName.trim();
    existing.updatedAt = Date.now();
    await this.save();
    return existing;
  }

  public async duplicatePreset(id: string, newName?: string): Promise<ShaderPreset> {
    const original = this.getPreset(id);
    if (!original) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Preset ${id} not found.`);
    }

    const name = newName?.trim() || `${original.name} (Copy)`;
    return this.createPreset({
      name,
      description: original.description,
      shaderPackName: original.shaderPackName,
      profileName: original.profileName,
      performanceImpact: original.performanceImpact,
      options: { ...original.options },
    });
  }

  public async deletePreset(id: string): Promise<boolean> {
    if (BUILTIN_SHADER_PRESETS.some((p) => p.id === id)) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Cannot delete built-in shader presets.');
    }

    const removed = this.userPresets.delete(id);
    if (removed) {
      await this.save();
    }
    return removed;
  }

  /**
   * Verifies if the instance has a shader pipeline (Iris, Oculus, or OptiFine) installed.
   */
  public async validateCompatibility(instanceGameDir: string): Promise<{
    hasShaderLoader: boolean;
    detectedPipeline?: string;
    warning?: string;
  }> {
    const modsDir = path.join(instanceGameDir, 'mods');
    try {
      const files = await fs.readdir(modsDir);
      const lowerFiles = files.map((f) => f.toLowerCase());

      const isIris = lowerFiles.some((f) => f.includes('iris') && !f.endsWith('.disabled'));
      const isOculus = lowerFiles.some((f) => f.includes('oculus') && !f.endsWith('.disabled'));
      const isOptiFine = lowerFiles.some((f) => f.includes('optifine') && !f.endsWith('.disabled'));

      if (isIris) {
        return { hasShaderLoader: true, detectedPipeline: 'Iris (Fabric/NeoForge)' };
      }
      if (isOculus) {
        return { hasShaderLoader: true, detectedPipeline: 'Oculus (Forge/NeoForge)' };
      }
      if (isOptiFine) {
        return { hasShaderLoader: true, detectedPipeline: 'OptiFine' };
      }

      return {
        hasShaderLoader: false,
        warning: 'No shader loader (Iris, Oculus, or OptiFine) detected in mods folder. Shaders cannot render without a pipeline mod.',
      };
    } catch {
      return {
        hasShaderLoader: false,
        warning: 'Could not access mods folder to verify shader loader compatibility.',
      };
    }
  }

  /**
   * Applies the preset configuration to optionsshaders.txt in the instance.
   */
  public async applyPresetToInstance(instanceGameDir: string, presetId: string): Promise<void> {
    const preset = this.getPreset(presetId);
    if (!preset) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Preset ${presetId} not found.`);
    }

    const optionsPath = path.join(instanceGameDir, 'optionsshaders.txt');
    const lines: string[] = [];

    // Ensure shaderPack entry is set
    lines.push(`shaderPack=${preset.shaderPackName}`);

    // Serialize supported options safely
    for (const [key, val] of Object.entries(preset.options)) {
      if (key === 'shaderPack') continue;
      lines.push(`${key}=${val}`);
    }

    if (preset.profileName) {
      lines.push(`profile=${preset.profileName}`);
    }

    await fs.mkdir(path.dirname(optionsPath), { recursive: true });
    await fs.writeFile(optionsPath, lines.join('\n') + '\n', 'utf-8');

    this.logger.info(
      'ShaderPresetService',
      `Applied shader preset "${preset.name}" (${preset.performanceImpact}) to ${optionsPath}`
    );
  }

  public exportPreset(id: string): string {
    const preset = this.getPreset(id);
    if (!preset) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Preset ${id} not found.`);
    }
    return JSON.stringify(preset, null, 2);
  }

  public async importPreset(jsonStr: string): Promise<ShaderPreset> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Invalid JSON for shader preset.');
    }

    if (!parsed.name || !parsed.shaderPackName) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Missing required shader preset fields.');
    }

    return this.createPreset({
      name: parsed.name,
      description: parsed.description || '',
      shaderPackName: parsed.shaderPackName,
      profileName: parsed.profileName,
      performanceImpact: parsed.performanceImpact || 'MEDIUM',
      options: typeof parsed.options === 'object' ? parsed.options : {},
    });
  }

  private async save(): Promise<void> {
    const data = {
      version: 1,
      presets: Array.from(this.userPresets.values()),
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
