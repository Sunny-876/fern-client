import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { LocalSocialProvider } from '../launcher/src/social/api/local-social-provider';
import { CosmeticCategory } from '../shared/models/cosmetics';

describe('Phase 9: Cosmetic System & Inventory', () => {
  let tempDir: string;
  let paths: FernPathManager;
  let logger: FernLogger;
  let provider: LocalSocialProvider;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fern-cosmetics-phase9-'));
    paths = new FernPathManager(tempDir);
    await paths.initializeDirectories();
    logger = new FernLogger(paths);
    provider = new LocalSocialProvider(paths, logger);
    await provider.initialize();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('loads full cosmetic catalog and filters by category', async () => {
    const allRes = await provider.cosmetics.getCatalog();
    expect(allRes.success).toBe(true);
    expect(allRes.data!.length).toBeGreaterThanOrEqual(10);

    const capesRes = await provider.cosmetics.getCatalog('cape');
    expect(capesRes.success).toBe(true);
    expect(capesRes.data!.every(c => c.category === 'cape')).toBe(true);

    const hatsRes = await provider.cosmetics.getCatalog('hat');
    expect(hatsRes.success).toBe(true);
    expect(hatsRes.data!.every(c => c.category === 'hat')).toBe(true);
  });

  it('tracks owned cosmetics and favorites', async () => {
    const ownedRes = await provider.cosmetics.getOwnedCosmetics();
    expect(ownedRes.success).toBe(true);
    expect(ownedRes.data?.ownedCosmeticIds).toContain('cape_fern_emerald');
    expect(ownedRes.data?.favorites).toContain('cape_fern_emerald');
  });

  it('equips owned cosmetic and updates equipped state', async () => {
    // Equip emerald cape
    const equipRes = await provider.cosmetics.equipCosmetic('cape', 'cape_sunset_gradient');
    expect(equipRes.success).toBe(true);

    const stateRes = await provider.cosmetics.getEquippedCosmetics();
    expect(stateRes.data?.equipped.cape).toBe('cape_sunset_gradient');

    // Verify disk persistence
    const eqFile = path.join(paths.getSocialDir(), 'cosmetics_equipped.json');
    expect(fs.existsSync(eqFile)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(eqFile, 'utf-8'));
    expect(parsed.equipped.cape).toBe('cape_sunset_gradient');
  });

  it('prevents equipping unowned cosmetics', async () => {
    // 'cloak_phantom_shadow' is unowned in initial seed
    const res = await provider.cosmetics.equipCosmetic('cloak', 'cloak_phantom_shadow');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/own/i);
  });

  it('unequips cosmetic and clears category in equipped state', async () => {
    const unequipRes = await provider.cosmetics.unequipCosmetic('cape');
    expect(unequipRes.success).toBe(true);

    const stateRes = await provider.cosmetics.getEquippedCosmetics();
    expect(stateRes.data?.equipped.cape).toBeUndefined();
  });

  it('toggles favorites on and off correctly', async () => {
    const target = 'cape_founder_gold';

    // Add to favorites
    const addRes = await provider.cosmetics.toggleFavorite(target);
    expect(addRes.success).toBe(true);

    let ownedRes = await provider.cosmetics.getOwnedCosmetics();
    expect(ownedRes.data?.favorites).toContain(target);

    // Remove from favorites
    const removeRes = await provider.cosmetics.toggleFavorite(target);
    expect(removeRes.success).toBe(true);

    ownedRes = await provider.cosmetics.getOwnedCosmetics();
    expect(ownedRes.data?.favorites).not.toContain(target);
  });
});
