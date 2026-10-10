import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../client/src/events/EventBus';
import { ModuleManager } from '../client/src/modules/ModuleManager';
import { BaseModule } from '../client/src/modules/IModule';
import { BooleanSetting } from '../client/src/settings/Setting';

class TestDemoModule extends BaseModule {
  public tickCount = 0;
  public eventTriggerCount = 0;

  constructor() {
    super('test_demo', 'Test Demo', 'A demo module for automated testing', 'Visual');
    this.addSetting(new BooleanSetting('active', 'Active', 'Active toggle', true));
  }

  public onEnable(): void {
    this.listen('client_tick', () => {
      this.eventTriggerCount++;
    });
  }

  public onTick(): void {
    this.tickCount++;
  }
}

class FaultyModule extends BaseModule {
  public failOnEnable = false;
  public failOnTick = false;

  constructor() {
    super('faulty_mod', 'Faulty Module', 'Throws errors to verify crash safety', 'Misc');
  }

  public onEnable(): void {
    if (this.failOnEnable) {
      throw new Error('Explosion on enable');
    }
  }

  public onTick(): void {
    if (this.failOnTick) {
      throw new Error('Explosion on tick');
    }
  }
}

describe('ModuleManager - Lifecycle, Cleanup & Crash Safety', () => {
  it('registers and toggles modules properly', () => {
    const bus = new EventBus();
    const manager = new ModuleManager(bus);
    const mod = new TestDemoModule();

    expect(manager.registerModule(mod)).toBe(true);
    expect(manager.getModule('test_demo')).toBe(mod);
    expect(manager.getAllModules()).toHaveLength(1);

    expect(mod.isEnabled()).toBe(false);

    // Enable
    expect(manager.setModuleEnabled('test_demo', true)).toBe(true);
    expect(mod.isEnabled()).toBe(true);

    // Toggle
    manager.toggleModule('test_demo');
    expect(mod.isEnabled()).toBe(false);
  });

  it('automatically cleans up event listeners when module is disabled', () => {
    const bus = new EventBus();
    const manager = new ModuleManager(bus);
    const mod = new TestDemoModule();
    manager.registerModule(mod);

    // Enable module - should register its internal listener
    manager.setModuleEnabled('test_demo', true);
    expect(bus.getListenerCount('client_tick')).toBeGreaterThan(0);

    // Dispatch tick - should increment
    bus.emit('client_tick', { tickCount: 1 });
    expect(mod.eventTriggerCount).toBe(1);

    // Disable module - must detach listener!
    manager.setModuleEnabled('test_demo', false);
    bus.emit('client_tick', { tickCount: 2 });
    expect(mod.eventTriggerCount).toBe(1); // Did not increase!
  });

  it('isolates failures and safely disables failing modules during onEnable without crashing', () => {
    const bus = new EventBus();
    const manager = new ModuleManager(bus);
    const faulty = new FaultyModule();
    faulty.failOnEnable = true;

    const errorSpy = vi.fn();
    manager.onError(errorSpy);
    manager.registerModule(faulty);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Enabling faulty module should catch error, disable module, and notify listener
    const success = manager.setModuleEnabled('faulty_mod', true);
    expect(success).toBe(false);
    expect(faulty.isEnabled()).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      faulty,
      expect.any(Error),
      'enable'
    );

    consoleSpy.mockRestore();
  });

  it('isolates failures and disables module during tick without crashing the game loop', () => {
    const bus = new EventBus();
    const manager = new ModuleManager(bus);
    const faulty = new FaultyModule();
    manager.registerModule(faulty);

    manager.setModuleEnabled('faulty_mod', true);
    expect(faulty.isEnabled()).toBe(true);

    // Arm tick failure
    faulty.failOnTick = true;
    const errorSpy = vi.fn();
    manager.onError(errorSpy);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Pumping tick should catch error and disable the module
    manager.tickModules();
    expect(faulty.isEnabled()).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      faulty,
      expect.any(Error),
      'tick'
    );

    consoleSpy.mockRestore();
  });

  it('searches and filters modules by category and query', () => {
    const bus = new EventBus();
    const manager = new ModuleManager(bus);
    manager.registerModule(new TestDemoModule()); // Category: Visual
    manager.registerModule(new FaultyModule());   // Category: Misc

    expect(manager.getModulesByCategory('Visual')).toHaveLength(1);
    expect(manager.getModulesByCategory('Combat')).toHaveLength(0);

    const searchResults = manager.searchModules('demo');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe('test_demo');

    const searchCategory = manager.searchModules('misc');
    expect(searchCategory).toHaveLength(1);
    expect(searchCategory[0].id).toBe('faulty_mod');
  });
});
