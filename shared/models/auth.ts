export interface FernAuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  displayName: string;
  avatar: string;
}

export interface FernAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: FernAuthUser;
}

export interface SessionInfo {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export type NetworkStatusState =
  | 'connected'
  | 'offline'
  | 'auth_required'
  | 'service_unavailable'
  | 'sync_pending'
  | 'sync_conflict';

export interface NetworkStatus {
  state: NetworkStatusState;
  backendUrl: string;
  isOnline: boolean;
  isAuthenticated: boolean;
  currentUser?: FernAuthUser;
  lastCheckTimestamp: number;
}
