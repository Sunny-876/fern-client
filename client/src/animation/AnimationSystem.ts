export type EasingFunction = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'cubic';

export interface ActiveTween {
  id: string;
  from: number;
  to: number;
  startTime: number;
  durationMs: number;
  easing: EasingFunction;
  onUpdate: (current: number) => void;
  onComplete?: () => void;
}

export class AnimationSystem {
  public reduceMotion = false;
  private activeTweens: Map<string, ActiveTween> = new Map();
  private nextId = 0;

  /**
   * Evaluates an easing curve at progress t (0.0 to 1.0).
   */
  public static evaluateEase(t: number, easing: EasingFunction): number {
    const clamped = Math.max(0, Math.min(1, t));
    switch (easing) {
      case 'linear':
        return clamped;
      case 'easeIn':
        return clamped * clamped;
      case 'easeOut':
        return clamped * (2 - clamped);
      case 'easeInOut':
        return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
      case 'cubic':
        return clamped * clamped * clamped;
      default:
        return clamped;
    }
  }

  /**
   * Starts a lightweight numerical animation.
   * If reduceMotion is active, executes instantaneously.
   */
  public animate(
    from: number,
    to: number,
    durationMs: number,
    easing: EasingFunction,
    onUpdate: (current: number) => void,
    onComplete?: () => void
  ): string {
    // Accessibility / performance override
    if (this.reduceMotion || durationMs <= 0) {
      onUpdate(to);
      onComplete?.();
      return 'instant';
    }

    const id = `tween_${++this.nextId}`;
    const tween: ActiveTween = {
      id,
      from,
      to,
      startTime: Date.now(),
      durationMs,
      easing,
      onUpdate,
      onComplete,
    };

    this.activeTweens.set(id, tween);
    onUpdate(from);
    return id;
  }

  public cancel(id: string): boolean {
    return this.activeTweens.delete(id);
  }

  /**
   * Ticks active tweens. Called during client ticks or render cycles.
   * Returns number of active tweens.
   */
  public tick(): number {
    if (this.activeTweens.size === 0) return 0;
    const now = Date.now();
    const completedIds: string[] = [];

    for (const [id, tween] of this.activeTweens.entries()) {
      const elapsed = now - tween.startTime;
      const progress = Math.min(1.0, elapsed / tween.durationMs);
      const eased = AnimationSystem.evaluateEase(progress, tween.easing);
      const current = tween.from + (tween.to - tween.from) * eased;

      tween.onUpdate(current);

      if (progress >= 1.0) {
        tween.onComplete?.();
        completedIds.push(id);
      }
    }

    for (const id of completedIds) {
      this.activeTweens.delete(id);
    }

    return this.activeTweens.size;
  }

  public clear(): void {
    this.activeTweens.clear();
  }

  public getActiveCount(): number {
    return this.activeTweens.size;
  }
}
