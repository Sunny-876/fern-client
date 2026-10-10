import * as fs from 'fs/promises';
import * as path from 'path';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';
import {
  SocialNotification,
  SocialNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  SocialNotificationType,
} from '../../../shared/models/social-notifications';

export class SocialNotificationService {
  private notificationsFile: string;
  private prefsFile: string;
  private notifications: SocialNotification[] = [];
  private preferences: SocialNotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  private initialized = false;
  private recentNotifications: Map<string, number> = new Map(); // Anti-spam hash -> timestamp

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {
    const dir = this.pathManager.getSocialDir();
    this.notificationsFile = path.join(dir, 'notifications.json');
    this.prefsFile = path.join(dir, 'notification_prefs.json');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.pathManager.getSocialDir(), { recursive: true });

      try {
        const rawNotifs = await fs.readFile(this.notificationsFile, 'utf-8');
        this.notifications = JSON.parse(rawNotifs);
      } catch {
        this.notifications = [];
      }

      try {
        const rawPrefs = await fs.readFile(this.prefsFile, 'utf-8');
        this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(rawPrefs) };
      } catch {
        this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
      }

      this.initialized = true;
      this.logger.info('SocialNotificationService', 'Initialized social notifications.');
    } catch (err) {
      this.logger.error('SocialNotificationService', 'Failed to initialize notifications:', err);
      this.initialized = true;
    }
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(
        this.notificationsFile,
        JSON.stringify(this.notifications.slice(0, 50), null, 2),
        'utf-8'
      );
      await fs.writeFile(this.prefsFile, JSON.stringify(this.preferences, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error('SocialNotificationService', 'Failed to save notifications:', err);
    }
  }

  public async getNotifications(): Promise<SocialNotification[]> {
    if (!this.initialized) await this.initialize();
    return [...this.notifications];
  }

  public async getPreferences(): Promise<SocialNotificationPreferences> {
    if (!this.initialized) await this.initialize();
    return { ...this.preferences };
  }

  public async updatePreferences(
    updates: Partial<SocialNotificationPreferences>
  ): Promise<SocialNotificationPreferences> {
    if (!this.initialized) await this.initialize();
    this.preferences = { ...this.preferences, ...updates };
    await this.save();
    return { ...this.preferences };
  }

  public async postNotification(
    type: SocialNotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<SocialNotification | null> {
    if (!this.initialized) await this.initialize();

    // Check preferences
    if (type === 'friend_request' && !this.preferences.enableFriendRequests) {
      return null;
    }
    if (
      (type === 'friend_online' || type === 'friend_offline' || type === 'friend_accepted') &&
      !this.preferences.enableFriendStatusChanges
    ) {
      return null;
    }
    if (
      (type === 'cosmetic_equipped' || type === 'cosmetic_update') &&
      !this.preferences.enableCosmeticAlerts
    ) {
      return null;
    }
    if (type === 'system' && !this.preferences.enableSystemAnnouncements) {
      return null;
    }

    // Anti-spam debouncing (5 second window for identical message)
    const hash = `${type}:${title}:${message}`;
    const now = Date.now();
    const lastSent = this.recentNotifications.get(hash);
    if (lastSent && now - lastSent < 5000) {
      return null;
    }
    this.recentNotifications.set(hash, now);

    const notification: SocialNotification = {
      id: `notif_${now}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      timestamp: now,
      read: false,
      metadata,
    };

    this.notifications.unshift(notification);
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    await this.save();
    this.logger.info('SocialNotificationService', `Notification posted: [${type}] ${title}`);
    return notification;
  }

  public async markAsRead(notificationId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      await this.save();
      return true;
    }
    return false;
  }

  public async markAllAsRead(): Promise<void> {
    if (!this.initialized) await this.initialize();
    for (const notif of this.notifications) {
      notif.read = true;
    }
    await this.save();
  }

  public async clearNotifications(): Promise<void> {
    if (!this.initialized) await this.initialize();
    this.notifications = [];
    await this.save();
  }
}
