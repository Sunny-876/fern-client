import { NetworkStatus, NetworkStatusState, FernAuthUser } from '../../../shared/models/auth';
import { FernLogger } from '../core/logger';
import { RemoteFernApiClient } from './remote-fern-api-client';

export class NetworkStatusManager {
  private currentStatus: NetworkStatus;
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly apiClient: RemoteFernApiClient,
    private readonly logger: FernLogger,
  ) {
    this.currentStatus = {
      state: 'offline',
      backendUrl: apiClient.getBaseUrl(),
      isOnline: false,
      isAuthenticated: false,
      lastCheckTimestamp: Date.now(),
    };
  }

  public getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public onStatusChange(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public startPeriodicCheck(intervalMs = 15000) {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkConnection();
    this.checkInterval = setInterval(() => this.checkConnection(), intervalMs);
  }

  public stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public async checkConnection(): Promise<NetworkStatus> {
    const isOnline = await this.apiClient.isOnline();
    const hasToken = Boolean(this.apiClient.getToken());

    let state: NetworkStatusState = 'offline';
    let currentUser: FernAuthUser | undefined = this.currentStatus.currentUser;

    if (!isOnline) {
      state = 'offline';
    } else if (!hasToken) {
      state = 'auth_required';
      currentUser = undefined;
    } else {
      // Validate session with /api/v1/auth/me
      const meRes = await this.apiClient.auth.getMe();
      if (meRes.success && meRes.data) {
        state = 'connected';
        currentUser = meRes.data;
      } else {
        state = 'auth_required';
        currentUser = undefined;
      }
    }

    this.setStatus({
      state,
      backendUrl: this.apiClient.getBaseUrl(),
      isOnline,
      isAuthenticated: Boolean(currentUser),
      currentUser,
      lastCheckTimestamp: Date.now(),
    });

    return this.getStatus();
  }

  public setStatus(newStatus: Partial<NetworkStatus>) {
    const prev = this.currentStatus;
    this.currentStatus = { ...prev, ...newStatus };

    if (prev.state !== this.currentStatus.state || prev.isAuthenticated !== this.currentStatus.isAuthenticated) {
      this.logger.info(
        'NetworkStatus',
        `Network status changed: ${prev.state} -> ${this.currentStatus.state} (Auth: ${this.currentStatus.isAuthenticated})`,
      );
      for (const listener of this.listeners) {
        try {
          listener(this.getStatus());
        } catch (err: any) {
          this.logger.warn('NetworkStatus', `Listener error: ${err.message}`);
        }
      }
    }
  }

  public setSyncConflict(hasConflict: boolean) {
    if (hasConflict && this.currentStatus.state === 'connected') {
      this.setStatus({ state: 'sync_conflict' });
    } else if (!hasConflict && this.currentStatus.state === 'sync_conflict') {
      this.setStatus({ state: 'connected' });
    }
  }
}
