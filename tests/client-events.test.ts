import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../client/src/events/EventBus';
import { KeyPressEvent, ClientTickEvent } from '../client/src/events/ClientEvents';

describe('EventBus - Core Client Event System', () => {
  it('registers and dispatches typed events', () => {
    const bus = new EventBus();
    const tickHandler = vi.fn();

    const unsubscribe = bus.on('client_tick', tickHandler);
    expect(bus.getListenerCount('client_tick')).toBe(1);

    bus.emit('client_tick', { tickCount: 1 });
    expect(tickHandler).toHaveBeenCalledTimes(1);
    expect(tickHandler).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'client_tick', tickCount: 1 })
    );

    unsubscribe();
    expect(bus.getListenerCount('client_tick')).toBe(0);

    bus.emit('client_tick', { tickCount: 2 });
    expect(tickHandler).toHaveBeenCalledTimes(1);
  });

  it('orders listeners according to priority (HIGH, NORMAL, LOW)', () => {
    const bus = new EventBus();
    const order: string[] = [];

    bus.on('client_tick', () => order.push('low'), 'LOW');
    bus.on('client_tick', () => order.push('high'), 'HIGH');
    bus.on('client_tick', () => order.push('normal'), 'NORMAL');

    bus.emit('client_tick', { tickCount: 42 });

    expect(order).toEqual(['high', 'normal', 'low']);
  });

  it('halts propagation when an event is marked cancelled', () => {
    const bus = new EventBus();
    const firstHandler = vi.fn((evt: KeyPressEvent) => {
      evt.cancelled = true;
    });
    const secondHandler = vi.fn();

    bus.on('key_press', firstHandler, 'HIGH');
    bus.on('key_press', secondHandler, 'NORMAL');

    bus.emit('key_press', {
      key: 'Escape',
      action: 'down',
      modifiers: { ctrl: false, shift: false, alt: false },
      cancelled: false,
    });

    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).not.toHaveBeenCalled();
  });

  it('contains errors in listeners without crashing the bus', () => {
    const bus = new EventBus();
    const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('client_tick', () => {
      throw new Error('Fatal tick failure');
    });

    const safeHandler = vi.fn();
    bus.on('client_tick', safeHandler);

    expect(() => {
      bus.emit('client_tick', { tickCount: 100 });
    }).not.toThrow();

    expect(safeHandler).toHaveBeenCalledTimes(1);
    expect(spyConsole).toHaveBeenCalled();
    spyConsole.mockRestore();
  });

  it('supports clear() and off()', () => {
    const bus = new EventBus();
    bus.on('world_load', () => {});
    bus.on('world_unload', () => {});

    expect(bus.getListenerCount()).toBe(2);
    bus.clear();
    expect(bus.getListenerCount()).toBe(0);
  });
});
