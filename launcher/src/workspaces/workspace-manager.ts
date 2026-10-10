import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import { FernError, FernErrorCode } from '../core/errors';

export type WorkspaceTab = 'play' | 'instances' | 'mods' | 'creator' | 'settings';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon?: string;
  installationId: string;
  fernProfileId: string;
  resourcePackProfileId?: string;
  shaderPresetId?: string;
  activeTab: WorkspaceTab;
  isBuiltin?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const BUILTIN_WORKSPACES: Workspace[] = [
  {
    id: 'ws-main',
    name: 'Main Client',
    description: 'Primary daily gameplay workspace with balanced settings and standard HUD.',
    icon: 'compass',
    installationId: 'fabric-1-21-4',
    fernProfileId: 'default',
    resourcePackProfileId: 'profile-vanilla-default',
    shaderPresetId: 'shader-preset-vanilla-fast',
    activeTab: 'play',
    isBuiltin: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'ws-survival',
    name: 'Modded Survival',
    description: 'Adventure workspace with waypoints, coordinates HUD, and session timing.',
    icon: 'mountain',
    installationId: 'fabric-1-21-4',
    fernProfileId: 'survival',
    resourcePackProfileId: 'profile-vanilla-default',
    activeTab: 'play',
    isBuiltin: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'ws-performance',
    name: 'Performance Testing',
    description: 'Diagnostic workspace for frame timing benchmarks and telemetry.',
    icon: 'gauge',
    installationId: 'fabric-1-21-4',
    fernProfileId: 'performance',
    shaderPresetId: 'shader-preset-vanilla-fast',
    activeTab: 'settings',
    isBuiltin: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
  {
    id: 'ws-creator',
    name: 'Creator Studio',
    description: 'Production workspace for screenshots, replay sessions, and media export.',
    icon: 'camera',
    installationId: 'fabric-1-21-4',
    fernProfileId: 'streaming',
    shaderPresetId: 'shader-preset-cinematic-ultra',
    activeTab: 'creator',
    isBuiltin: true,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  },
];

export class WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map();
  private activeWorkspaceId = 'ws-main';
  private filePath: string;
  private isLoaded = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    this.filePath = this.pathManager.getWorkspacesFilePath();
  }

  public async load(): Promise<void> {
    try {
      await fs.access(this.filePath);
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(raw);
      this.workspaces.clear();

      // Add builtins
      for (const bw of BUILTIN_WORKSPACES) {
        this.workspaces.set(bw.id, { ...bw });
      }

      if (Array.isArray(data.workspaces)) {
        for (const w of data.workspaces) {
          this.workspaces.set(w.id, w);
        }
      }

      if (data.activeWorkspaceId && this.workspaces.has(data.activeWorkspaceId)) {
        this.activeWorkspaceId = data.activeWorkspaceId;
      }
    } catch {
      this.workspaces.clear();
      for (const bw of BUILTIN_WORKSPACES) {
        this.workspaces.set(bw.id, { ...bw });
      }
      this.activeWorkspaceId = 'ws-main';
    }

    this.isLoaded = true;
    this.logger.info('WorkspaceManager', `Loaded ${this.workspaces.size} workspace(s).`);
  }

  public getWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  public getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }

  public getActiveWorkspace(): Workspace {
    return this.workspaces.get(this.activeWorkspaceId) || this.workspaces.get('ws-main')!;
  }

  public getActiveWorkspaceId(): string {
    return this.activeWorkspaceId;
  }

  public async switchWorkspace(id: string): Promise<Workspace> {
    const ws = this.workspaces.get(id);
    if (!ws) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Workspace ${id} not found.`);
    }

    this.activeWorkspaceId = id;
    await this.save();
    this.logger.info('WorkspaceManager', `Switched active workspace to "${ws.name}" (${id})`);
    return ws;
  }

  public async createWorkspace(params: {
    name: string;
    description: string;
    installationId: string;
    fernProfileId: string;
    resourcePackProfileId?: string;
    shaderPresetId?: string;
    activeTab?: WorkspaceTab;
    icon?: string;
  }): Promise<Workspace> {
    if (!params.name || !params.name.trim()) {
      throw new FernError(FernErrorCode.VALIDATION_ERROR, 'Workspace name cannot be empty.');
    }

    const id = `ws-user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    const ws: Workspace = {
      id,
      name: params.name.trim(),
      description: params.description.trim(),
      icon: params.icon || 'folder',
      installationId: params.installationId,
      fernProfileId: params.fernProfileId,
      resourcePackProfileId: params.resourcePackProfileId,
      shaderPresetId: params.shaderPresetId,
      activeTab: params.activeTab || 'play',
      isBuiltin: false,
      createdAt: now,
      updatedAt: now,
    };

    this.workspaces.set(id, ws);
    await this.save();
    return ws;
  }

  public async updateWorkspace(
    id: string,
    updates: Partial<Omit<Workspace, 'id' | 'isBuiltin' | 'createdAt'>>
  ): Promise<Workspace> {
    const existing = this.workspaces.get(id);
    if (!existing) {
      throw new FernError(FernErrorCode.RESOURCE_NOT_FOUND, `Workspace ${id} not found.`);
    }

    const updated: Workspace = {
      ...existing,
      ...updates,
      id: existing.id,
      isBuiltin: existing.isBuiltin,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    this.workspaces.set(id, updated);
    await this.save();
    return updated;
  }

  public async deleteWorkspace(id: string): Promise<boolean> {
    const ws = this.workspaces.get(id);
    if (!ws || ws.isBuiltin) {
      return false;
    }

    const removed = this.workspaces.delete(id);
    if (removed) {
      if (this.activeWorkspaceId === id) {
        this.activeWorkspaceId = 'ws-main';
      }
      await this.save();
    }
    return removed;
  }

  /**
   * Validates workspace references when installations or client profiles are modified/deleted.
   * Repaired references automatically point to the first valid target.
   */
  public async validateReferences(
    validInstallationIds: string[],
    validProfileIds: string[]
  ): Promise<{ repairedCount: number; warnings: string[] }> {
    const warnings: string[] = [];
    let repairedCount = 0;

    const fallbackInst = validInstallationIds[0] || 'fabric-1-21-4';
    const fallbackProf = validProfileIds.includes('default') ? 'default' : validProfileIds[0] || 'default';

    for (const ws of this.workspaces.values()) {
      if (!validInstallationIds.includes(ws.installationId)) {
        warnings.push(`Workspace "${ws.name}" referenced missing installation ${ws.installationId}, relinked to ${fallbackInst}.`);
        ws.installationId = fallbackInst;
        ws.updatedAt = Date.now();
        repairedCount++;
      }

      if (!validProfileIds.includes(ws.fernProfileId)) {
        warnings.push(`Workspace "${ws.name}" referenced missing profile ${ws.fernProfileId}, relinked to ${fallbackProf}.`);
        ws.fernProfileId = fallbackProf;
        ws.updatedAt = Date.now();
        repairedCount++;
      }
    }

    if (repairedCount > 0) {
      await this.save();
    }

    return { repairedCount, warnings };
  }

  private async save(): Promise<void> {
    const customWorkspaces = Array.from(this.workspaces.values()).filter((w) => !w.isBuiltin);
    const data = {
      version: 1,
      activeWorkspaceId: this.activeWorkspaceId,
      workspaces: customWorkspaces,
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
