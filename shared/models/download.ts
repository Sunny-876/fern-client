export type DownloadStatus = 'idle' | 'downloading' | 'verifying' | 'completed' | 'failed' | 'cancelled';

export interface DownloadProgress {
  id: string;
  url: string;
  destination: string;
  totalBytes: number;
  transferredBytes: number;
  percentage: number;
  speedBytesPerSec: number;
  status: DownloadStatus;
  error?: string;
}

export interface DownloadTaskOptions {
  id?: string;
  url: string;
  destination: string;
  expectedHash?: string;
  hashAlgorithm?: 'sha1' | 'sha256' | 'md5';
  maxRetries?: number;
  timeoutMs?: number;
}
