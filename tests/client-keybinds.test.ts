import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../client/src/events/EventBus';
import { KeybindManager } from '../client/src/keybinds/KeybindManager';

describe('KeybindManager - Dispatching, Normalization & Conflict Detection', () => {
  it('registers actions and triggers them upon key press', () => {
    const bus = new EventBus();
    const manager = new KeybindManager(bus);
    const triggerSpy = vi.fn();

    manager.registerAction({
      id: 'toggle_fps',
      name: 'Toggle FPS',
      description: 'Toggles the FPS HUD',
      key: 'F8',
      defaultKey: 'F8',
      onTrigger: triggerSpy,
    });

    expect(manager.getAllActions()).toHaveLength(1);

    // Dispatch F8 key press
    bus.emit('key_press', {
      key: 'F8',
      action: 'down',
      modifiers: { ctrl: false, shift: false, alt: false },
    });

    expect(triggerSpy).toHaveBeenCalledTimes(1);

    // Up action should NOT trigger
    bus.emit('key_press', {
      key: 'F8',
      action: 'up',
      modifiers: { ctrl: false, shift: false, alt: false },
    });
    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers mouse button actions', () => {
    const bus = new EventBus();
    const manager = new KeybindManager(bus);
    const triggerSpy = vi.fn();

    manager.registerAction({
      id: 'zoom_action',
      name: 'Zoom',
      description: 'Zoom camera',
      key: 'Mouse2', // Middle click
      defaultKey: 'Mouse2',
      onTrigger: triggerSpy,
    });

    bus.emit('mouse_input', {
      button: 2,
      action: 'down',
      x: 100,
      y: 100,
    });

    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  it('normalizes key names (e.g. Right Shift / rshift)', () => {
    const bus = new EventBus();
    const manager = new KeybindManager(bus);

    expect(manager.normalizeKey('rshift')).toBe('Right Shift');
    expect(manager.normalizeKey('right shift')).toBe('Right Shift');
    expect(manager.normalizeKey('lshift')).toBe('Left Shift');
    expect(manager.normalizeKey('rcontrol')).toBe('Right Control');
    expect(manager.normalizeKey('')).toBe('None');
  });

  it('detects conflicting keybinds across actions', () => {
    const bus = new EventBus();
    const manager = new KeybindManager(bus);

    manager.registerAction({
      id: 'action_1',
      name: 'Action 1',
      description: 'First',
      key: 'Right Shift',
      defaultKey: 'Right Shift',
      onTrigger: () => {},
    });

    manager.registerAction({
      id: 'action_2',
      name: 'Action 2',
      description: 'Second',
      key: 'rshift', // Normalized to 'Right Shift'
      defaultKey: 'F3',
      onTrigger: () => {},
    });

    const conflicts = manager.detectConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('Right Shift');
    expect(conflicts[0].actionIds).toEqual(['action_1', 'action_2']);

    // Rebind action_2 to resolve conflict
    manager.setKeybind('action_2', 'F9');
    expect(manager.detectConflicts()).toHaveLength(0);
  });
});
