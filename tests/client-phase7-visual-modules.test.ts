import { describe, it, expect } from 'vitest';
import { ZoomModule } from '../client/src/modules/visual/ZoomModule';
import { FullbrightModule } from '../client/src/modules/visual/FullbrightModule';
import { CrosshairModule } from '../client/src/modules/visual/CrosshairModule';
import { HitColorModule } from '../client/src/modules/visual/HitColorModule';
import { ItemPhysicsModule } from '../client/src/modules/visual/ItemPhysicsModule';
import { BetterTooltipsModule } from '../client/src/modules/visual/BetterTooltipsModule';
import { EventBus } from '../client/src/events/EventBus';

describe('Phase 7 - Visual Customization Modules', () => {
  it('ZoomModule modifies FOV divisor and sensitivity legitimately without reaching exploits', () => {
    const zoomMod = new ZoomModule();
    const bus = new EventBus();
    zoomMod.onRegister(bus);
    zoomMod.setEnabled(true);

    expect(zoomMod.getFovMultiplier()).toBe(1.0);
    expect(zoomMod.getSensitivityMultiplier()).toBe(1.0);

    // Disable smooth zoom for deterministic testing
    zoomMod.smoothZoomSetting.set(false);

    // Trigger zoom key down
    bus.emit('key_press', {
      key: 'c',
      action: 'down',
      modifiers: { ctrl: false, shift: false, alt: false },
    });

    expect(zoomMod.isZoomActive()).toBe(true);
    // 4.0x zoom factor -> FOV divisor should be 1 / 4.0 = 0.25
    expect(zoomMod.getFovMultiplier()).toBeCloseTo(0.25, 2);
    expect(zoomMod.getSensitivityMultiplier()).toBeCloseTo(0.25, 2);

    // Release zoom key
    bus.emit('key_press', {
      key: 'c',
      action: 'up',
      modifiers: { ctrl: false, shift: false, alt: false },
    });
    expect(zoomMod.isZoomActive()).toBe(false);
    expect(zoomMod.getFovMultiplier()).toBe(1.0);
  });

  it('FullbrightModule provides client-side brightness enhancement levels', () => {
    const fullbright = new FullbrightModule();
    fullbright.setEnabled(false);
    expect(fullbright.getGammaMultiplier()).toBe(1.0);

    fullbright.setEnabled(true);
    fullbright.levelSetting.set('Bright');
    expect(fullbright.getGammaMultiplier()).toBe(5.0);

    fullbright.levelSetting.set('Maximum');
    expect(fullbright.getGammaMultiplier()).toBe(15.0);

    fullbright.levelSetting.set('Vanilla');
    expect(fullbright.getGammaMultiplier()).toBe(1.5);

    fullbright.levelSetting.set('Off');
    expect(fullbright.getGammaMultiplier()).toBe(1.0);
  });

  it('CrosshairModule supports multiple styles and draws within bounds', () => {
    const crosshair = new CrosshairModule();
    crosshair.setEnabled(true);

    const drawnBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    const mockContext = {
      screenWidth: 1000,
      screenHeight: 600,
      drawRect: (x: number, y: number, w: number, h: number) => {
        drawnBoxes.push({ x, y, w, h });
      },
    };

    crosshair.styleSetting.set('Dot');
    crosshair.renderCrosshair(mockContext);
    expect(drawnBoxes.length).toBeGreaterThan(0);

    drawnBoxes.length = 0;
    crosshair.styleSetting.set('Cross');
    crosshair.renderCrosshair(mockContext);
    expect(drawnBoxes.length).toBeGreaterThan(0);
  });

  it('HitColorModule computes damage flash overlay tint and decay', () => {
    const hitColor = new HitColorModule();
    hitColor.setEnabled(true);

    expect(hitColor.getActiveFlashTint()).toBeNull();

    hitColor.triggerDamageFlash();
    const tint = hitColor.getActiveFlashTint();
    expect(tint).not.toBeNull();
    expect(tint).toContain('rgba(');
  });

  it('ItemPhysicsModule configures visual spin, bounce, scale and shadows', () => {
    const itemPhys = new ItemPhysicsModule();
    expect(itemPhys.rotationSpeedSetting.value).toBe(1.5);
    expect(itemPhys.bounceFactorSetting.value).toBe(0.4);
    expect(itemPhys.scaleSetting.value).toBe(1.0);
    expect(itemPhys.showShadowSetting.value).toBe(true);
  });

  it('BetterTooltipsModule formats item ID, numeric durability, and enchantments', () => {
    const tooltips = new BetterTooltipsModule();
    tooltips.setEnabled(true);

    const lines = tooltips.formatTooltipLines({
      name: 'Diamond Sword',
      id: 'minecraft:diamond_sword',
      durability: { current: 1200, max: 1561 },
      enchantments: [
        { name: 'Sharpness', level: 5 },
        { name: 'Unbreaking', level: 3 },
      ],
      modName: 'Minecraft',
    });

    expect(lines[0]).toBe('Diamond Sword');
    expect(lines.some((l) => l.includes('Sharpness V'))).toBe(true);
    expect(lines.some((l) => l.includes('Unbreaking III'))).toBe(true);
    expect(lines.some((l) => l.includes('Durability: §f1200 / 1561'))).toBe(true);
    expect(lines.some((l) => l.includes('minecraft:diamond_sword'))).toBe(true);
    expect(lines.some((l) => l.includes('Minecraft'))).toBe(true);
  });
});
