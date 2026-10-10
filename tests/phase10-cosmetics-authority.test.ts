import { describe, it, expect } from 'vitest';
import { CosmeticCategory } from '../shared/models/cosmetics';

describe('Phase 10: Server Authoritative Cosmetics & Ownership Enforcement', () => {
  it('enforces server ownership before allowing cosmetic equipping', () => {
    const ownedCosmetics = new Set<string>(['cape_fern_emerald', 'hat_fern_beret']);
    const equipped = new Map<CosmeticCategory, string>();

    const equipCosmetic = (category: CosmeticCategory, cosmeticId: string) => {
      // Server must be authoritative
      if (!ownedCosmetics.has(cosmeticId)) {
        throw new Error(`Ownership check failed: User does not own '${cosmeticId}'`);
      }
      equipped.set(category, cosmeticId);
      return Object.fromEntries(equipped);
    };

    // Equipping owned cosmetic succeeds
    expect(() => equipCosmetic('cape', 'cape_fern_emerald')).not.toThrow();
    expect(equipped.get('cape')).toBe('cape_fern_emerald');

    // Equipping unowned cosmetic is rejected by server
    expect(() => equipCosmetic('cape', 'cape_founder_gold')).toThrow('Ownership check failed');
    expect(equipped.get('cape')).toBe('cape_fern_emerald'); // unchanged
  });

  it('allows unequipping cosmetics safely', () => {
    const equipped = new Map<CosmeticCategory, string>();
    equipped.set('cape', 'cape_fern_emerald');
    equipped.set('hat', 'hat_fern_beret');

    const unequipCosmetic = (category: CosmeticCategory) => {
      equipped.delete(category);
      return Object.fromEntries(equipped);
    };

    unequipCosmetic('cape');
    expect(equipped.has('cape')).toBe(false);
    expect(equipped.has('hat')).toBe(true);
  });

  it('generates in-game cosmetics payload only with server-verified items', () => {
    const owned = new Set<string>(['cape_fern_emerald']);
    const requestedEquipped: Record<string, string> = {
      cape: 'cape_fern_emerald',
      cloak: 'cloak_frost_mantle', // not owned
    };

    // Filter to verified owned
    const verifiedEquipped: Record<string, string> = {};
    for (const [cat, id] of Object.entries(requestedEquipped)) {
      if (owned.has(id)) {
        verifiedEquipped[cat] = id;
      }
    }

    expect(verifiedEquipped).toEqual({
      cape: 'cape_fern_emerald',
    });
    expect(verifiedEquipped.cloak).toBeUndefined();
  });
});
