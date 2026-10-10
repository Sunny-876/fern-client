export interface SocialPrivacySettings {
  allowFriendRequests: boolean; // Whether users can send friend requests
  allowProfileDiscovery: boolean; // Whether user appears in global user search
  showOnlineStatus: boolean; // Whether friends can see online presence
  showPlayingStatus: boolean; // Whether friends can see when Minecraft is launched
  showMinecraftVersion: boolean; // Whether to broadcast the Minecraft version
  showInstallationName: boolean; // Whether to broadcast the installation/profile name
  allowProfileViewing: 'everyone' | 'friends_only' | 'nobody';
  invisibleMode: boolean; // When true, completely broadcast as Offline to all peers
}

export const DEFAULT_SOCIAL_PRIVACY: SocialPrivacySettings = {
  allowFriendRequests: true,
  allowProfileDiscovery: true,
  showOnlineStatus: true,
  showPlayingStatus: true,
  showMinecraftVersion: true,
  showInstallationName: false, // Default false for privacy
  allowProfileViewing: 'friends_only',
  invisibleMode: false,
};

export interface PrivacyExplanation {
  field: keyof SocialPrivacySettings;
  title: string;
  description: string;
  securityNote: string;
}

export const PRIVACY_EXPLANATIONS: PrivacyExplanation[] = [
  {
    field: 'invisibleMode',
    title: 'Invisible Mode',
    description: 'Appear completely offline to all friends while retaining full client functionality.',
    securityNote: 'Presence publication is immediately suspended and your status displays as Offline.',
  },
  {
    field: 'showPlayingStatus',
    title: 'Broadcast Playing State',
    description: 'Allow friends to see when you have launched a Minecraft game session.',
    securityNote: 'Zero server IP addresses, credentials, or world locations are ever broadcast.',
  },
  {
    field: 'showMinecraftVersion',
    title: 'Show Minecraft Version',
    description: 'Display the major Minecraft version (e.g. 1.21.4) in your presence status.',
    securityNote: 'Only the standard version identifier is shown; local file paths are never exposed.',
  },
  {
    field: 'showInstallationName',
    title: 'Show Installation Name',
    description: 'Display your custom installation name in your presence status.',
    securityNote: 'Disabled by default to protect custom local naming conventions.',
  },
  {
    field: 'allowProfileDiscovery',
    title: 'Profile Discovery',
    description: 'Allow other Fern users to find you by searching your exact @username.',
    securityNote: 'Private profiles remain hidden from discovery searches.',
  },
  {
    field: 'allowFriendRequests',
    title: 'Allow Incoming Friend Requests',
    description: 'Accept incoming friend invitations from other players.',
    securityNote: 'Blocked players are automatically rejected regardless of this setting.',
  },
];
