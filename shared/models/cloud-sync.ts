export interface SyncRevisionInfo {
  id: string;
  revisionNumber: number;
  parentRevisionId?: string | null;
  checksum: string;
  sizeBytes: number;
  clientVersion: string;
  description?: string | null;
  createdAt: number;
}

export interface SyncConflictInfo {
  message: string;
  serverRevisionId: string;
  serverRevisionNumber?: number;
  serverUpdatedAt?: number;
}

export interface CloudSyncStatus {
  isEnabled: boolean;
  currentRevisionId: string | null;
  currentRevision?: SyncRevisionInfo | null;
  totalRevisions: number;
  lastSyncedAt: number;
  hasConflict?: boolean;
  conflict?: SyncConflictInfo | null;
}

export interface CloudSyncDownloadResult {
  revisionId: string;
  revisionNumber: number;
  parentRevisionId?: string | null;
  checksum: string;
  sizeBytes: number;
  clientVersion: string;
  createdAt: number;
  config: Record<string, any>;
}
