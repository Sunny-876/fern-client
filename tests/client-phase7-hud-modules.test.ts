import { describe, it, expect } from 'vitest';
import { ArmorHudModule } from '../client/src/modules/hud/ArmorHudModule';
import { PotionHudModule } from '../client/src/modules/hud/PotionHudModule';
import { DirectionHudModule } from '../client/src/modules/hud/DirectionHudModule';
import { WorldInfoHudModule } from '../client/src/modules/hud/WorldInfoHudModule';
import { ServerInfoHudModule } from '../client/src/modules/hud/ServerInfoHudModule';

describe('Phase 7 - Player & World HUD Modules', () => {
  it('ArmorHudModule manages durability display and orientations', () => {
    const armorMod = new ArmorHudModule();
    armorMod.setEnabled(true);
    expect(armorMod.isEnabled()).toBe(true);
    expect(armorMod.category).toBe('HUD');

    armorMod.orientationSetting.set('Horizontal');
    expect(armorMod.orientationSetting.value).toBe('Horizontal');

    armorMod.hudElement.updateArmor([
      { slot: 'helmet', name: 'Netherite Helmet', durability: 400, maxDurability: 407 },
    ]);

    const rendered: string[] = [];
    armorMod.hudElement.render({
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      drawRect: () => {},
      drawText: (text) => {
        rendered.push(text);
      },
    });

    expect(rendered.length).toBe(1);
    expect(rendered[0]).toContain('Helm: 400');
  });

  it('PotionHudModule formats duration and amplifiers', () => {
    const potionMod = new PotionHudModule();
    potionMod.setEnabled(true);

    potionMod.hudElement.updateEffects([
      { id: 'strength', name: 'Strength', amplifier: 1, durationTicks: 2400 }, // 2:00
      { id: 'speed', name: 'Speed', amplifier: 0, durationTicks: 600 }, // 0:30
    ]);

    const rendered: string[] = [];
    potionMod.hudElement.render({
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      drawRect: () => {},
      drawText: (text) => {
        rendered.push(text);
      },
    });

    expect(rendered.length).toBe(2);
    expect(rendered[0]).toContain('Strength II - 2:00');
    expect(rendered[1]).toContain('Speed - 0:30');

    // Test compact mode
    potionMod.displayModeSetting.set('Compact');
    const compactRendered: string[] = [];
    potionMod.hudElement.render({
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      drawRect: () => {},
      drawText: (text) => {
        compactRendered.push(text);
      },
    });
    expect(compactRendered[0]).toContain('Strength II [2:00]');
  });

  it('DirectionHudModule calculates cardinal headings and degrees', () => {
    const dirMod = new DirectionHudModule();
    dirMod.setEnabled(true);

    dirMod.hudElement.setYaw(0); // South
    expect(dirMod.hudElement.getCardinal()).toBe('S');

    dirMod.hudElement.setYaw(90); // West
    expect(dirMod.hudElement.getCardinal()).toBe('W');

    dirMod.hudElement.setYaw(180); // North
    expect(dirMod.hudElement.getCardinal()).toBe('N');

    dirMod.hudElement.setYaw(270); // East
    expect(dirMod.hudElement.getCardinal()).toBe('E');

    dirMod.hudElement.setYaw(45); // Southwest
    expect(dirMod.hudElement.getCardinal()).toBe('SW');

    // Normalized wrap
    dirMod.hudElement.setYaw(-90);
    expect(dirMod.hudElement.getCardinal()).toBe('E');

    const rendered: string[] = [];
    dirMod.hudElement.render({
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      drawRect: () => {},
      drawText: (text) => {
        rendered.push(text);
      },
    });
    expect(rendered[0]).toContain('E (270°)');
  });

  it('WorldInfoHudModule displays biome, light level, and in-game time', () => {
    const worldMod = new WorldInfoHudModule();
    worldMod.setEnabled(true);

    worldMod.hudElement.updateWorldInfo({
      biome: 'Cherry Grove',
      light: 14,
      time: '6:30 AM',
    });

    const rendered: string[] = [];
    worldMod.hudElement.render({
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      drawRect: () => {},
      drawText: (text) => {
        rendered.push(text);
      },
    });

    expect(rendered[0]).toContain('Cherry Grove');
    expect(rendered[0]).toContain('Light: 14');
  });

  it('ServerInfoHudModule shows hostname, ping, and player count', () => {
    const serverMod = new ServerInfoHudModule();
    serverMod.setEnabled(true);
    serverMod.showPlayersSetting.set(true);

    serverMod.hudElement.updateServer({
      address: 'play.example.com',
      ping: 42,
      players: 250,
    });

    const rendered: string[] = [];
    serverMod.hudElement.render({
      screenWidth: 1920,
      screenHeight: 1080,
      partialTicks: 0,
      drawRect: () => {},
      drawText: (text) => {
        rendered.push(text);
      },
    });

    expect(rendered[0]).toContain('play.example.com (42ms) [250]');
  });
});
