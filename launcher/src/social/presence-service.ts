import { PresenceState, UserPresence } from '../../../shared/models/social';
import { PrivacyService } from './privacy-service';
import { FernLogger } from '../core/logger';

export type PresenceListener = (presence: UserPresence) => void;

/**
 * Service managing local and published player presence states.
 * Guarantees privacy enforcement, rate limiting, and clean shutdown.
 * Strictly never exposes IP addresses, access tokens, server credentials, or file paths.
 */
export class PresenceService {
  private currentPresence: UserPresence;
  private listeners: Set<PresenceListener> = new Set();
  private lastBroadcastTime: number = 0;
  private pendingBroadcastTimer: NodeJS.Timeout | null = null;
  private readonly rateLimitMs: number = 2000;

  constructor(
    private userId: string,
    private privacyService: PrivacyService,
    private logger: FernLogger
  ) {
    this.currentPresence = {
      userId: this.userId,
      state: 'in_launcher',
      lastSeen: Date.now(),
    };
  }

  public getCurrentPresence(): UserPresence {
    return { ...this.currentPresence };
  }

  public getPublishedPresence(): UserPresence {
    return this.privacyService.sanitizePresence(this.currentPresence);
  }

  public setPresenceState(state: PresenceState): void {
    if (this.currentPresence.state === state) return;

    this.currentPresence.state = state;
    this.currentPresence.lastSeen = Date.now();

    if (state !== 'playing_minecraft') {
      delete this.currentPresence.minecraftVersion;
      delete this.currentPresence.installationName;
      delete this.currentPresence.sessionStartTime;
    }

    this.scheduleBroadcast();
  }

  public setPlaying(version: string, installationName: string): void {
    // Sanitize version and installation name against path injection
    const cleanVersion = (version || '1.21.4').replace(/[^a-zA-Z0-9._-]/g, '');
    const cleanInstallation = (installationName || 'Default').replace(/[<>:"/\\|?*]/g, '');

    this.currentPresence = {
      userId: this.userId,
      state: 'playing_minecraft',
      minecraftVersion: cleanVersion,
      installationName: cleanInstallation,
      sessionStartTime: Date.now(),
      lastSeen: Date.now(),
    };

    this.scheduleBroadcast();
  }

  public setLauncher(): void {
    this.setPresenceState('in_launcher');
  }

  public setOffline(): void {
    this.setPresenceState('offline');
  }

  public subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener);
    // Immediate callback with current sanitized presence
    listener(this.getPublishedPresence());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private scheduleBroadcast(): void {
    const now = Date.now();
    const elapsed = now - this.lastBroadcastTime;

    if (elapsed >= this.rateLimitMs) {
      this.dispatchBroadcast();
    } else {
      if (!this.pendingBroadcastTimer) {
        this.pendingBroadcastTimer = setTimeout(() => {
          this.pendingBroadcastTimer = null;
          this.dispatchBroadcast();
        }, this.rateLimitMs - elapsed);
      }
    }
  }

  private dispatchBroadcast(): void {
    this.lastBroadcastTime = Date.now();
    const sanitized = this.getPublishedPresence();
    for (const listener of this.listeners) {
      try {
        listener(sanitized);
      } catch (err) {
        this.logger.error('PresenceService', 'Error in presence listener:', err);
      }
    }
  }

  public destroy(): void {
    if (this.pendingBroadcastTimer) {
      clearTimeout(this.pendingBroadcastTimer);
      this.pendingBroadcastTimer = null;
    }
    this.listeners.clear();
  }
}
