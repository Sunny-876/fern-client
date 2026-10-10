export type SocialNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_online'
  | 'friend_offline'
  | 'cosmetic_equipped'
  | 'cosmetic_update'
  | 'system';

export interface SocialNotification {
  id: string;
  type: SocialNotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SocialNotificationPreferences {
  enableFriendRequests: boolean;
  enableFriendStatusChanges: boolean;
  enableCosmeticAlerts: boolean;
  enableSystemAnnouncements: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: SocialNotificationPreferences = {
  enableFriendRequests: true,
  enableFriendStatusChanges: true,
  enableCosmeticAlerts: true,
  enableSystemAnnouncements: true,
  soundEnabled: false,
};
