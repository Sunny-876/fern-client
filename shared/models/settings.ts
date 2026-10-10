export interface GeneralSettings {
  language: string;
  keepLauncherOpen: 'keep' | 'hide' | 'close';
  enableDiscordRpc: boolean;
  checkUpdatesAutomatically: boolean;
  launchAtStartup: boolean;
  minimizeToTray: boolean;
  rememberLastInstallation: boolean;
  firstRunCompleted?: boolean;
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'oled';
  accentColor: string;
  reduceMotion: boolean;
  uiScale: number;
}

export interface MinecraftSettings {
  defaultResolution: {
    width: number;
    height: number;
  };
  fullscreen: boolean;
  autoConnectServer?: string;
  logWindowOnLaunch: boolean;
}

export interface JavaSettings {
  defaultJavaPath?: string;
  autoDetectJava: boolean;
  customJvmArgs: string[];
}

export interface MemorySettings {
  defaultMinMemoryMb: number;
  defaultMaxMemoryMb: number;
}

export interface DownloadsSettings {
  maxConcurrentDownloads: number;
  downloadRetryAttempts: number;
  downloadTimeoutMs: number;
  useCustomMirror: boolean;
  mirrorUrl?: string;
}

export interface UpdatesSettings {
  channel: 'stable' | 'beta';
  autoCheck: boolean;
  notifyOnUpdate: boolean;
  deferredVersion?: string;
  allowBetaChannel?: boolean;
}

export interface PrivacySettings {
  localDiagnostics: boolean;
  crashReporting: boolean;
  updateChecks: boolean;
  usageData: boolean;
}

export interface AdvancedSettings {
  customDataDirectory?: string;
  developerMode: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  enableHardwareAcceleration: boolean;
}

import { PerformanceSettings } from './performance';
import { SocialPrivacySettings, DEFAULT_SOCIAL_PRIVACY } from './privacy';
import { SocialNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './social-notifications';

export interface FernSettings {
  version: number;
  general: GeneralSettings;
  appearance: AppearanceSettings;
  minecraft: MinecraftSettings;
  java: JavaSettings;
  memory: MemorySettings;
  downloads: DownloadsSettings;
  updates: UpdatesSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
  performance: PerformanceSettings;
  socialPrivacy?: SocialPrivacySettings;
  socialNotifications?: SocialNotificationPreferences;
}
