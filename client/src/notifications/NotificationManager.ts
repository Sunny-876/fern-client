export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface FernNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  durationMs: number;
  dismissed: boolean;
}

export class NotificationManager {
  private notifications: FernNotification[] = [];
  private maxVisible = 4;
  private nextId = 0;
  private listeners: Set<(notif: FernNotification) => void> = new Set();

  public onNotification(listener: (notif: FernNotification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(
    message: string,
    type: NotificationType = 'info',
    durationMs: number = 3000
  ): FernNotification {
    const notification: FernNotification = {
      id: `notif_${++this.nextId}`,
      message,
      type,
      timestamp: Date.now(),
      durationMs,
      dismissed: false,
    };

    this.notifications.unshift(notification);
    if (this.notifications.length > this.maxVisible * 2) {
      this.notifications.pop();
    }

    for (const listener of this.listeners) {
      try {
        listener(notification);
      } catch (err) {
        console.error('[NotificationManager] Listener error:', err);
      }
    }

    return notification;
  }

  public getActiveNotifications(): FernNotification[] {
    const now = Date.now();
    this.notifications = this.notifications.filter(
      (n) => !n.dismissed && now - n.timestamp < n.durationMs
    );
    return this.notifications.slice(0, this.maxVisible);
  }

  public dismiss(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.dismissed = true;
  }

  public clear(): void {
    this.notifications = [];
  }
}
