import { FernSettings } from '../models/settings';
import { Installation } from '../models/installation';
import { FernProfile } from '../models/profile';
import { DEFAULT_SOCIAL_PRIVACY } from '../models/privacy';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../models/social-notifications';

import { DEFAULT_PERFORMANCE_SETTINGS } from '../constants/performance-profiles';

export const CURRENT_SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: FernSettings = {
  version: CURRENT_SETTINGS_VERSION,
  general: {
    language: 'en_US',
    keepLauncherOpen: 'keep',
    enableDiscordRpc: true,
    checkUpdatesAutomatically: true,
    launchAtStartup: false,
    minimizeToTray: false,
    rememberLastInstallation: true,
    firstRunCompleted: false,
  },
  appearance: {
    theme: 'dark',
    accentColor: '#22c55e',
    reduceMotion: false,
    uiScale: 1.0,
  },
  minecraft: {
    defaultResolution: {
      width: 1920,
      height: 1080,
    },
    fullscreen: false,
    logWindowOnLaunch: false,
  },
  java: {
    autoDetectJava: true,
    customJvmArgs: ['-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled', '-XX:MaxGCPauseMillis=200'],
  },
  memory: {
    defaultMinMemoryMb: 2048,
    defaultMaxMemoryMb: 4096,
  },
  downloads: {
    maxConcurrentDownloads: 4,
    downloadRetryAttempts: 3,
    downloadTimeoutMs: 30000,
    useCustomMirror: false,
  },
  updates: {
    channel: 'stable',
    autoCheck: true,
    notifyOnUpdate: true,
  },
  privacy: {
    localDiagnostics: true,
    crashReporting: true,
    updateChecks: true,
    usageData: false,
  },
  advanced: {
    developerMode: false,
    logLevel: 'INFO',
    enableHardwareAcceleration: true,
  },
  performance: DEFAULT_PERFORMANCE_SETTINGS,
  socialPrivacy: DEFAULT_SOCIAL_PRIVACY,
  socialNotifications: DEFAULT_NOTIFICATION_PREFERENCES,
};

export const DEFAULT_INSTALLATIONS: Installation[] = [
  {
    id: 'vanilla-latest',
    name: 'Minecraft 1.21.4',
    minecraftVersion: '1.21.4',
    versionId: '1.21.4',
    loader: 'vanilla',
    gameDirectory: '',
    memoryAllocation: {
      minMb: 2048,
      maxMb: 4096,
    },
    minMemory: 2048,
    maxMemory: 4096,
    launchArguments: [],
    status: 'NOT_INSTALLED',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'fabric-1-21-4',
    name: 'Fabric 1.21.4 (Fern Optimized)',
    minecraftVersion: '1.21.4',
    versionId: '1.21.4',
    loader: 'fabric',
    loaderVersion: '0.16.9',
    gameDirectory: '',
    memoryAllocation: {
      minMb: 2048,
      maxMb: 4096,
    },
    minMemory: 2048,
    maxMemory: 4096,
    launchArguments: [],
    status: 'NOT_INSTALLED',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEFAULT_PROFILE: FernProfile = {
  id: 'default-profile',
  name: 'Default Profile',
  installationId: 'fabric-1-21-4',
  minecraftVersion: '1.21.4',
  ramMb: 4096,
  mods: [],
  resourcePacks: [],
  shaderPacks: [],
  settings: {},
  launchArguments: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
