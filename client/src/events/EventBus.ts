import { FernEventMap, EventName } from './ClientEvents';

export type EventPriority = 'HIGH' | 'NORMAL' | 'LOW';

export type EventListener<T> = (event: T) => void;

interface ListenerRegistration<T> {
  readonly id: string;
  readonly listener: EventListener<T>;
  readonly priority: EventPriority;
}

export class EventBus {
  private listeners: Map<EventName, Array<ListenerRegistration<any>>> = new Map();
  private nextId = 0;
  private dispatchDepth = 0;

  /**
   * Subscribes a listener to a specific typed event.
   * Returns an unsubscribe function for clean lifecycle disposal.
   */
  public on<K extends EventName>(
    eventName: K,
    listener: EventListener<FernEventMap[K]>,
    priority: EventPriority = 'NORMAL'
  ): () => void {
    let regList = this.listeners.get(eventName);
    if (!regList) {
      regList = [];
      this.listeners.set(eventName, regList);
    } else if (this.dispatchDepth > 0) {
      // Copy-on-write: duplicate list so any active dispatch loop is not affected
      regList = [...regList];
      this.listeners.set(eventName, regList);
    }

    const id = `listener_${++this.nextId}`;
    const registration: ListenerRegistration<FernEventMap[K]> = { id, listener, priority };

    // Insert according to priority (HIGH first, NORMAL second, LOW last)
    const priorityWeight: Record<EventPriority, number> = { HIGH: 3, NORMAL: 2, LOW: 1 };
    const insertIdx = regList.findIndex(
      (r) => priorityWeight[r.priority] < priorityWeight[priority]
    );

    if (insertIdx === -1) {
      regList.push(registration);
    } else {
      regList.splice(insertIdx, 0, registration);
    }

    return () => {
      this.off(eventName, id);
    };
  }

  /**
   * Unregisters a specific listener by ID.
   */
  public off(eventName: EventName, id: string): boolean {
    const regList = this.listeners.get(eventName);
    if (!regList) return false;

    const initialLen = regList.length;
    const updated = regList.filter((r) => r.id !== id);
    if (updated.length < initialLen) {
      this.listeners.set(eventName, updated);
      return true;
    }
    return false;
  }

  /**
   * Dispatches an event to all registered listeners.
   * Optimized with zero array allocations per dispatch using copy-on-write listener isolation.
   */
  public dispatch<K extends EventName>(event: FernEventMap[K]): void {
    const regList = this.listeners.get(event.eventName as K);
    if (!regList || regList.length === 0) return;

    this.dispatchDepth++;
    try {
      const len = regList.length;
      for (let i = 0; i < len; i++) {
        if (event.cancelled) break;
        const reg = regList[i];
        if (!reg) continue;
        try {
          reg.listener(event);
        } catch (err) {
          console.error(`[EventBus] Error in listener for event "${event.eventName}":`, err);
        }
      }
    } finally {
      this.dispatchDepth--;
    }
  }

  /**
   * Emits an event by name with payload, automatically attaching eventName.
   */
  public emit<K extends EventName>(
    eventName: K,
    payload: Omit<FernEventMap[K], 'eventName'>
  ): FernEventMap[K] {
    const event = { ...payload, eventName } as unknown as FernEventMap[K];
    this.dispatch(event);
    return event;
  }

  /**
   * Returns listener count for a given event.
   */
  public getListenerCount(eventName?: EventName): number {
    if (eventName) {
      return this.listeners.get(eventName)?.length || 0;
    }
    let total = 0;
    for (const list of this.listeners.values()) {
      total += list.length;
    }
    return total;
  }

  /**
   * Clears all registered listeners.
   */
  public clear(): void {
    this.listeners.clear();
  }
}
