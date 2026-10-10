import { contextBridge, ipcRenderer } from 'electron';
import { FernSettings } from '../../shared/models/settings';
import { Account, CreateLocalAccountDTO } from '../../shared/models/account';
import {
  Installation,
  CreateInstallationDTO,
  UpdateInstallationDTO,
  ModLoaderType,
} from '../../shared/models/installation';
import { FernProfile, CreateProfileDTO } from '../../shared/models/profile';
import { JavaDetectionResult, JavaRuntime } from '../../shared/models/java';
import { LaunchConfiguration, LaunchResult, LaunchStatusUpdate } from '../../shared/models/launch';
import {
  MinecraftVersionManifest,
  MinecraftVersionSummary,
} from '../../shared/models/version';
import {
  LoaderVersionInfo,
  ModLoaderInstallResult,
} from '../../shared/models/loader';
import {
  Mod,
  ModSearchOptions,
  ModSearchResult,
  ModSearchResultItem,
  ModVersionDetails,
  ModDependency,
  ConflictValidationResult,
} from '../../shared/models/mod';
import { ResourcePack, ShaderPack } from '../../shared/models/packs';
import { ModpackImportProgress } from '../../shared/models/modpack';
import { LogEntry } from './core/logger';
import { DownloadProgress } from '../../shared/models/download';
import {
  PerformanceSettings,
  PerformanceProfileType,
  RamRecommendation,
  BenchmarkReport,
  ComparisonReport,
  SystemHardwareInfo,
  JvmArgumentSpec,
} from '../../shared/models/performance';
import { FernUserProfile, UpdateUserProfileDTO } from '../../shared/models/user-profile';
import {
  CosmeticCategory,
  CosmeticDefinition,
  CosmeticEquippedState,
  CosmeticOwnership,
  InGameCosmeticsPayload,
} from '../../shared/models/cosmetics';
import {
  Friend,
  FriendRequest,
  BlockEntry,
  UserPresence,
  FriendSearchResult,
  PresenceState,
} from '../../shared/models/social';
import { SocialPrivacySettings } from '../../shared/models/privacy';
import { PlayerStatistics } from '../../shared/models/statistics';
import {
  SocialNotification,
  SocialNotificationPreferences,
} from '../../shared/models/social-notifications';
import { NetworkStatus, FernAuthSession, FernAuthUser, SessionInfo } from '../../shared/models/auth';
import { CloudSyncStatus, SyncRevisionInfo } from '../../shared/models/cloud-sync';

export interface VersionInstallProgress {
  versionId: string;
  stage: 'manifest' | 'client' | 'libraries' | 'assets' | 'complete';
  percentage: number;
  message: string;
  speed?: string;
  eta?: string;
}

export interface FernAPI {
  getVersion: () => Promise<string>;
  getBasePath: () => Promise<string>;

  // Window Controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Settings
  getSettings: () => Promise<FernSettings>;
  updateSettings: (settings: Partial<FernSettings>) => Promise<FernSettings>;

  // Accounts
  getAccounts: () => Promise<Account[]>;
  getActiveAccount: () => Promise<Account | null>;
  selectAccount: (id: string) => Promise<Account>;
  createLocalAccount: (dto: CreateLocalAccountDTO) => Promise<Account>;
  removeAccount: (id: string) => Promise<void>;

  // Versions
  getVersionManifest: (forceRefresh?: boolean) => Promise<MinecraftVersionManifest>;
  getVersionsList: (options?: {
    type?: 'all' | 'release' | 'snapshot' | 'installed';
    search?: string;
  }) => Promise<MinecraftVersionSummary[]>;
  installVersion: (versionId: string) => Promise<void>;
  cancelInstallVersion: (versionId: string) => Promise<void>;
  onInstallProgress: (callback: (update: VersionInstallProgress) => void) => () => void;

  // Installations
  getInstallations: () => Promise<Installation[]>;
  getActiveInstallation: () => Promise<Installation | null>;
  selectInstallation: (id: string) => Promise<Installation>;
  createInstallation: (dto: CreateInstallationDTO) => Promise<Installation>;
  updateInstallation: (id: string, dto: UpdateInstallationDTO) => Promise<Installation>;
  duplicateInstallation: (id: string) => Promise<Installation>;
  deleteInstallation: (id: string, deleteFiles?: boolean) => Promise<void>;
  openInstallationFolder: (id: string) => Promise<void>;

  // Profiles
  getProfiles: () => Promise<FernProfile[]>;
  getActiveProfile: () => Promise<FernProfile | null>;
  selectProfile: (id: string) => Promise<FernProfile>;
  createProfile: (dto: CreateProfileDTO) => Promise<FernProfile>;
  deleteProfile: (id: string) => Promise<void>;

  // Java
  detectJava: () => Promise<JavaDetectionResult>;
  getJavaRuntimes: () => Promise<JavaRuntime[]>;

  // Launch
  launchMinecraft: (config: LaunchConfiguration) => Promise<LaunchResult>;
  onLaunchStatus: (callback: (status: LaunchStatusUpdate) => void) => () => void;

  // Logging & Folders
  getRecentLogs: (limit?: number) => Promise<LogEntry[]>;
  getLogFilePath: () => Promise<string | null>;
  openLogsFolder: () => Promise<void>;
  onLogEntry: (callback: (entry: LogEntry) => void) => () => void;

  // Downloads
  getActiveDownloads: () => Promise<DownloadProgress[]>;
  cancelDownload: (id: string) => Promise<void>;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  getDownloadQueue: () => Promise<any[]>;
  getQueueSummary: () => Promise<any>;
  clearDownloadQueue: () => Promise<void>;

  // Mod Loaders
  getLoaders: () => Promise<Array<{ id: ModLoaderType; name: string }>>;
  getLoaderVersions: (loader: ModLoaderType, mcVersion: string) => Promise<LoaderVersionInfo[]>;
  installLoader: (installationId: string, loaderVersion: string) => Promise<ModLoaderInstallResult>;

  // Mods
  getInstalledMods: (installationId: string) => Promise<Mod[]>;
  toggleMod: (installationId: string, modFilePath: string) => Promise<Mod>;
  toggleAllMods: (installationId: string, enable: boolean) => Promise<void>;
  removeMod: (installationId: string, modFilePath: string) => Promise<void>;
  searchMods: (options: ModSearchOptions) => Promise<ModSearchResult>;
  getModProject: (projectId: string) => Promise<ModSearchResultItem>;
  getModVersions: (projectId: string, mcVersion?: string, loader?: string) => Promise<ModVersionDetails[]>;
  getModDependencies: (versionId: string) => Promise<ModDependency[]>;
  installMod: (installationId: string, downloadUrl: string, fileName: string, sha1?: string) => Promise<Mod>;
  validateModConflicts: (installationId: string) => Promise<ConflictValidationResult>;
  openModsFolder: (installationId: string) => Promise<void>;

  // Resource Packs & Shaders
  getResourcePacks: (installationId: string) => Promise<ResourcePack[]>;
  toggleResourcePack: (installationId: string, filePath: string) => Promise<ResourcePack>;
  removeResourcePack: (filePath: string) => Promise<void>;
  openResourcePacksFolder: (installationId: string) => Promise<void>;

  getShaderPacks: (installationId: string) => Promise<ShaderPack[]>;
  toggleShaderPack: (installationId: string, filePath: string) => Promise<ShaderPack>;
  removeShaderPack: (filePath: string) => Promise<void>;
  openShaderPacksFolder: (installationId: string) => Promise<void>;

  // Modpacks
  importModpack: (archivePath: string) => Promise<Installation>;
  exportModpack: (installationId: string, destinationPath: string) => Promise<void>;
  onModpackImportProgress: (callback: (progress: ModpackImportProgress) => void) => () => void;
  selectArchiveFile: () => Promise<string | null>;
  selectExportPath: (defaultName: string) => Promise<string | null>;

  // Performance Subsystem
  getPerformanceSettings: () => Promise<PerformanceSettings>;
  updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => Promise<PerformanceSettings>;
  getInstancePerformanceSettings: (installationId: string) => Promise<PerformanceSettings>;
  getRamRecommendation: (installationId?: string) => Promise<RamRecommendation>;
  getJvmPreview: (installationId: string, javaVersion?: number) => Promise<JvmArgumentSpec[]>;
  runBenchmark: (installationId: string, profile: PerformanceProfileType, durationSeconds?: number) => Promise<BenchmarkReport>;
  getBenchmarkHistory: () => Promise<BenchmarkReport[]>;
  compareBenchmarks: (baselineId: string, optimizedId: string) => Promise<ComparisonReport | null>;
  getHardwareInfo: () => Promise<SystemHardwareInfo>;

  // Phase 8 & 11 - Updates
  checkForUpdates: (channel?: 'stable' | 'beta') => Promise<any>;
  setUpdateChannel: (channel: 'stable' | 'beta') => Promise<void>;
  getUpdateChannel: () => Promise<'stable' | 'beta'>;
  rollbackUpdate: () => Promise<boolean>;
  hasRollbackAvailable: () => Promise<boolean>;
  deferUpdate: (version: string) => Promise<void>;
  downloadAndValidateUpdate: (release: any) => Promise<any>;
  onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void;

  listBackups: () => Promise<any[]>;
  createConfigBackup: (name?: string) => Promise<any>;
  createInstallationBackup: (installationId: string, options?: any) => Promise<any>;
  validateBackup: (id: string) => Promise<any>;
  restoreBackup: (id: string) => Promise<any>;
  deleteBackup: (id: string) => Promise<boolean>;

  getCacheBreakdown: () => Promise<any>;
  clearSafeCache: () => Promise<any>;
  checkDiskSpace: (targetPath: string, requiredBytes: number) => Promise<any>;

  generateDiagnosticReport: (installationId?: string) => Promise<any>;
  sanitizeDiagnosticText: (text: string) => Promise<string>;
  exportDiagnosticReportFile: (destPath?: string, instId?: string) => Promise<string>;
  submitFeedback: (payload: any) => Promise<any>;
  listLocalFeedbackReports: () => Promise<any[]>;
  analyzeCrash: (gameDir: string, exitCode?: number) => Promise<any>;

  exportInstallationPackage: (id: string) => Promise<any>;
  exportProfilePackage: (id: string) => Promise<any>;
  importPackage: (rawJson: string) => Promise<any>;

  validateJvmArgs: (args: string[], javaVersion?: number) => Promise<any>;

  addJavaRuntimeManually: (customPath: string) => Promise<any>;
  removeJavaRuntime: (idOrPath: string) => Promise<boolean>;
  setDefaultJavaRuntime: (idOrPath: string) => Promise<boolean>;
  checkJavaAvailability: (mcVersion: string) => Promise<any>;

  addMicrosoftAccount: (name: string, uuid: string, tokens: any) => Promise<Account>;
  hasValidSession: (accountId: string) => Promise<boolean>;

  // Phase 9 - Social & Profile
  getUserProfile: () => Promise<FernUserProfile>;
  updateUserProfile: (dto: UpdateUserProfileDTO) => Promise<FernUserProfile>;
  getPublicProfile: (userId: string) => Promise<FernUserProfile | null>;

  // Phase 9 - Friends
  getFriends: () => Promise<Friend[]>;
  sendFriendRequest: (targetUsername: string) => Promise<FriendRequest>;
  respondFriendRequest: (requestId: string, accept: boolean) => Promise<boolean>;
  cancelFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  getFriendRequests: () => Promise<FriendRequest[]>;
  searchUsers: (query: string) => Promise<FriendSearchResult[]>;

  // Phase 9 - Blocking
  getBlockedUsers: () => Promise<BlockEntry[]>;
  blockUser: (userId: string, username: string, displayName?: string, reason?: string) => Promise<BlockEntry>;
  unblockUser: (userId: string) => Promise<boolean>;

  // Phase 9 - Presence & Privacy
  getUserPresence: () => Promise<UserPresence>;
  setUserPresenceState: (state: PresenceState) => Promise<void>;
  getSocialPrivacy: () => Promise<SocialPrivacySettings>;
  updateSocialPrivacy: (settings: Partial<SocialPrivacySettings>) => Promise<SocialPrivacySettings>;

  // Phase 9 - Statistics
  getPlayerStatistics: () => Promise<PlayerStatistics>;
  resetPlayerStatistics: () => Promise<PlayerStatistics>;

  // Phase 9 - Cosmetics
  getCosmeticsCatalog: (category?: CosmeticCategory) => Promise<CosmeticDefinition[]>;
  getOwnedCosmetics: () => Promise<CosmeticOwnership>;
  getEquippedCosmetics: () => Promise<CosmeticEquippedState>;
  equipCosmetic: (category: CosmeticCategory, cosmeticId: string) => Promise<boolean>;
  unequipCosmetic: (category: CosmeticCategory) => Promise<boolean>;
  toggleFavoriteCosmetic: (cosmeticId: string) => Promise<boolean>;
  getInGameCosmeticsPayload: (playerModel?: 'default' | 'slim') => Promise<InGameCosmeticsPayload>;

  // Phase 9 - Social Notifications
  getSocialNotifications: () => Promise<SocialNotification[]>;
  markSocialNotificationRead: (id: string) => Promise<boolean>;
  markAllSocialNotificationsRead: () => Promise<void>;
  clearSocialNotifications: () => Promise<void>;
  getSocialNotificationPreferences: () => Promise<SocialNotificationPreferences>;
  updateSocialNotificationPreferences: (
    prefs: Partial<SocialNotificationPreferences>
  ) => Promise<SocialNotificationPreferences>;

  // Phase 10 - Network & Connection
  getNetworkStatus: () => Promise<NetworkStatus>;
  checkNetworkStatus: () => Promise<NetworkStatus>;
  onNetworkStatusChanged: (callback: (status: NetworkStatus) => void) => () => void;

  // Phase 10 - Fern Authentication
  fernRegister: (dto: { email: string; username: string; password: string; displayName?: string }) => Promise<any>;
  fernLogin: (dto: { loginIdentifier: string; password: string; deviceInfo?: string }) => Promise<FernAuthSession>;
  fernLogout: () => Promise<void>;
  getFernSession: () => Promise<FernAuthSession | null>;
  getFernUser: () => Promise<FernAuthUser | null>;
  verifyFernEmail: (token: string) => Promise<boolean>;
  requestFernPasswordReset: (emailOrUsername: string) => Promise<boolean>;
  confirmFernPasswordReset: (token: string, newPass: string) => Promise<boolean>;
  deleteFernAccount: (password: string) => Promise<boolean>;
  listFernSessions: () => Promise<SessionInfo[]>;
  revokeFernSession: (sessionId: string) => Promise<boolean>;

  // Phase 10 - Cloud Sync
  getCloudSyncStatus: () => Promise<CloudSyncStatus>;
  enableCloudSync: () => Promise<boolean>;
  disableCloudSync: () => Promise<boolean>;
  pushCloudSync: (force?: boolean) => Promise<SyncRevisionInfo>;
  pullCloudSync: (revisionId?: string) => Promise<boolean>;
  resolveCloudSyncConflict: (strategy: 'keep_local' | 'take_cloud') => Promise<boolean>;
  resetCloudSync: () => Promise<boolean>;
}

const api: FernAPI = {
  getVersion: () => ipcRenderer.invoke('fern:get-version'),
  getBasePath: () => ipcRenderer.invoke('fern:get-base-path'),

  minimizeWindow: () => ipcRenderer.send('fern:window:minimize'),
  maximizeWindow: () => ipcRenderer.send('fern:window:maximize'),
  closeWindow: () => ipcRenderer.send('fern:window:close'),

  getSettings: () => ipcRenderer.invoke('fern:settings:get'),
  updateSettings: (s) => ipcRenderer.invoke('fern:settings:update', s),

  getAccounts: () => ipcRenderer.invoke('fern:accounts:get'),
  getActiveAccount: () => ipcRenderer.invoke('fern:accounts:get-active'),
  selectAccount: (id) => ipcRenderer.invoke('fern:accounts:select', id),
  createLocalAccount: (dto) => ipcRenderer.invoke('fern:accounts:create-local', dto),
  removeAccount: (id) => ipcRenderer.invoke('fern:accounts:remove', id),

  getVersionManifest: (forceRefresh) => ipcRenderer.invoke('fern:versions:get-manifest', forceRefresh),
  getVersionsList: (opts) => ipcRenderer.invoke('fern:versions:get-list', opts),
  installVersion: (versionId) => ipcRenderer.invoke('fern:versions:install', versionId),
  cancelInstallVersion: (versionId) => ipcRenderer.invoke('fern:versions:cancel-install', versionId),
  onInstallProgress: (callback) => {
    const handler = (_: unknown, val: VersionInstallProgress) => callback(val);
    ipcRenderer.on('fern:install-progress', handler);
    return () => ipcRenderer.removeListener('fern:install-progress', handler);
  },

  getInstallations: () => ipcRenderer.invoke('fern:installations:get'),
  getActiveInstallation: () => ipcRenderer.invoke('fern:installations:get-active'),
  selectInstallation: (id) => ipcRenderer.invoke('fern:installations:select', id),
  createInstallation: (dto) => ipcRenderer.invoke('fern:installations:create', dto),
  updateInstallation: (id, dto) => ipcRenderer.invoke('fern:installations:update', id, dto),
  duplicateInstallation: (id) => ipcRenderer.invoke('fern:installations:duplicate', id),
  deleteInstallation: (id, deleteFiles) => ipcRenderer.invoke('fern:installations:delete', id, deleteFiles),
  openInstallationFolder: (id) => ipcRenderer.invoke('fern:installations:open-folder', id),

  getProfiles: () => ipcRenderer.invoke('fern:profiles:get'),
  getActiveProfile: () => ipcRenderer.invoke('fern:profiles:get-active'),
  selectProfile: (id) => ipcRenderer.invoke('fern:profiles:select', id),
  createProfile: (dto) => ipcRenderer.invoke('fern:profiles:create', dto),
  deleteProfile: (id) => ipcRenderer.invoke('fern:profiles:delete', id),

  detectJava: () => ipcRenderer.invoke('fern:java:detect'),
  getJavaRuntimes: () => ipcRenderer.invoke('fern:java:get-runtimes'),

  launchMinecraft: (config) => ipcRenderer.invoke('fern:launch:start', config),
  onLaunchStatus: (callback) => {
    const handler = (_: unknown, val: LaunchStatusUpdate) => callback(val);
    ipcRenderer.on('fern:launch-status', handler);
    return () => ipcRenderer.removeListener('fern:launch-status', handler);
  },

  getRecentLogs: (limit) => ipcRenderer.invoke('fern:logs:get-recent', limit),
  getLogFilePath: () => ipcRenderer.invoke('fern:logs:get-file-path'),
  openLogsFolder: () => ipcRenderer.invoke('fern:logs:open-folder'),
  onLogEntry: (callback) => {
    const handler = (_: unknown, val: LogEntry) => callback(val);
    ipcRenderer.on('fern:log-entry', handler);
    return () => ipcRenderer.removeListener('fern:log-entry', handler);
  },

  getActiveDownloads: () => ipcRenderer.invoke('fern:downloads:get-active'),
  cancelDownload: (id) => ipcRenderer.invoke('fern:downloads:cancel', id),
  onDownloadProgress: (callback) => {
    const handler = (_: unknown, val: DownloadProgress) => callback(val);
    ipcRenderer.on('fern:download-progress', handler);
    return () => ipcRenderer.removeListener('fern:download-progress', handler);
  },
  getDownloadQueue: () => ipcRenderer.invoke('fern:downloads:get-queue'),
  getQueueSummary: () => ipcRenderer.invoke('fern:downloads:get-queue-summary'),
  clearDownloadQueue: () => ipcRenderer.invoke('fern:downloads:clear-queue'),

  // Mod Loaders
  getLoaders: () => ipcRenderer.invoke('fern:loaders:get-all'),
  getLoaderVersions: (loader, mcVersion) => ipcRenderer.invoke('fern:loaders:get-versions', loader, mcVersion),
  installLoader: (instId, loaderVer) => ipcRenderer.invoke('fern:loaders:install', instId, loaderVer),

  // Mods
  getInstalledMods: (instId) => ipcRenderer.invoke('fern:mods:get-installed', instId),
  toggleMod: (instId, filePath) => ipcRenderer.invoke('fern:mods:toggle', instId, filePath),
  toggleAllMods: (instId, enable) => ipcRenderer.invoke('fern:mods:toggle-all', instId, enable),
  removeMod: (instId, filePath) => ipcRenderer.invoke('fern:mods:remove', instId, filePath),
  searchMods: (opts) => ipcRenderer.invoke('fern:mods:search', opts),
  getModProject: (projId) => ipcRenderer.invoke('fern:mods:get-project', projId),
  getModVersions: (projId, mcVer, loader) => ipcRenderer.invoke('fern:mods:get-versions', projId, mcVer, loader),
  getModDependencies: (verId) => ipcRenderer.invoke('fern:mods:get-dependencies', verId),
  installMod: (instId, url, fileName, sha1) => ipcRenderer.invoke('fern:mods:install', instId, url, fileName, sha1),
  validateModConflicts: (instId) => ipcRenderer.invoke('fern:mods:validate-conflicts', instId),
  openModsFolder: (instId) => ipcRenderer.invoke('fern:mods:open-folder', instId),

  // Packs
  getResourcePacks: (instId) => ipcRenderer.invoke('fern:packs:get-resource-packs', instId),
  toggleResourcePack: (instId, path) => ipcRenderer.invoke('fern:packs:toggle-resource-pack', instId, path),
  removeResourcePack: (path) => ipcRenderer.invoke('fern:packs:remove-resource-pack', path),
  openResourcePacksFolder: (instId) => ipcRenderer.invoke('fern:packs:open-resource-packs-folder', instId),

  getShaderPacks: (instId) => ipcRenderer.invoke('fern:packs:get-shader-packs', instId),
  toggleShaderPack: (instId, path) => ipcRenderer.invoke('fern:packs:toggle-shader-pack', instId, path),
  removeShaderPack: (path) => ipcRenderer.invoke('fern:packs:remove-shader-pack', path),
  openShaderPacksFolder: (instId) => ipcRenderer.invoke('fern:packs:open-shader-packs-folder', instId),

  // Modpacks
  importModpack: (archivePath) => ipcRenderer.invoke('fern:modpacks:import', archivePath),
  exportModpack: (instId, dest) => ipcRenderer.invoke('fern:modpacks:export', instId, dest),
  onModpackImportProgress: (callback) => {
    const handler = (_: unknown, val: ModpackImportProgress) => callback(val);
    ipcRenderer.on('fern:modpack-progress', handler);
    return () => ipcRenderer.removeListener('fern:modpack-progress', handler);
  },
  selectArchiveFile: () => ipcRenderer.invoke('fern:dialog:select-archive'),
  selectExportPath: (defaultName) => ipcRenderer.invoke('fern:dialog:select-export-path', defaultName),

  // Performance
  getPerformanceSettings: () => ipcRenderer.invoke('fern:performance:get-settings'),
  updatePerformanceSettings: (s) => ipcRenderer.invoke('fern:performance:update-settings', s),
  getInstancePerformanceSettings: (id) => ipcRenderer.invoke('fern:performance:get-instance-settings', id),
  getRamRecommendation: (id) => ipcRenderer.invoke('fern:performance:get-ram-recommendation', id),
  getJvmPreview: (id, jv) => ipcRenderer.invoke('fern:performance:get-jvm-preview', id, jv),
  runBenchmark: (id, p, d) => ipcRenderer.invoke('fern:performance:run-benchmark', id, p, d),
  getBenchmarkHistory: () => ipcRenderer.invoke('fern:performance:get-benchmark-history'),
  compareBenchmarks: (b, o) => ipcRenderer.invoke('fern:performance:compare-benchmarks', b, o),
  getHardwareInfo: () => ipcRenderer.invoke('fern:performance:get-hardware-info'),

  // Phase 8 & 11 - Updates
  checkForUpdates: (channel) => ipcRenderer.invoke('fern:updates:check', channel),
  setUpdateChannel: (channel) => ipcRenderer.invoke('fern:updates:set-channel', channel),
  getUpdateChannel: () => ipcRenderer.invoke('fern:updates:get-channel'),
  rollbackUpdate: () => ipcRenderer.invoke('fern:updates:rollback'),
  hasRollbackAvailable: () => ipcRenderer.invoke('fern:updates:has-rollback'),
  deferUpdate: (version) => ipcRenderer.invoke('fern:updates:defer', version),
  downloadAndValidateUpdate: (release) => ipcRenderer.invoke('fern:updates:download-and-validate', release),
  onUpdateDownloadProgress: (callback) => {
    const handler = (_: unknown, val: any) => callback(val);
    ipcRenderer.on('fern:update-download-progress', handler);
    return () => ipcRenderer.removeListener('fern:update-download-progress', handler);
  },

  // Phase 8 - Backups
  listBackups: () => ipcRenderer.invoke('fern:backups:list'),
  createConfigBackup: (name) => ipcRenderer.invoke('fern:backups:create-config', name),
  createInstallationBackup: (instId, opts) => ipcRenderer.invoke('fern:backups:create-installation', instId, opts),
  validateBackup: (id) => ipcRenderer.invoke('fern:backups:validate', id),
  restoreBackup: (id) => ipcRenderer.invoke('fern:backups:restore', id),
  deleteBackup: (id) => ipcRenderer.invoke('fern:backups:delete', id),

  // Phase 8 - Cache & Disk
  getCacheBreakdown: () => ipcRenderer.invoke('fern:cache:get-breakdown'),
  clearSafeCache: () => ipcRenderer.invoke('fern:cache:clear-safe'),
  checkDiskSpace: (targetPath, requiredBytes) => ipcRenderer.invoke('fern:disk:check-space', targetPath, requiredBytes),

  // Phase 8 & 11 - Diagnostics & Feedback
  generateDiagnosticReport: (instId) => ipcRenderer.invoke('fern:diagnostics:generate', instId),
  sanitizeDiagnosticText: (text) => ipcRenderer.invoke('fern:diagnostics:sanitize-text', text),
  exportDiagnosticReportFile: (destPath, instId) => ipcRenderer.invoke('fern:diagnostics:export-file', destPath, instId),
  submitFeedback: (payload) => ipcRenderer.invoke('fern:feedback:submit', payload),
  listLocalFeedbackReports: () => ipcRenderer.invoke('fern:feedback:list-local'),

  // Phase 8 - Crash Analysis
  analyzeCrash: (gameDir, exitCode) => ipcRenderer.invoke('fern:crash:analyze', gameDir, exitCode),

  // Phase 8 - Import & Export
  exportInstallationPackage: (id) => ipcRenderer.invoke('fern:import-export:export-installation', id),
  exportProfilePackage: (id) => ipcRenderer.invoke('fern:import-export:export-profile', id),
  importPackage: (rawJson) => ipcRenderer.invoke('fern:import-export:import-package', rawJson),

  // Phase 8 - JVM Arguments
  validateJvmArgs: (args, javaVersion) => ipcRenderer.invoke('fern:jvm:validate-args', args, javaVersion),

  // Phase 8 - Java Manager
  addJavaRuntimeManually: (customPath) => ipcRenderer.invoke('fern:java:add-manually', customPath),
  removeJavaRuntime: (idOrPath) => ipcRenderer.invoke('fern:java:remove', idOrPath),
  setDefaultJavaRuntime: (idOrPath) => ipcRenderer.invoke('fern:java:set-default', idOrPath),
  checkJavaAvailability: (mcVersion) => ipcRenderer.invoke('fern:java:check-availability', mcVersion),

  // Phase 8 - Accounts
  addMicrosoftAccount: (name, uuid, tokens) => ipcRenderer.invoke('fern:accounts:add-microsoft', name, uuid, tokens),
  hasValidSession: (accountId) => ipcRenderer.invoke('fern:accounts:has-valid-session', accountId),

  // Phase 9 - Social & Profile
  getUserProfile: async () => {
    const res = await ipcRenderer.invoke('fern:social:get-profile');
    return res.data;
  },
  updateUserProfile: async (dto) => {
    const res = await ipcRenderer.invoke('fern:social:update-profile', dto);
    return res.data;
  },
  getPublicProfile: async (userId) => {
    const res = await ipcRenderer.invoke('fern:social:get-public-profile', userId);
    return res.data;
  },

  // Phase 9 - Friends
  getFriends: async () => {
    const res = await ipcRenderer.invoke('fern:social:get-friends');
    return res.data || [];
  },
  sendFriendRequest: async (targetUsername) => {
    const res = await ipcRenderer.invoke('fern:social:send-request', targetUsername);
    if (!res.success) throw new Error(res.error || 'Failed to send friend request');
    return res.data;
  },
  respondFriendRequest: async (requestId, accept) => {
    const res = await ipcRenderer.invoke('fern:social:respond-request', requestId, accept);
    return res.success;
  },
  cancelFriendRequest: async (requestId) => {
    const res = await ipcRenderer.invoke('fern:social:cancel-request', requestId);
    return res.success;
  },
  removeFriend: async (friendId) => {
    const res = await ipcRenderer.invoke('fern:social:remove-friend', friendId);
    return res.success;
  },
  getFriendRequests: async () => {
    const res = await ipcRenderer.invoke('fern:social:get-requests');
    return res.data || [];
  },
  searchUsers: async (query) => {
    const res = await ipcRenderer.invoke('fern:social:search-users', query);
    return res.data || [];
  },

  // Phase 9 - Blocking
  getBlockedUsers: () => ipcRenderer.invoke('fern:social:get-blocked'),
  blockUser: (userId, username, displayName, reason) =>
    ipcRenderer.invoke('fern:social:block-user', userId, username, displayName, reason),
  unblockUser: (userId) => ipcRenderer.invoke('fern:social:unblock-user', userId),

  // Phase 9 - Presence & Privacy
  getUserPresence: () => ipcRenderer.invoke('fern:social:get-presence'),
  setUserPresenceState: (state) => ipcRenderer.invoke('fern:social:set-presence-state', state),
  getSocialPrivacy: () => ipcRenderer.invoke('fern:social:get-privacy'),
  updateSocialPrivacy: (settings) => ipcRenderer.invoke('fern:social:update-privacy', settings),

  // Phase 9 - Statistics
  getPlayerStatistics: () => ipcRenderer.invoke('fern:social:get-statistics'),
  resetPlayerStatistics: () => ipcRenderer.invoke('fern:social:reset-statistics'),

  // Phase 9 - Cosmetics
  getCosmeticsCatalog: async (category) => {
    const res = await ipcRenderer.invoke('fern:cosmetics:get-catalog', category);
    return res.data || [];
  },
  getOwnedCosmetics: async () => {
    const res = await ipcRenderer.invoke('fern:cosmetics:get-owned');
    return res.data;
  },
  getEquippedCosmetics: async () => {
    const res = await ipcRenderer.invoke('fern:cosmetics:get-equipped');
    return res.data;
  },
  equipCosmetic: async (category, cosmeticId) => {
    const res = await ipcRenderer.invoke('fern:cosmetics:equip', category, cosmeticId);
    return res.success;
  },
  unequipCosmetic: async (category) => {
    const res = await ipcRenderer.invoke('fern:cosmetics:unequip', category);
    return res.success;
  },
  toggleFavoriteCosmetic: async (cosmeticId) => {
    const res = await ipcRenderer.invoke('fern:cosmetics:toggle-favorite', cosmeticId);
    return res.success;
  },
  getInGameCosmeticsPayload: (playerModel) =>
    ipcRenderer.invoke('fern:cosmetics:get-ingame-payload', playerModel),

  // Phase 9 - Social Notifications
  getSocialNotifications: () => ipcRenderer.invoke('fern:social:get-notifications'),
  markSocialNotificationRead: (id) => ipcRenderer.invoke('fern:social:mark-read', id),
  markAllSocialNotificationsRead: () => ipcRenderer.invoke('fern:social:mark-all-read'),
  clearSocialNotifications: () => ipcRenderer.invoke('fern:social:clear-notifications'),
  getSocialNotificationPreferences: () => ipcRenderer.invoke('fern:social:get-notification-prefs'),
  updateSocialNotificationPreferences: (prefs) =>
    ipcRenderer.invoke('fern:social:update-notification-prefs', prefs),

  // Phase 10 - Network & Connection
  getNetworkStatus: () => ipcRenderer.invoke('fern:network:get-status'),
  checkNetworkStatus: () => ipcRenderer.invoke('fern:network:check'),
  onNetworkStatusChanged: (callback) => {
    const handler = (_: unknown, val: any) => callback(val);
    ipcRenderer.on('fern:network-status-changed', handler);
    return () => ipcRenderer.removeListener('fern:network-status-changed', handler);
  },

  // Phase 10 - Fern Authentication
  fernRegister: (dto) => ipcRenderer.invoke('fern:auth:register', dto),
  fernLogin: (dto) => ipcRenderer.invoke('fern:auth:login', dto),
  fernLogout: () => ipcRenderer.invoke('fern:auth:logout'),
  getFernSession: () => ipcRenderer.invoke('fern:auth:get-session'),
  getFernUser: () => ipcRenderer.invoke('fern:auth:get-user'),
  verifyFernEmail: (token) => ipcRenderer.invoke('fern:auth:verify-email', token),
  requestFernPasswordReset: (ident) => ipcRenderer.invoke('fern:auth:request-password-reset', ident),
  confirmFernPasswordReset: (token, newPass) => ipcRenderer.invoke('fern:auth:confirm-password-reset', token, newPass),
  deleteFernAccount: (pass) => ipcRenderer.invoke('fern:auth:delete-account', pass),
  listFernSessions: () => ipcRenderer.invoke('fern:auth:list-sessions'),
  revokeFernSession: (id) => ipcRenderer.invoke('fern:auth:revoke-session', id),

  // Phase 10 - Cloud Sync
  getCloudSyncStatus: () => ipcRenderer.invoke('fern:sync:get-status'),
  enableCloudSync: () => ipcRenderer.invoke('fern:sync:enable'),
  disableCloudSync: () => ipcRenderer.invoke('fern:sync:disable'),
  pushCloudSync: (force) => ipcRenderer.invoke('fern:sync:push', force),
  pullCloudSync: (revId) => ipcRenderer.invoke('fern:sync:pull', revId),
  resolveCloudSyncConflict: (strategy) => ipcRenderer.invoke('fern:sync:resolve-conflict', strategy),
  resetCloudSync: () => ipcRenderer.invoke('fern:sync:reset'),
};

contextBridge.exposeInMainWorld('fern', api);
