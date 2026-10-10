export type FriendStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export type PresenceState =
  | 'offline'
  | 'online'
  | 'in_launcher'
  | 'playing_minecraft'
  | 'invisible';

export interface UserPresence {
  userId: string;
  state: PresenceState;
  minecraftVersion?: string;
  installationName?: string;
  sessionStartTime?: number;
  lastSeen: number;
}

export interface Friend {
  id: string; // Friendship relation ID
  friendUserId: string;
  username: string;
  displayName: string;
  avatar: string;
  status: FriendStatus;
  since: number;
  presence?: UserPresence;
}

export interface FriendRequest {
  id: string; // Request ID
  fromUserId: string;
  toUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatar: string;
  toUsername: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}

export interface BlockEntry {
  id?: string;
  blockedUserId: string;
  username: string;
  displayName?: string;
  blockedAt: number;
  timestamp?: number;
  reason?: string;
}

export interface SendFriendRequestDTO {
  targetUsername: string;
}

export interface FriendSearchResult {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  relationshipStatus: 'none' | 'friend' | 'outgoing_request' | 'incoming_request' | 'blocked';
}
