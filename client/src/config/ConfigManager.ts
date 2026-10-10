import * as fs from 'fs';
import * as path from 'path';
import { ModuleManager } from '../modules/ModuleManager';
import { HUDManager } from '../hud/HUDManager';
import { ProfileManager, ClientProfile } from '../profiles/ProfileManager';
import { ThemeManager } from '../theme/ThemeManager';

export interface ClientGlobalConfig {
  version: number;
  theme: string;
  debugMode: boolean;
  menuKeybind: string;
  uiScale: number;
  reduceMotion: boolean;
  activeProfile: string;
}

export const CURRENT_CONFIG_VERSION = 2;

export const DEFAULT_CLIENT_CONFIG: ClientGlobalConfig = {
  version: CURRENT_CONFIG_VERSION,
  theme: 'fern_dark',
  debugMode: false,
  menuKeybind: 'Right Shift',
  uiScale: 1.0,
  reduceMotion: false,
  activeProfile: 'default',
};

export class ConfigManager {
  private configDir: string;
  private clientConfig: ClientGlobalConfig = { ...DEFAULT_CLIENT_CONFIG };

  constructor(
    instanceGameDir: string,
    private moduleManager: ModuleManager,
    private hudManager: HUDManager,
    private profileManager?: ProfileManager,
    private themeManager?: ThemeManager
  ) {
    this.configDir = path.join(instanceGameDir, 'Fern', 'config');
  }

  public getConfigDir(): string {
    return this.configDir;
  }

  public getClientConfig(): Readonly<ClientGlobalConfig> {
    return { ...this.clientConfig };
  }

  public updateClientConfig(partial: Partial<ClientGlobalConfig>): void {
    this.clientConfig = {
      ...this.clientConfig,
      ...partial,
    };
  }

  public async initialize(): Promise<void> {
    if (!fs.existsSync(this.configDir)) {
      await fs.promises.mkdir(this.configDir, { recursive: true });
    }
    await this.loadAll();
  }

  public async loadAll(): Promise<{ success: boolean; recoveredFiles: string[]; migratedFrom?: number }> {
    const recoveredFiles: string[] = [];
    let migratedFrom: number | undefined;

    // 1. Load client.json
    const clientPath = path.join(this.configDir, 'client.json');
    if (fs.existsSync(clientPath)) {
      try {
        const raw = await fs.promises.readFile(clientPath, 'utf8');
        const parsed = JSON.parse(raw);

        // Configuration Version Migration (v1 -> v2)
        if (parsed.version && parsed.version < CURRENT_CONFIG_VERSION) {
          migratedFrom = parsed.version;
          this.clientConfig = this.migrateConfig(parsed);
          // Persist upgraded schema immediately
          await fs.promises.writeFile(clientPath, JSON.stringify(this.clientConfig, null, 2), 'utf8');
        } else {
          this.clientConfig = {
            ...DEFAULT_CLIENT_CONFIG,
            ...parsed,
          };
        }

        if (this.themeManager && this.clientConfig.theme) {
          this.themeManager.setTheme(this.clientConfig.theme);
        }
      } catch (err) {
        console.warn('[ConfigManager] Error reading client.json, backing up and restoring defaults:', err);
        await this.backupCorrupted(clientPath);
        recoveredFiles.push('client.json');
        this.clientConfig = { ...DEFAULT_CLIENT_CONFIG };
      }
    }

    // 2. Load modules.json
    const modulesPath = path.join(this.configDir, 'modules.json');
    if (fs.existsSync(modulesPath)) {
      try {
        const raw = await fs.promises.readFile(modulesPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [id, data] of Object.entries<any>(parsed)) {
            const mod = this.moduleManager.getModule(id);
            if (!mod) continue;

            if (typeof data.enabled === 'boolean') {
              this.moduleManager.setModuleEnabled(id, data.enabled);
            }
            if (typeof data.keybind === 'string') {
              mod.keybind = data.keybind;
            }
            if (data.settings && typeof data.settings === 'object') {
              for (const [settingId, val] of Object.entries(data.settings)) {
                const setting = mod.getSetting(settingId);
                if (setting) {
                  setting.deserialize(val);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[ConfigManager] Error reading modules.json, backing up:', err);
        await this.backupCorrupted(modulesPath);
        recoveredFiles.push('modules.json');
      }
    }

    // 3. Load hud.json
    const hudPath = path.join(this.configDir, 'hud.json');
    if (fs.existsSync(hudPath)) {
      try {
        const raw = await fs.promises.readFile(hudPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.hudManager.deserialize(parsed);
        }
      } catch (err) {
        console.warn('[ConfigManager] Error reading hud.json, backing up:', err);
        await this.backupCorrupted(hudPath);
        recoveredFiles.push('hud.json');
      }
    }

    // 4. Load profiles.json
    const profilesPath = path.join(this.configDir, 'profiles.json');
    if (fs.existsSync(profilesPath) && this.profileManager) {
      try {
        const raw = await fs.promises.readFile(profilesPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            this.profileManager.importProfile(JSON.stringify(p));
          }
          if (this.clientConfig.activeProfile) {
            this.profileManager.switchProfile(this.clientConfig.activeProfile);
          }
        }
      } catch (err) {
        console.warn('[ConfigManager] Error reading profiles.json, backing up:', err);
        await this.backupCorrupted(profilesPath);
        recoveredFiles.push('profiles.json');
      }
    }

    return { success: true, recoveredFiles, migratedFrom };
  }

  public async saveAll(): Promise<void> {
    if (!fs.existsSync(this.configDir)) {
      await fs.promises.mkdir(this.configDir, { recursive: true });
    }

    if (this.profileManager) {
      this.clientConfig.activeProfile = this.profileManager.getActiveProfileId();
      this.profileManager.captureActiveState();
    }
    if (this.themeManager) {
      this.clientConfig.theme = this.themeManager.getActiveThemeId();
    }

    // 1. Save client.json
    const clientPath = path.join(this.configDir, 'client.json');
    await fs.promises.writeFile(clientPath, JSON.stringify(this.clientConfig, null, 2), 'utf8');

    // 2. Save modules.json
    const modulesPath = path.join(this.configDir, 'modules.json');
    const modulesData: Record<string, any> = {};
    for (const mod of this.moduleManager.getAllModules()) {
      const settingsObj: Record<string, any> = {};
      for (const s of mod.getSettings()) {
        settingsObj[s.id] = s.serialize();
      }
      modulesData[mod.id] = {
        enabled: mod.isEnabled(),
        keybind: mod.keybind,
        settings: settingsObj,
      };
    }
    await fs.promises.writeFile(modulesPath, JSON.stringify(modulesData, null, 2), 'utf8');

    // 3. Save hud.json
    const hudPath = path.join(this.configDir, 'hud.json');
    const hudData = this.hudManager.serialize();
    await fs.promises.writeFile(hudPath, JSON.stringify(hudData, null, 2), 'utf8');

    // 4. Save profiles.json
    if (this.profileManager) {
      const profilesPath = path.join(this.configDir, 'profiles.json');
      const profilesData = this.profileManager.getAllProfiles();
      await fs.promises.writeFile(profilesPath, JSON.stringify(profilesData, null, 2), 'utf8');
    }
  }

  public migrateConfig(oldConfig: any): ClientGlobalConfig {
    return {
      version: CURRENT_CONFIG_VERSION,
      theme: oldConfig.theme || DEFAULT_CLIENT_CONFIG.theme,
      debugMode: typeof oldConfig.debugMode === 'boolean' ? oldConfig.debugMode : DEFAULT_CLIENT_CONFIG.debugMode,
      menuKeybind: oldConfig.menuKeybind || DEFAULT_CLIENT_CONFIG.menuKeybind,
      uiScale: typeof oldConfig.uiScale === 'number' ? oldConfig.uiScale : DEFAULT_CLIENT_CONFIG.uiScale,
      reduceMotion: typeof oldConfig.reduceMotion === 'boolean' ? oldConfig.reduceMotion : DEFAULT_CLIENT_CONFIG.reduceMotion,
      activeProfile: oldConfig.activeProfile || DEFAULT_CLIENT_CONFIG.activeProfile,
    };
  }

  private async backupCorrupted(filePath: string): Promise<void> {
    try {
      const backupPath = `${filePath}.corrupt_${Date.now()}.bak`;
      await fs.promises.copyFile(filePath, backupPath);
    } catch {
      // Ignored
    }
  }
}
