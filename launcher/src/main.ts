import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { BRANDING } from '../../shared/constants/branding';
import { defaultPathManager } from './core/paths';
import { FernLogger } from './core/logger';
import { SettingsManager } from './settings/settings-manager';
import { AccountManager } from './accounts/account-manager';
import { InstallationManager } from './installations/installation-manager';
import { ProfileManager } from './installations/profile-manager';
import { JavaManager } from './java/java-manager';
import { DownloadService } from './downloads/download-service';
import { DownloadManager } from './downloads/download-manager';
import { VersionService } from './versions/version-service';
import { MinecraftInstallerService } from './installations/installer-service';
import { MinecraftProcessManager } from './core/process';
import { FernLauncherService } from './core/launcher-service';
import { ModLoaderManager } from './loaders/loader-manager';
import { ModManager } from './mods/mod-manager';
import { PackManager } from './packs/pack-manager';
import { ModpackService } from './modpacks/modpack-service';
import { LauncherPerformanceManager } from './performance/performance-manager';
import { LaunchConfiguration } from '../../shared/models/launch';
import { CreateLocalAccountDTO } from '../../shared/models/account';
import {
  CreateInstallationDTO,
  UpdateInstallationDTO,
  ModLoaderType,
} from '../../shared/models/installation';
import { CreateProfileDTO } from '../../shared/models/profile';
import { FernSettings } from '../../shared/models/settings';
import { ModSearchOptions } from '../../shared/models/mod';
import { UpdateService } from './core/update-service';
import { BackupService } from './core/backup-service';
import { CacheService } from './core/cache-service';
import { DiskService } from './core/disk-service';
import { DiagnosticsService } from './core/diagnostics-service';
import { ImportExportService } from './core/import-export-service';
import { CrashAnalyzer } from './core/crash-analyzer';
import { LaunchArgumentValidator } from './core/launch-arguments';
import {
  LocalSocialProvider,
  PrivacyService,
  BlockService,
  PresenceService,
  StatisticsService,
  SocialNotificationService,
} from './social';
import { HybridSocialProvider } from './social/api/hybrid-social-provider';
import { RemoteFernApiClient } from './services/remote-fern-api-client';
import { NetworkStatusManager } from './services/network-status';
import { FernAuthService } from './services/auth-service';
import { CloudSyncService } from './services/cloud-sync-service';
import {
  CosmeticCategory,
  CosmeticDefinition,
  InGameCosmeticsPayload,
} from '../../shared/models/cosmetics';
import { UpdateUserProfileDTO } from '../../shared/models/user-profile';
import { PresenceState } from '../../shared/models/social';
import { SocialPrivacySettings } from '../../shared/models/privacy';
import { SocialNotificationPreferences } from '../../shared/models/social-notifications';

let mainWindow: BrowserWindow | null = null;

// Initialize Core Subsystems
const pathManager = defaultPathManager;
const logger = new FernLogger(pathManager);
const settingsManager = new SettingsManager(pathManager, logger);
const accountManager = new AccountManager(pathManager, logger);
const versionService = new VersionService(pathManager, logger);
const installationManager = new InstallationManager(pathManager, logger, versionService);
const profileManager = new ProfileManager(pathManager, logger);
const javaManager = new JavaManager(pathManager, logger);
const downloadService = new DownloadService(logger);
const downloadManager = new DownloadManager(logger);
const installerService = new MinecraftInstallerService(
  pathManager,
  versionService,
  downloadManager,
  logger
);
const loaderManager = new ModLoaderManager(pathManager, logger, downloadManager);
const modManager = new ModManager(pathManager, logger, downloadManager);
const packManager = new PackManager(pathManager, logger);
const modpackService = new ModpackService(
  pathManager,
  logger,
  installationManager,
  installerService,
  loaderManager,
  downloadManager
);
const processManager = new MinecraftProcessManager(logger);
const performanceManager = new LauncherPerformanceManager(logger, settingsManager, installationManager);

// Phase 8 Subsystems
const updateService = new UpdateService(pathManager, logger);
const backupService = new BackupService(pathManager, logger, installationManager, settingsManager, profileManager);
const cacheService = new CacheService(pathManager, logger);
const diagnosticsService = new DiagnosticsService(pathManager, installationManager, javaManager);
const importExportService = new ImportExportService(pathManager, logger, installationManager, profileManager);

// Phase 9 & 10 Subsystems
const localSocialProvider = new LocalSocialProvider(pathManager, logger);
const remoteApiClient = new RemoteFernApiClient({
  baseUrl: process.env.FERN_BACKEND_URL || 'http://localhost:4000',
});
const networkStatusManager = new NetworkStatusManager(remoteApiClient, logger);
const fernAuthService = new FernAuthService(pathManager, logger, remoteApiClient, networkStatusManager);
const cloudSyncService = new CloudSyncService(remoteApiClient, settingsManager, backupService, networkStatusManager, logger);
const hybridSocialProvider = new HybridSocialProvider(localSocialProvider, remoteApiClient, logger);

const privacyService = new PrivacyService(pathManager, logger);
const blockService = new BlockService(pathManager, logger);
const presenceService = new PresenceService('fern_usr_default', privacyService, logger);
const statisticsService = new StatisticsService(pathManager, logger);
const socialNotificationService = new SocialNotificationService(pathManager, logger);

processManager.onStateChange((count) => {
  if (count > 0) {
    performanceManager.backgroundTasks.onGameStarted();
  } else {
    performanceManager.backgroundTasks.onGameExited();
    presenceService.setLauncher();
  }
});

const launcherService = new FernLauncherService(
  pathManager,
  logger,
  accountManager,
  installationManager,
  profileManager,
  javaManager,
  settingsManager,
  versionService,
  installerService,
  processManager,
  loaderManager,
  performanceManager
);

async function initializeApp() {
  await pathManager.initializeDirectories();
  await logger.initialize();
  logger.info('FernApp', `Starting ${BRANDING.APP_NAME} v${BRANDING.VERSION}...`);

  await settingsManager.load();
  await accountManager.load();
  await installationManager.load();
  await profileManager.load();

  // Phase 9 & 10 Social and Online subsystems initialization
  await localSocialProvider.initialize();
  await fernAuthService.initialize();
  networkStatusManager.startPeriodicCheck(15000);
  networkStatusManager.onStatusChange((status) => {
    mainWindow?.webContents.send('fern:network-status-changed', status);
  });
  await privacyService.initialize();
  await blockService.initialize();
  await statisticsService.initialize();
  await socialNotificationService.initialize();

  // Background version manifest & Java scan
  versionService.getManifest().catch((err) => {
    logger.warn('FernApp', 'Initial background version manifest fetch error:', err);
  });
  javaManager.detectRuntimes().catch((err) => {
    logger.warn('FernApp', 'Initial background Java detection had errors:', err);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 780,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (process.argv.includes('--smoke-test')) {
      logger.info('SmokeTest', 'Automated smoke test passed: Electron window ready and initialized.');
      console.log('FERN_LAUNCHER_SMOKE_TEST_SUCCESS');
      app.quit();
      return;
    }
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Forward launch status updates to renderer
  launcherService.onStatusChange((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fern:launch-status', status);
    }
  });

  // Forward log stream to renderer
  logger.onLog((entry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fern:log-entry', entry);
    }
  });

  // Forward download progress
  downloadService.onProgress((progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('fern:download-progress', progress);
    }
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle('fern:get-version', () => BRANDING.VERSION);
  ipcMain.handle('fern:get-base-path', () => pathManager.getBaseDir());

  // Window Controls
  ipcMain.on('fern:window:minimize', () => mainWindow?.minimize());
  ipcMain.on('fern:window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('fern:window:close', () => mainWindow?.close());

  // Settings
  ipcMain.handle('fern:settings:get', () => settingsManager.getSettings());
  ipcMain.handle('fern:settings:update', (_, newSettings: Partial<FernSettings>) =>
    settingsManager.updateSettings(newSettings)
  );

  // Accounts
  ipcMain.handle('fern:accounts:get', () => accountManager.getAccounts());
  ipcMain.handle('fern:accounts:get-active', () => accountManager.getActiveAccount());
  ipcMain.handle('fern:accounts:select', (_, id: string) => accountManager.selectAccount(id));
  ipcMain.handle('fern:accounts:create-local', (_, dto: CreateLocalAccountDTO) =>
    accountManager.createLocalAccount(dto)
  );
  ipcMain.handle('fern:accounts:remove', (_, id: string) => accountManager.removeAccount(id));

  // Versions
  ipcMain.handle('fern:versions:get-manifest', (_, forceRefresh?: boolean) =>
    versionService.getManifest(forceRefresh)
  );
  ipcMain.handle('fern:versions:get-list', (_, opts) => versionService.getVersions(opts));
  ipcMain.handle('fern:versions:install', async (_, versionId: string) => {
    await installerService.installVersion(versionId, (update) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fern:install-progress', update);
      }
    });
  });
  ipcMain.handle('fern:versions:cancel-install', (_, versionId: string) =>
    installerService.cancelInstallation(versionId)
  );

  // Installations
  ipcMain.handle('fern:installations:get', () => installationManager.getInstallations());
  ipcMain.handle('fern:installations:get-active', () => installationManager.getActiveInstallation());
  ipcMain.handle('fern:installations:select', (_, id: string) => installationManager.selectInstallation(id));
  ipcMain.handle('fern:installations:create', (_, dto: CreateInstallationDTO) => installationManager.createInstallation(dto));
  ipcMain.handle('fern:installations:update', (_, id: string, dto: UpdateInstallationDTO) =>
    installationManager.updateInstallation(id, dto)
  );
  ipcMain.handle('fern:installations:duplicate', (_, id: string) => installationManager.duplicateInstallation(id));
  ipcMain.handle('fern:installations:delete', (_, id: string, deleteFiles?: boolean) =>
    installationManager.deleteInstallation(id, deleteFiles)
  );
  ipcMain.handle('fern:installations:open-folder', async (_, id: string) => {
    const inst = installationManager.getInstallation(id);
    if (inst) {
      const folder = inst.gameDirectory || pathManager.getInstanceDir(inst.id);
      await shell.openPath(folder);
    }
  });

  // Profiles
  ipcMain.handle('fern:profiles:get', () => profileManager.getProfiles());
  ipcMain.handle('fern:profiles:get-active', () => profileManager.getActiveProfile());
  ipcMain.handle('fern:profiles:select', (_, id: string) => profileManager.selectProfile(id));
  ipcMain.handle('fern:profiles:create', (_, dto: CreateProfileDTO) => profileManager.createProfile(dto));
  ipcMain.handle('fern:profiles:delete', (_, id: string) => profileManager.deleteProfile(id));

  // Java
  ipcMain.handle('fern:java:detect', () => javaManager.detectRuntimes());
  ipcMain.handle('fern:java:get-runtimes', () => javaManager.getRuntimes());

  // Launch
  ipcMain.handle('fern:launch:start', async (_, config: LaunchConfiguration) => {
    const inst = installationManager.getInstallation(config.installationId);
    const ver = inst?.minecraftVersion || '1.21.4';
    const instName = inst?.name || 'Default';

    presenceService.setPlaying(ver, instName);
    const sessId = statisticsService.startSession(ver, instName);

    const result = await launcherService.launch(config);
    if (!result.success) {
      presenceService.setLauncher();
      await statisticsService.endSession(sessId);
    }
    return result;
  });

  // Logs & Folders
  ipcMain.handle('fern:logs:get-recent', (_, limit?: number) => logger.getRecentLogs(limit));
  ipcMain.handle('fern:logs:get-file-path', () => logger.getLogFilePath());
  ipcMain.handle('fern:logs:open-folder', async () => {
    await shell.openPath(pathManager.getLogsDir());
  });

  // Downloads
  ipcMain.handle('fern:downloads:get-active', () => downloadService.getActiveDownloads());
  ipcMain.handle('fern:downloads:cancel', (_, id: string) => downloadService.cancel(id));
  ipcMain.handle('fern:downloads:get-queue', () => downloadManager.getQueue());
  ipcMain.handle('fern:downloads:get-queue-summary', () => downloadManager.getQueueSummary());
  ipcMain.handle('fern:downloads:clear-queue', () => downloadManager.clearQueue());

  // Mod Loaders
  ipcMain.handle('fern:loaders:get-all', () => loaderManager.getAvailableLoaders());
  ipcMain.handle('fern:loaders:get-versions', (_, loader: ModLoaderType, mcVersion: string) =>
    loaderManager.getCompatibleVersions(loader, mcVersion)
  );
  ipcMain.handle('fern:loaders:install', async (_, installationId: string, loaderVersion: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    return loaderManager.installLoader(inst, loaderVersion);
  });

  // Mods
  ipcMain.handle('fern:mods:get-installed', async (_, installationId: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) return [];
    return modManager.getInstalledMods(inst);
  });
  ipcMain.handle('fern:mods:toggle', async (_, installationId: string, filePath: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    return modManager.toggleMod(inst, filePath);
  });
  ipcMain.handle('fern:mods:toggle-all', async (_, installationId: string, enable: boolean) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    if (enable) {
      await modManager.enableAll(inst);
    } else {
      await modManager.disableAll(inst);
    }
  });
  ipcMain.handle('fern:mods:remove', async (_, installationId: string, filePath: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    return modManager.removeMod(inst, filePath);
  });
  ipcMain.handle('fern:mods:search', (_, opts: ModSearchOptions) => modManager.getProvider().search(opts));
  ipcMain.handle('fern:mods:get-project', (_, projectId: string) => modManager.getProvider().getProject(projectId));
  ipcMain.handle('fern:mods:get-versions', (_, projectId: string, mcVersion?: string, loader?: string) =>
    modManager.getProvider().getVersions(projectId, mcVersion, loader)
  );
  ipcMain.handle('fern:mods:get-dependencies', (_, versionId: string) =>
    modManager.getProvider().getDependencies(versionId)
  );
  ipcMain.handle('fern:mods:install', async (_, installationId: string, url: string, fileName: string, sha1?: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    return modManager.installModFromUrl(inst, url, fileName, sha1);
  });
  ipcMain.handle('fern:mods:validate-conflicts', async (_, installationId: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) return { hasConflicts: false, warnings: [], incompatibleMods: [], missingDependencies: [] };
    const mods = await modManager.getInstalledMods(inst);
    return modManager.validateConflicts(inst, mods);
  });
  ipcMain.handle('fern:mods:open-folder', async (_, installationId: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (inst) {
      const folder = modManager.getModsDir(inst);
      await shell.openPath(folder);
    }
  });

  // Resource Packs & Shaders
  ipcMain.handle('fern:packs:get-resource-packs', async (_, installationId: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) return [];
    return packManager.getResourcePacks(inst);
  });
  ipcMain.handle('fern:packs:toggle-resource-pack', async (_, installationId: string, filePath: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    return packManager.toggleResourcePack(inst, filePath);
  });
  ipcMain.handle('fern:packs:remove-resource-pack', async (_, filePath: string) => {
    return packManager.removeResourcePack(filePath);
  });
  ipcMain.handle('fern:packs:open-resource-packs-folder', async (_, installationId: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (inst) {
      const folder = packManager.getResourcePacksDir(inst);
      await shell.openPath(folder);
    }
  });

  ipcMain.handle('fern:packs:get-shader-packs', async (_, installationId: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) return [];
    return packManager.getShaderPacks(inst);
  });
  ipcMain.handle('fern:packs:toggle-shader-pack', async (_, installationId: string, filePath: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    return packManager.toggleShaderPack(inst, filePath);
  });
  ipcMain.handle('fern:packs:remove-shader-pack', async (_, filePath: string) => {
    return packManager.removeShaderPack(filePath);
  });
  ipcMain.handle('fern:packs:open-shader-packs-folder', async (_, installationId: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (inst) {
      const folder = packManager.getShaderPacksDir(inst);
      await shell.openPath(folder);
    }
  });

  // Modpacks
  ipcMain.handle('fern:modpacks:import', async (_, archivePath: string) => {
    return modpackService.importModpack(archivePath, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fern:modpack-progress', progress);
      }
    });
  });
  ipcMain.handle('fern:modpacks:export', async (_, installationId: string, destPath: string) => {
    const inst = installationManager.getInstallation(installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);
    return modpackService.exportModpack(inst, destPath);
  });

  // Native File Dialogs
  ipcMain.handle('fern:dialog:select-archive', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Modpack Archive',
      filters: [{ name: 'Modpacks (.mrpack, .zip)', extensions: ['mrpack', 'zip'] }],
      properties: ['openFile'],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('fern:dialog:select-export-path', async (_, defaultName: string) => {
    if (!mainWindow) return null;
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Modpack Archive',
      defaultPath: `${defaultName}.mrpack`,
      filters: [{ name: 'Modpack (.mrpack)', extensions: ['mrpack'] }, { name: 'ZIP Archive (.zip)', extensions: ['zip'] }],
    });
    return res.canceled ? null : res.filePath;
  });

  // Performance Engine IPC handlers
  ipcMain.handle('fern:performance:get-settings', async () => {
    return performanceManager.getGlobalSettings();
  });
  ipcMain.handle('fern:performance:update-settings', async (_, partial: any) => {
    return performanceManager.updateGlobalSettings(partial);
  });
  ipcMain.handle('fern:performance:get-instance-settings', async (_, installationId: string) => {
    return performanceManager.getEffectiveSettingsForInstallation(installationId);
  });
  ipcMain.handle('fern:performance:get-ram-recommendation', async (_, installationId?: string) => {
    return performanceManager.getRamRecommendation(installationId);
  });
  ipcMain.handle('fern:performance:get-jvm-preview', async (_, installationId: string, javaVersion?: number) => {
    return performanceManager.getJvmArgumentSpecs(installationId, javaVersion);
  });
  ipcMain.handle('fern:performance:run-benchmark', async (_, installationId: string, profile: any, durationSeconds?: number) => {
    return performanceManager.runBenchmark(installationId, profile, durationSeconds);
  });
  ipcMain.handle('fern:performance:get-benchmark-history', async () => {
    return performanceManager.getBenchmarkHistory();
  });
  ipcMain.handle('fern:performance:compare-benchmarks', async (_, baselineId: string, optimizedId: string) => {
    return performanceManager.compareBenchmarks(baselineId, optimizedId);
  });
  ipcMain.handle('fern:performance:get-hardware-info', async () => {
    return performanceManager.getHardwareInfo();
  });

  // Phase 8 & 11 - Updates
  ipcMain.handle('fern:updates:check', (_, channel) => updateService.checkForUpdates(channel));
  ipcMain.handle('fern:updates:set-channel', (_, channel) => updateService.setChannel(channel));
  ipcMain.handle('fern:updates:get-channel', () => updateService.getChannel());
  ipcMain.handle('fern:updates:rollback', () => updateService.rollbackUpdate());
  ipcMain.handle('fern:updates:has-rollback', () => updateService.hasRollbackAvailable());
  ipcMain.handle('fern:updates:defer', (_, version: string) => updateService.deferUpdate(version));
  ipcMain.handle('fern:updates:download-and-validate', async (_, release: any) => {
    return updateService.downloadAndValidateUpdate(release, (prog) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('fern:update-download-progress', prog);
      }
    });
  });

  // Phase 8 - Backups
  ipcMain.handle('fern:backups:list', () => backupService.listBackups());
  ipcMain.handle('fern:backups:create-config', (_, name) => backupService.createConfigBackup(name));
  ipcMain.handle('fern:backups:create-installation', (_, instId, opts) =>
    backupService.createInstallationBackup(instId, opts)
  );
  ipcMain.handle('fern:backups:validate', (_, id) => backupService.validateBackup(id));
  ipcMain.handle('fern:backups:restore', (_, id) => backupService.restoreBackup(id));
  ipcMain.handle('fern:backups:delete', (_, id) => backupService.deleteBackup(id));

  // Phase 8 - Cache & Disk Space
  ipcMain.handle('fern:cache:get-breakdown', () => cacheService.getCacheBreakdown());
  ipcMain.handle('fern:cache:clear-safe', () => cacheService.clearSafeCache());
  ipcMain.handle('fern:disk:check-space', (_, targetPath, requiredBytes) =>
    DiskService.checkDiskSpace(targetPath, requiredBytes)
  );

  // Phase 8 & 11 - Diagnostics
  ipcMain.handle('fern:diagnostics:generate', (_, instId) => diagnosticsService.generateReport(instId));
  ipcMain.handle('fern:diagnostics:sanitize-text', (_, text) => DiagnosticsService.sanitizeSensitiveText(text));
  ipcMain.handle('fern:diagnostics:export-file', (_, destPath?: string, instId?: string) =>
    diagnosticsService.exportReportToFile(destPath, instId)
  );

  // Phase 11 - Feedback & Bug Reporting
  ipcMain.handle('fern:feedback:submit', async (_, feedbackPayload: any) => {
    try {
      const backendUrl = process.env.FERN_API_URL || 'http://localhost:4000/api/v1';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(`${backendUrl}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        return await resp.json();
      }
    } catch {}

    // Offline / fallback storage: save locally to AppData feedback directory
    const feedbackDir = path.join(pathManager.getFernDir(), 'feedback');
    await fs.promises.mkdir(feedbackDir, { recursive: true });
    const refId = `LOCAL-FB-${Date.now().toString(36).toUpperCase()}`;
    const filePath = path.join(feedbackDir, `${refId}.json`);
    await fs.promises.writeFile(
      filePath,
      JSON.stringify({ ...feedbackPayload, referenceId: refId, submittedAt: new Date().toISOString() }, null, 2)
    );

    return {
      success: true,
      referenceId: refId,
      message: 'Feedback saved locally to diagnostic folder. Will be attached when backend reconnects.',
      localFilePath: filePath,
    };
  });

  ipcMain.handle('fern:feedback:list-local', async () => {
    const feedbackDir = path.join(pathManager.getFernDir(), 'feedback');
    try {
      await fs.promises.mkdir(feedbackDir, { recursive: true });
      const files = await fs.promises.readdir(feedbackDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      const reports = [];
      for (const file of jsonFiles) {
        try {
          const raw = await fs.promises.readFile(path.join(feedbackDir, file), 'utf-8');
          reports.push(JSON.parse(raw));
        } catch {}
      }
      return reports;
    } catch {
      return [];
    }
  });

  // Phase 8 - Crash Analysis
  ipcMain.handle('fern:crash:analyze', (_, gameDir, exitCode) => CrashAnalyzer.analyze(gameDir, exitCode));

  // Phase 8 - Import & Export
  ipcMain.handle('fern:import-export:export-installation', (_, id) => importExportService.exportInstallation(id));
  ipcMain.handle('fern:import-export:export-profile', (_, id) => importExportService.exportProfile(id));
  ipcMain.handle('fern:import-export:import-package', (_, rawJson) => importExportService.importPackage(rawJson));

  // Phase 8 - JVM Argument Safety
  ipcMain.handle('fern:jvm:validate-args', (_, args, javaVersion) =>
    LaunchArgumentValidator.validateArgs(args, javaVersion)
  );

  // Phase 8 - Java Manager Additions
  ipcMain.handle('fern:java:add-manually', (_, customPath) => javaManager.addRuntimeManually(customPath));
  ipcMain.handle('fern:java:remove', (_, idOrPath) => javaManager.removeRuntime(idOrPath));
  ipcMain.handle('fern:java:set-default', (_, idOrPath) => javaManager.setDefaultRuntime(idOrPath));
  ipcMain.handle('fern:java:check-availability', (_, mcVersion) =>
    javaManager.checkJavaAvailability(mcVersion)
  );

  // Phase 8 - Accounts Additions
  ipcMain.handle('fern:accounts:add-microsoft', (_, name, uuid, tokens) =>
    accountManager.addMicrosoftAccount(name, uuid, tokens)
  );
  ipcMain.handle('fern:accounts:has-valid-session', (_, accountId) =>
    accountManager.hasValidSession(accountId)
  );

  // Helper for in-game cosmetics payload
  const buildInGameCosmeticsPayload = async (
    playerModel: 'default' | 'slim' = 'default'
  ): Promise<InGameCosmeticsPayload> => {
    const profileRes = await hybridSocialProvider.profile.getProfile();
    const equippedRes = await hybridSocialProvider.cosmetics.getEquippedCosmetics();
    const catalogRes = await hybridSocialProvider.cosmetics.getCatalog();

    const catalogMap = new Map((catalogRes.data || []).map((item) => [item.id, item]));
    const equippedDefs: Partial<Record<CosmeticCategory, CosmeticDefinition>> = {};

    if (equippedRes.data?.equipped) {
      for (const [cat, id] of Object.entries(equippedRes.data.equipped)) {
        if (id && catalogMap.has(id)) {
          equippedDefs[cat as CosmeticCategory] = catalogMap.get(id);
        }
      }
    }

    return {
      userId: profileRes.data?.id || 'fern_usr_default',
      playerUuid: 'local_uuid',
      playerModel,
      equipped: equippedDefs,
      cosmeticsEnabled: true,
    };
  };

  // Phase 9 - Social & Profile (Routed through Hybrid provider)
  ipcMain.handle('fern:social:get-profile', () => hybridSocialProvider.profile.getProfile());
  ipcMain.handle('fern:social:update-profile', (_, dto: UpdateUserProfileDTO) =>
    hybridSocialProvider.profile.updateProfile(dto)
  );
  ipcMain.handle('fern:social:get-public-profile', (_, userId: string) =>
    hybridSocialProvider.profile.getPublicProfile(userId)
  );

  // Phase 9 - Friends (Routed through Hybrid provider)
  ipcMain.handle('fern:social:get-friends', () => hybridSocialProvider.friends.getFriends());
  ipcMain.handle('fern:social:send-request', (_, username: string) =>
    hybridSocialProvider.friends.sendFriendRequest(username)
  );
  ipcMain.handle('fern:social:respond-request', (_, reqId: string, accept: boolean) =>
    hybridSocialProvider.friends.respondToRequest(reqId, accept)
  );
  ipcMain.handle('fern:social:cancel-request', (_, reqId: string) =>
    hybridSocialProvider.friends.cancelFriendRequest(reqId)
  );
  ipcMain.handle('fern:social:remove-friend', (_, id: string) =>
    hybridSocialProvider.friends.removeFriend(id)
  );
  ipcMain.handle('fern:social:get-requests', () => hybridSocialProvider.friends.getFriendRequests());
  ipcMain.handle('fern:social:search-users', (_, q: string) =>
    hybridSocialProvider.friends.searchUsers(q)
  );

  // Phase 9 - Blocking (Routed through Hybrid provider)
  ipcMain.handle('fern:social:get-blocked', () => hybridSocialProvider.friends.getBlockedUsers());
  ipcMain.handle(
    'fern:social:block-user',
    (_, userId: string, username: string, display?: string, reason?: string) =>
      hybridSocialProvider.friends.blockUser(userId, username, display, reason)
  );
  ipcMain.handle('fern:social:unblock-user', (_, userId: string) =>
    hybridSocialProvider.friends.unblockUser(userId)
  );

  // Phase 9 - Presence & Privacy (Routed through Hybrid provider)
  ipcMain.handle('fern:social:get-presence', () => presenceService.getPublishedPresence());
  ipcMain.handle('fern:social:set-presence-state', (_, state: PresenceState) => {
    presenceService.setPresenceState(state);
    return hybridSocialProvider.presence.updatePresence({
      userId: 'current',
      state,
      lastSeen: Date.now(),
    });
  });
  ipcMain.handle('fern:social:get-privacy', () => hybridSocialProvider.profile.getPrivacySettings());
  ipcMain.handle('fern:social:update-privacy', (_, updates: Partial<SocialPrivacySettings>) => {
    privacyService.updateSettings(updates);
    return hybridSocialProvider.profile.updatePrivacySettings(updates);
  });

  // Phase 9 - Statistics
  ipcMain.handle('fern:social:get-statistics', () => statisticsService.getStatistics());
  ipcMain.handle('fern:social:reset-statistics', () => statisticsService.resetStatistics());

  // Phase 9 - Cosmetics (Authoritative Hybrid provider)
  ipcMain.handle('fern:cosmetics:get-catalog', (_, cat?: CosmeticCategory) =>
    hybridSocialProvider.cosmetics.getCatalog(cat)
  );
  ipcMain.handle('fern:cosmetics:get-owned', () =>
    hybridSocialProvider.cosmetics.getOwnedCosmetics()
  );
  ipcMain.handle('fern:cosmetics:get-equipped', () =>
    hybridSocialProvider.cosmetics.getEquippedCosmetics()
  );
  ipcMain.handle('fern:cosmetics:equip', (_, cat: CosmeticCategory, id: string) =>
    hybridSocialProvider.cosmetics.equipCosmetic(cat, id)
  );
  ipcMain.handle('fern:cosmetics:unequip', (_, cat: CosmeticCategory) =>
    hybridSocialProvider.cosmetics.unequipCosmetic(cat)
  );
  ipcMain.handle('fern:cosmetics:toggle-favorite', (_, id: string) =>
    hybridSocialProvider.cosmetics.toggleFavorite(id)
  );
  ipcMain.handle('fern:cosmetics:get-ingame-payload', (_, model?: 'default' | 'slim') =>
    buildInGameCosmeticsPayload(model)
  );

  // Phase 9 - Social Notifications
  ipcMain.handle('fern:social:get-notifications', () =>
    socialNotificationService.getNotifications()
  );
  ipcMain.handle('fern:social:mark-read', (_, id: string) =>
    socialNotificationService.markAsRead(id)
  );
  ipcMain.handle('fern:social:mark-all-read', () =>
    socialNotificationService.markAllAsRead()
  );
  ipcMain.handle('fern:social:clear-notifications', () =>
    socialNotificationService.clearNotifications()
  );
  ipcMain.handle('fern:social:get-notification-prefs', () =>
    socialNotificationService.getPreferences()
  );
  ipcMain.handle(
    'fern:social:update-notification-prefs',
    (_, prefs: Partial<SocialNotificationPreferences>) =>
      socialNotificationService.updatePreferences(prefs)
  );

  // ==========================================
  // PHASE 10 - NETWORK & CONNECTION
  // ==========================================
  ipcMain.handle('fern:network:get-status', () => networkStatusManager.getStatus());
  ipcMain.handle('fern:network:check', () => networkStatusManager.checkConnection());

  // ==========================================
  // PHASE 10 - FERN AUTHENTICATION
  // ==========================================
  ipcMain.handle('fern:auth:register', (_, dto) => fernAuthService.register(dto));
  ipcMain.handle('fern:auth:login', (_, dto) => fernAuthService.login(dto));
  ipcMain.handle('fern:auth:logout', () => fernAuthService.logout());
  ipcMain.handle('fern:auth:get-session', () => fernAuthService.getSession());
  ipcMain.handle('fern:auth:get-user', () => fernAuthService.getUser());
  ipcMain.handle('fern:auth:verify-email', (_, token: string) => fernAuthService.verifyEmail(token));
  ipcMain.handle('fern:auth:request-password-reset', (_, id: string) => fernAuthService.requestPasswordReset(id));
  ipcMain.handle('fern:auth:confirm-password-reset', (_, token: string, newPass: string) =>
    fernAuthService.confirmPasswordReset(token, newPass)
  );
  ipcMain.handle('fern:auth:delete-account', (_, pass: string) => fernAuthService.deleteAccount(pass));
  ipcMain.handle('fern:auth:list-sessions', () => remoteApiClient.auth.listSessions());
  ipcMain.handle('fern:auth:revoke-session', (_, id: string) => remoteApiClient.auth.revokeSession(id));

  // ==========================================
  // PHASE 10 - CLOUD CONFIGURATION SYNC
  // ==========================================
  ipcMain.handle('fern:sync:get-status', () => cloudSyncService.getStatus());
  ipcMain.handle('fern:sync:enable', () => cloudSyncService.enable());
  ipcMain.handle('fern:sync:disable', () => cloudSyncService.disable());
  ipcMain.handle('fern:sync:push', (_, force?: boolean) => cloudSyncService.pushLocalConfig(force));
  ipcMain.handle('fern:sync:pull', (_, revId?: string) => cloudSyncService.pullRemoteConfig(revId));
  ipcMain.handle('fern:sync:resolve-conflict', (_, strategy: 'keep_local' | 'take_cloud') =>
    cloudSyncService.resolveConflict(strategy)
  );
  ipcMain.handle('fern:sync:reset', () => cloudSyncService.resetCloudData());
}

app.whenReady().then(async () => {
  await initializeApp();
  registerIpcHandlers();

  if (process.argv.includes('--smoke-test')) {
    logger.info('FernApp', 'Smoke test completed successfully. Subsystems operational.');
    setTimeout(() => {
      app.quit();
    }, 500);
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
