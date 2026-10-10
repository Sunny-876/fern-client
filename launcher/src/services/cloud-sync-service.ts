import { RemoteFernApiClient } from './remote-fern-api-client';
import { SettingsManager } from '../settings/settings-manager';
import { BackupService } from '../core/backup-service';
import { NetworkStatusManager } from './network-status';
import { FernLogger } from '../core/logger';
import {
  CloudSyncStatus,
  SyncConflictInfo,
  SyncRevisionInfo,
} from '../../../shared/models/cloud-sync';

export class CloudSyncService {
  private lastKnownRevisionId: string | null = null;
  private activeConflict: SyncConflictInfo | null = null;

  constructor(
    private readonly apiClient: RemoteFernApiClient,
    private readonly settingsManager: SettingsManager,
    private readonly backupService: BackupService,
    private readonly networkStatus: NetworkStatusManager,
    private readonly logger: FernLogger,
  ) {}

  public async getStatus(): Promise<CloudSyncStatus> {
    const res = await this.apiClient.sync.getStatus();
    if (!res.success || !res.data) {
      return {
        isEnabled: false,
        currentRevisionId: null,
        totalRevisions: 0,
        lastSyncedAt: 0,
        hasConflict: Boolean(this.activeConflict),
        conflict: this.activeConflict,
      };
    }

    this.lastKnownRevisionId = res.data.currentRevisionId;

    return {
      ...res.data,
      hasConflict: Boolean(this.activeConflict),
      conflict: this.activeConflict,
    };
  }

  public async enable(): Promise<boolean> {
    const res = await this.apiClient.sync.enable();
    if (!res.success) throw new Error(res.error || 'Failed to enable cloud sync');
    this.logger.info('CloudSyncService', 'Enabled cloud sync.');
    // Perform initial upload
    await this.pushLocalConfig();
    return true;
  }

  public async disable(): Promise<boolean> {
    const res = await this.apiClient.sync.disable();
    if (!res.success) throw new Error(res.error || 'Failed to disable cloud sync');
    this.activeConflict = null;
    this.networkStatus.setSyncConflict(false);
    this.logger.info('CloudSyncService', 'Disabled cloud sync.');
    return true;
  }

  public async pushLocalConfig(force = false): Promise<SyncRevisionInfo> {
    const currentSettings = this.settingsManager.getSettings();

    // Sanitize settings payload - ensure no accounts or machine secrets
    const payload = {
      version: currentSettings.version,
      general: currentSettings.general,
      appearance: currentSettings.appearance,
      minecraft: currentSettings.minecraft,
      java: currentSettings.java,
      memory: currentSettings.memory,
      downloads: currentSettings.downloads,
      updates: currentSettings.updates,
      privacy: currentSettings.privacy,
      advanced: currentSettings.advanced,
      performance: currentSettings.performance,
      socialPrivacy: currentSettings.socialPrivacy,
      socialNotifications: currentSettings.socialNotifications,
    };

    const res = await this.apiClient.sync.uploadConfig(
      payload,
      this.lastKnownRevisionId || undefined,
      force,
    );

    if (!res.success) {
      if (res.code === 'SYNC_CONFLICT' || (res.data as any)?.code === 'SYNC_CONFLICT') {
        const conflictData = (res.data as any) || {};
        this.activeConflict = {
          message: res.error || 'Remote configuration has changed.',
          serverRevisionId: conflictData.serverRevisionId || 'unknown',
          serverRevisionNumber: conflictData.serverRevisionNumber,
          serverUpdatedAt: conflictData.serverUpdatedAt,
        };
        this.networkStatus.setSyncConflict(true);
        throw new Error(`Sync conflict: ${res.error}`);
      }
      throw new Error(res.error || 'Failed to upload configuration');
    }

    if (!res.data) {
      throw new Error('No revision data returned from server');
    }

    this.lastKnownRevisionId = res.data.id;
    this.activeConflict = null;
    this.networkStatus.setSyncConflict(false);
    this.logger.info('CloudSyncService', `Uploaded config revision #${res.data.revisionNumber} (${res.data.checksum.substring(0, 8)})`);
    return res.data;
  }

  public async pullRemoteConfig(revisionId?: string): Promise<boolean> {
    // 1. BACK UP LOCAL CONFIGURATION FIRST before applying remote changes!
    try {
      await this.backupService.createConfigBackup(`pre_cloud_sync_${Date.now()}`);
      this.logger.info('CloudSyncService', 'Created local backup prior to applying cloud configuration.');
    } catch (err: any) {
      this.logger.warn('CloudSyncService', `Could not create pre-sync backup: ${err.message}`);
    }

    // 2. Download remote configuration
    const res = await this.apiClient.sync.downloadConfig(revisionId);
    if (!res.success || !res.data?.config) {
      throw new Error(res.error || 'Failed to download remote configuration');
    }

    const remoteConfig = res.data.config;

    // 3. Apply safe sanitized settings to local SettingsManager
    await this.settingsManager.updateSettings({
      general: remoteConfig.general,
      appearance: remoteConfig.appearance,
      minecraft: remoteConfig.minecraft,
      java: remoteConfig.java,
      memory: remoteConfig.memory,
      downloads: remoteConfig.downloads,
      updates: remoteConfig.updates,
      privacy: remoteConfig.privacy,
      advanced: remoteConfig.advanced,
      performance: remoteConfig.performance,
      socialPrivacy: remoteConfig.socialPrivacy,
      socialNotifications: remoteConfig.socialNotifications,
    });

    this.lastKnownRevisionId = res.data.revisionId;
    this.activeConflict = null;
    this.networkStatus.setSyncConflict(false);
    this.logger.info('CloudSyncService', `Successfully pulled and applied cloud revision #${res.data.revisionNumber}`);
    return true;
  }

  public async resolveConflict(strategy: 'keep_local' | 'take_cloud'): Promise<boolean> {
    if (strategy === 'keep_local') {
      await this.pushLocalConfig(true); // force upload
      return true;
    } else {
      await this.pullRemoteConfig(); // take cloud
      return true;
    }
  }

  public async resetCloudData(): Promise<boolean> {
    const res = await this.apiClient.sync.reset();
    if (!res.success) throw new Error(res.error || 'Failed to reset cloud sync data');
    this.lastKnownRevisionId = null;
    this.activeConflict = null;
    this.networkStatus.setSyncConflict(false);
    return true;
  }
}
