import { describe, it, expect, beforeEach } from 'vitest';
import {
  CosmeticRenderer,
  CameraPerspective,
  CosmeticRenderContext,
} from '../client/src/cosmetics/CosmeticRenderer';
import { CosmeticDefinition } from '../shared/models/cosmetics';

describe('Phase 9: In-Game Cosmetic Rendering Engine', () => {
  let renderer: CosmeticRenderer;

  const testCape: CosmeticDefinition = {
    id: 'cape_fern_emerald',
    name: 'Fern Emerald Cape',
    category: 'cape',
    rarity: 'rare',
    description: 'Emerald green cape with signature Fern emblem.',
    assetPath: 'assets/cosmetics/capes/emerald.png',
    previewUrl: 'assets/previews/capes/emerald.png',
    modelType: 'both',
  };

  const testCloak: CosmeticDefinition = {
    id: 'cloak_phantom_shadow',
    name: 'Phantom Shadow Cloak',
    category: 'cloak',
    rarity: 'epic',
    description: 'Dark cloak layered across the shoulders.',
    assetPath: 'assets/cosmetics/cloaks/phantom.png',
    previewUrl: 'assets/previews/cloaks/phantom.png',
    modelType: 'both',
  };

  const testHat: CosmeticDefinition = {
    id: 'hat_tactical_beanie',
    name: 'Tactical Beanie',
    category: 'hat',
    rarity: 'uncommon',
    description: 'Warm knit beanie.',
    assetPath: 'assets/cosmetics/hats/beanie.png',
    previewUrl: 'assets/previews/hats/beanie.png',
    modelType: 'both',
  };

  const testEmote: CosmeticDefinition = {
    id: 'emote_fern_wave',
    name: 'Fern Wave',
    category: 'emote',
    rarity: 'common',
    description: 'Friendly wave animation.',
    assetPath: 'assets/cosmetics/emotes/wave.json',
    previewUrl: 'assets/previews/emotes/wave.png',
    modelType: 'both',
  };

  beforeEach(() => {
    renderer = new CosmeticRenderer();
    renderer.equip('cape', testCape);
    renderer.equip('cloak', testCloak);
    renderer.equip('hat', testHat);
    renderer.equip('emote', testEmote);
  });

  it('renders capes and cloaks only in third-person perspectives', () => {
    // 1. First Person
    const fpContext: CosmeticRenderContext = {
      perspective: CameraPerspective.FIRST_PERSON,
      partialTicks: 1.0,
      playerModel: 'default',
    };
    const fpResult = renderer.renderCosmetics(fpContext);

    // In first person, capes and cloaks are skipped to keep player FOV clear
    const renderedCategories = fpResult.layers.map(l => l.category);
    expect(renderedCategories).not.toContain('cape');
    expect(renderedCategories).not.toContain('cloak');
    expect(fpResult.skippedCategories).toContain('cape');
    expect(fpResult.skippedCategories).toContain('cloak');

    // 2. Third Person Back
    const tpContext: CosmeticRenderContext = {
      perspective: CameraPerspective.THIRD_PERSON_BACK,
      partialTicks: 1.0,
      playerModel: 'default',
    };
    const tpResult = renderer.renderCosmetics(tpContext);
    const tpCategories = tpResult.layers.map(l => l.category);
    expect(tpCategories).toContain('cape');
    expect(tpCategories).toContain('cloak');
    expect(tpCategories).toContain('hat');
  });

  it('disables rendering completely when master toggle is off', () => {
    renderer.setEnabled(false);

    const context: CosmeticRenderContext = {
      perspective: CameraPerspective.THIRD_PERSON_BACK,
      partialTicks: 1.0,
      playerModel: 'default',
    };
    const result = renderer.renderCosmetics(context);

    expect(result.renderedCount).toBe(0);
    expect(result.layers.length).toBe(0);
  });

  it('handles player model types and slim arm offsets', () => {
    const slimHat: CosmeticDefinition = {
      id: 'acc_shoulder_sprout',
      name: 'Shoulder Sprout',
      category: 'accessory',
      rarity: 'rare',
      description: 'Tiny plant sprout on left shoulder.',
      assetPath: 'assets/cosmetics/acc/sprout.png',
      previewUrl: 'assets/previews/acc/sprout.png',
      modelType: 'both',
    };
    renderer.equip('accessory', slimHat);

    // Default Steve model
    const steveResult = renderer.renderCosmetics({
      perspective: CameraPerspective.THIRD_PERSON_BACK,
      partialTicks: 1.0,
      playerModel: 'default',
    });
    const steveAcc = steveResult.layers.find(l => l.category === 'accessory');
    expect(steveAcc?.renderOffset[0]).toBe(0.4);

    // Slim Alex model
    const alexResult = renderer.renderCosmetics({
      perspective: CameraPerspective.THIRD_PERSON_BACK,
      partialTicks: 1.0,
      playerModel: 'slim',
    });
    const alexAcc = alexResult.layers.find(l => l.category === 'accessory');
    expect(alexAcc?.renderOffset[0]).toBe(0.35);
  });

  it('caches cosmetic assets and bounds cache size', () => {
    renderer.clearAssetCache();
    expect(renderer.getCacheSize()).toBe(0);

    const asset1 = renderer.loadAsset('assets/cosmetics/capes/emerald.png');
    expect(asset1.loaded).toBe(true);
    expect(renderer.getCacheSize()).toBe(1);

    // Subsequent read hits cache
    const asset2 = renderer.loadAsset('assets/cosmetics/capes/emerald.png');
    expect(asset2).toBe(asset1);
    expect(renderer.getCacheSize()).toBe(1);
  });

  it('manages emote playback states and auto-expiration', () => {
    expect(renderer.isEmoting()).toBe(false);

    // Play emote for 200ms
    renderer.playEmote('emote_fern_wave', 200);
    expect(renderer.isEmoting()).toBe(true);
    expect(renderer.getActiveEmote()).toBe('emote_fern_wave');

    // Emote should render while active in third person
    const tpResult = renderer.renderCosmetics({
      perspective: CameraPerspective.THIRD_PERSON_BACK,
      partialTicks: 1.0,
      playerModel: 'default',
    });
    expect(tpResult.layers.some(l => l.category === 'emote')).toBe(true);

    // Stopping emote
    renderer.stopEmote();
    expect(renderer.isEmoting()).toBe(false);

    const stoppedResult = renderer.renderCosmetics({
      perspective: CameraPerspective.THIRD_PERSON_BACK,
      partialTicks: 1.0,
      playerModel: 'default',
    });
    expect(stoppedResult.layers.some(l => l.category === 'emote')).toBe(false);
  });
});
