export interface SessionSnapshot {
  sessionActive: boolean;
  startTime: number | null;
  durationSeconds: number;
  formattedDuration: string;
  serverAddress: string | null;
  worldName: string | null;
  trackingEnabled: boolean;
}

export class SessionTracker {
  private startTime: number | null = null;
  private serverAddress: string | null = null;
  private worldName: string | null = null;
  private trackingEnabled = true;

  constructor() {}

  public setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
    if (!enabled) {
      this.startTime = null;
      this.serverAddress = null;
      this.worldName = null;
    }
  }

  public isTracking(): boolean {
    return this.trackingEnabled && this.startTime !== null;
  }

  public startSession(params?: { serverAddress?: string; worldName?: string }): void {
    if (!this.trackingEnabled) return;
    this.startTime = Date.now();
    this.serverAddress = params?.serverAddress || null;
    this.worldName = params?.worldName || null;
  }

  public endSession(): void {
    this.startTime = null;
    this.serverAddress = null;
    this.worldName = null;
  }

  public getSessionDurationSeconds(): number {
    if (!this.trackingEnabled || this.startTime === null) return 0;
    return Math.max(0, Math.floor((Date.now() - this.startTime) / 1000));
  }

  public getFormattedSessionDuration(): string {
    const totalSecs = this.getSessionDurationSeconds();
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  }

  public getSessionSnapshot(): SessionSnapshot {
    return {
      sessionActive: this.isTracking(),
      startTime: this.startTime,
      durationSeconds: this.getSessionDurationSeconds(),
      formattedDuration: this.getFormattedSessionDuration(),
      serverAddress: this.serverAddress,
      worldName: this.worldName,
      trackingEnabled: this.trackingEnabled,
    };
  }
}
