import * as fs from 'fs/promises';
import * as path from 'path';
import { ModLoaderType } from '../../../shared/models/installation';
import { PerformanceProfileType } from '../../../shared/models/performance';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';
import { InstallationManager } from './installation-manager';
import { Installation } from '../../../shared/models/installation';

export interface InstanceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'official' | 'community' | 'user';
  schemaVersion: number;
  minecraftVersion: string;
  versionId?: string;
  loader: ModLoaderType;
  loaderVersion?: string;
  memoryAllocation: {
    minMb: number;
    maxMb: number;
  };
  jvmArguments: string[];
  launchArguments: string[];
  fernProfileId?: string;
  performanceProfile?: PerformanceProfileType;
  recommendedMods?: Array<{
    id: string;
    name: string;
    description: string;
    optional: boolean;
  }>;
  createdAt: number;
  updatedAt: number;
}

export const BUILTIN_INSTANCE_TEMPLATES: InstanceTemplate[] = [
  {
    id: 'template-vanilla-latest',
    name: 'Vanilla Modern',
    description: 'Clean, untouched Minecraft 1.21.4 runtime with standard launcher settings.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.21.4',
    versionId: '1.21.4',
    loader: 'vanilla',
    memoryAllocation: { minMb: 2048, maxMb: 4096 },
    jvmArguments: ['-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled'],
    launchArguments: [],
    fernProfileId: 'default',
    performanceProfile: 'balanced',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'template-fabric-modern',
    name: 'Fabric Standard',
    description: 'Lightweight Fabric 0.16.9 mod loader ready for client-side modding on 1.21.4.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.21.4',
    versionId: '1.21.4-fabric-0.16.9',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    memoryAllocation: { minMb: 2048, maxMb: 4096 },
    jvmArguments: ['-XX:+UseG1GC', '-XX:MaxGCPauseMillis=50'],
    launchArguments: [],
    fernProfileId: 'default',
    performanceProfile: 'balanced',
    recommendedMods: [
      { id: 'fabric-api', name: 'Fabric API', description: 'Essential hook library', optional: false },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'template-forge-classic',
    name: 'Forge 1.20.1 Ecosystem',
    description: 'Minecraft 1.20.1 Forge runtime tailored for the expansive 1.20 modding ecosystem.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.20.1',
    versionId: '1.20.1-forge-47.3.0',
    loader: 'forge',
    loaderVersion: '47.3.0',
    memoryAllocation: { minMb: 4096, maxMb: 6144 },
    jvmArguments: ['-XX:+UseG1GC', '-XX:+UnlockExperimentalVMOptions', '-XX:G1NewSizePercent=20'],
    launchArguments: [],
    fernProfileId: 'default',
    performanceProfile: 'balanced',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'template-neoforge-modern',
    name: 'NeoForge 1.21.1',
    description: 'Modern NeoForge 21.1 setup for 1.21.1 with modern Java 21 garbage collection.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.21.1',
    versionId: '1.21.1-neoforge-21.1.65',
    loader: 'neoforge',
    loaderVersion: '21.1.65',
    memoryAllocation: { minMb: 4096, maxMb: 6144 },
    jvmArguments: ['-XX:+UseG1GC', '-XX:MaxGCPauseMillis=40'],
    launchArguments: [],
    fernProfileId: 'default',
    performanceProfile: 'balanced',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'template-performance-optimized',
    name: 'High-Performance Engine',
    description: 'Ultra-low latency Fabric setup with aggressive memory optimization and potato profile.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.21.4',
    versionId: '1.21.4-fabric-0.16.9',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    memoryAllocation: { minMb: 3072, maxMb: 4096 },
    jvmArguments: [
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=30',
      '-XX:+AlwaysPreTouch',
    ],
    launchArguments: [],
    fernProfileId: 'performance',
    performanceProfile: 'potato',
    recommendedMods: [
      { id: 'sodium', name: 'Sodium', description: 'Modern rendering engine', optional: false },
      { id: 'lithium', name: 'Lithium', description: 'General physics and chunk optimization', optional: false },
      { id: 'ferrite-core', name: 'FerriteCore', description: 'Memory usage reduction', optional: true },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'template-survival-focused',
    name: 'Survival Expedition',
    description: 'Tailored for survival playthroughs with coordinates, minimap, inventory HUD, and waypoints.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.21.4',
    versionId: '1.21.4-fabric-0.16.9',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    memoryAllocation: { minMb: 3072, maxMb: 4096 },
    jvmArguments: ['-XX:+UseG1GC'],
    launchArguments: [],
    fernProfileId: 'survival',
    performanceProfile: 'balanced',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'template-creative-building',
    name: 'Architect & Building Suite',
    description: 'High-memory instance tuned for building tools, schematics, and high render distances.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.21.4',
    versionId: '1.21.4-fabric-0.16.9',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    memoryAllocation: { minMb: 4096, maxMb: 8192 },
    jvmArguments: ['-XX:+UseG1GC', '-XX:G1ReservePercent=15'],
    launchArguments: [],
    fernProfileId: 'building',
    performanceProfile: 'quality',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'template-creator-streaming',
    name: 'Creator & Streaming Studio',
    description: 'Configured for recording and streaming with privacy protections and replay compatibility.',
    category: 'official',
    schemaVersion: 1,
    minecraftVersion: '1.21.4',
    versionId: '1.21.4-fabric-0.16.9',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    memoryAllocation: { minMb: 4096, maxMb: 8192 },
    jvmArguments: ['-XX:+UseG1GC', '-XX:MaxGCPauseMillis=30'],
    launchArguments: [],
    fernProfileId: 'streaming',
    performanceProfile: 'quality',
    recommendedMods: [
      { id: 'replaymod', name: 'Replay Mod', description: 'Session recording tool', optional: true },
    ],
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

export class InstanceTemplateManager {
  private userTemplates: Map<string, InstanceTemplate> = new Map();
  private loaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  public async load(): Promise<void> {
    const filePath = this.pathManager.getTemplatesFilePath();
    try {
      await fs.access(filePath);
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      this.userTemplates.clear();
      if (Array.isArray(data.templates)) {
        for (const item of data.templates) {
          const validated = this.validateAndMigrateTemplate(item);
          if (validated) {
            this.userTemplates.set(validated.id, validated);
          }
        }
      }
      this.loaded = true;
      this.logger.info('InstanceTemplateManager', `Loaded ${this.userTemplates.size} user template(s).`);
    } catch {
      this.userTemplates.clear();
      this.loaded = true;
    }
  }

  public getAllTemplates(): InstanceTemplate[] {
    return [...BUILTIN_INSTANCE_TEMPLATES, ...Array.from(this.userTemplates.values())];
  }

  public getTemplate(id: string): InstanceTemplate | undefined {
    return (
      BUILTIN_INSTANCE_TEMPLATES.find((t) => t.id === id) ||
      this.userTemplates.get(id)
    );
  }

  public async saveUserTemplate(
    template: Omit<InstanceTemplate, 'id' | 'category' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
  ): Promise<InstanceTemplate> {
    const id = `user-template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const created: InstanceTemplate = {
      ...template,
      id,
      category: 'user',
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    const validated = this.validateAndMigrateTemplate(created);
    if (!validated) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Invalid template definition.');
    }

    this.userTemplates.set(id, validated);
    await this.save();
    return validated;
  }

  public async deleteUserTemplate(id: string): Promise<boolean> {
    if (BUILTIN_INSTANCE_TEMPLATES.some((t) => t.id === id)) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Cannot delete official built-in templates.');
    }

    const removed = this.userTemplates.delete(id);
    if (removed) {
      await this.save();
    }
    return removed;
  }

  public async createInstanceFromTemplate(
    templateId: string,
    instanceName: string,
    installationManager: InstallationManager
  ): Promise<Installation> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, `Template ${templateId} not found.`);
    }

    const name = instanceName.trim() || template.name;
    return installationManager.createInstallation({
      name,
      minecraftVersion: template.minecraftVersion,
      versionId: template.versionId,
      loader: template.loader,
      loaderVersion: template.loaderVersion,
      minMemory: template.memoryAllocation.minMb,
      maxMemory: template.memoryAllocation.maxMb,
      launchArguments: [...template.launchArguments],
      jvmArguments: [...template.jvmArguments],
      fernProfileId: template.fernProfileId,
      performanceProfile: template.performanceProfile,
    });
  }

  public validateAndMigrateTemplate(raw: any): InstanceTemplate | null {
    if (!raw || typeof raw !== 'object') return null;

    let schemaVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
    let template: any = { ...raw };

    // Migration from v0 -> v1 if needed
    if (schemaVersion === 0) {
      template.schemaVersion = 1;
      if (!template.memoryAllocation) {
        template.memoryAllocation = {
          minMb: raw.minMemory || 2048,
          maxMb: raw.maxMemory || 4096,
        };
      }
      if (!template.category) {
        template.category = 'user';
      }
      schemaVersion = 1;
    }

    if (!template.id || !template.name || !template.minecraftVersion) {
      return null;
    }

    return {
      id: String(template.id),
      name: String(template.name),
      description: String(template.description || ''),
      category: template.category === 'official' ? 'official' : 'user',
      schemaVersion: 1,
      minecraftVersion: String(template.minecraftVersion),
      versionId: template.versionId ? String(template.versionId) : undefined,
      loader: template.loader || 'vanilla',
      loaderVersion: template.loaderVersion ? String(template.loaderVersion) : undefined,
      memoryAllocation: {
        minMb: Number(template.memoryAllocation?.minMb || 2048),
        maxMb: Number(template.memoryAllocation?.maxMb || 4096),
      },
      jvmArguments: Array.isArray(template.jvmArguments) ? template.jvmArguments.map(String) : [],
      launchArguments: Array.isArray(template.launchArguments) ? template.launchArguments.map(String) : [],
      fernProfileId: template.fernProfileId ? String(template.fernProfileId) : undefined,
      performanceProfile: template.performanceProfile,
      recommendedMods: Array.isArray(template.recommendedMods) ? template.recommendedMods : undefined,
      createdAt: Number(template.createdAt || Date.now()),
      updatedAt: Number(template.updatedAt || Date.now()),
    };
  }

  private async save(): Promise<void> {
    const filePath = this.pathManager.getTemplatesFilePath();
    const data = {
      version: 1,
      templates: Array.from(this.userTemplates.values()),
    };
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
