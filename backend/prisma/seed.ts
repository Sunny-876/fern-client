import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COSMETICS = [
  {
    id: 'cape_fern_emerald',
    name: 'Fern Emerald Cape',
    category: 'cape',
    rarity: 'rare',
    description: 'The signature vibrant emerald cape of Fern Client, featuring the minimalist compass emblem.',
    assetPath: 'cosmetics/capes/fern_emerald.png',
    previewUrl: 'assets/cosmetics/previews/cape_fern_emerald.png',
    modelType: 'both',
    animated: false,
    isStarter: true,
  },
  {
    id: 'cape_void_monolith',
    name: 'Void Monolith Cape',
    category: 'cape',
    rarity: 'epic',
    description: 'Deep obsidian fabric woven with subtle dark-matter cosmic particles.',
    assetPath: 'cosmetics/capes/void_monolith.png',
    previewUrl: 'assets/cosmetics/previews/cape_void_monolith.png',
    modelType: 'both',
    animated: true,
    isStarter: false,
  },
  {
    id: 'cape_sunset_gradient',
    name: 'Solstice Sunset Cape',
    category: 'cape',
    rarity: 'uncommon',
    description: 'A smooth dusk gradient inspired by warm horizon evenings.',
    assetPath: 'cosmetics/capes/sunset_gradient.png',
    previewUrl: 'assets/cosmetics/previews/cape_sunset_gradient.png',
    modelType: 'both',
    animated: false,
    isStarter: true,
  },
  {
    id: 'cape_founder_gold',
    name: 'Founder Gold Cape',
    category: 'cape',
    rarity: 'legendary',
    description: 'Exclusive golden embroidery awarded to Phase 1–9 development supporters.',
    assetPath: 'cosmetics/capes/founder_gold.png',
    previewUrl: 'assets/cosmetics/previews/cape_founder_gold.png',
    modelType: 'both',
    animated: true,
    isStarter: false,
  },
  {
    id: 'cloak_frost_mantle',
    name: 'Glacial Frost Mantle',
    category: 'cloak',
    rarity: 'rare',
    description: 'Thermal winter mantle trimmed with crystal ice accents.',
    assetPath: 'cosmetics/cloaks/frost_mantle.png',
    previewUrl: 'assets/cosmetics/previews/cloak_frost_mantle.png',
    modelType: 'both',
    animated: false,
    isStarter: false,
  },
  {
    id: 'cloak_shadow_shroud',
    name: 'Shadow Shroud',
    category: 'cloak',
    rarity: 'epic',
    description: 'Minimalist stealth cloak favored by nocturnal duelists.',
    assetPath: 'cosmetics/cloaks/shadow_shroud.png',
    previewUrl: 'assets/cosmetics/previews/cloak_shadow_shroud.png',
    modelType: 'both',
    animated: false,
    isStarter: false,
  },
  {
    id: 'hat_fern_beret',
    name: 'Emerald Beret',
    category: 'hat',
    rarity: 'common',
    description: 'Classic felt beret pinned with the Fern leaf insignia.',
    assetPath: 'cosmetics/hats/fern_beret.png',
    previewUrl: 'assets/cosmetics/previews/hat_fern_beret.png',
    modelType: 'both',
    animated: false,
    isStarter: true,
  },
  {
    id: 'hat_tactical_beanie',
    name: 'Charcoal Knit Beanie',
    category: 'hat',
    rarity: 'common',
    description: 'Warm and snug knit beanie suitable for all terrains.',
    assetPath: 'cosmetics/hats/tactical_beanie.png',
    previewUrl: 'assets/cosmetics/previews/hat_tactical_beanie.png',
    modelType: 'both',
    animated: false,
    isStarter: true,
  },
  {
    id: 'hat_sorcerer_cowl',
    name: 'Ancient Rune Cowl',
    category: 'hat',
    rarity: 'legendary',
    description: 'Pointed dark cowl etched with glowing arcane glyphs.',
    assetPath: 'cosmetics/hats/sorcerer_cowl.png',
    previewUrl: 'assets/cosmetics/previews/hat_sorcerer_cowl.png',
    modelType: 'both',
    animated: false,
    isStarter: false,
  },
  {
    id: 'acc_celestial_halo',
    name: 'Celestial Halo',
    category: 'accessory',
    rarity: 'epic',
    description: 'Subtle ring of golden light hovering serenely above the player.',
    assetPath: 'cosmetics/accessories/celestial_halo.png',
    previewUrl: 'assets/cosmetics/previews/acc_celestial_halo.png',
    modelType: 'both',
    animated: true,
    isStarter: false,
  },
  {
    id: 'acc_shoulder_sprout',
    name: 'Sprout Shoulder Companion',
    category: 'accessory',
    rarity: 'rare',
    description: 'A friendly miniature fern sprout sitting happily on your shoulder.',
    assetPath: 'cosmetics/accessories/shoulder_sprout.png',
    previewUrl: 'assets/cosmetics/previews/acc_shoulder_sprout.png',
    modelType: 'both',
    animated: false,
    isStarter: true,
  },
  {
    id: 'emote_fern_wave',
    name: 'Friendly Wave',
    category: 'emote',
    rarity: 'common',
    description: 'A polite, respectful wave greeting fellow players.',
    assetPath: 'cosmetics/emotes/wave.json',
    previewUrl: 'assets/cosmetics/previews/emote_wave.png',
    modelType: 'both',
    animated: false,
    isStarter: true,
  },
  {
    id: 'emote_victory_flourish',
    name: 'Victory Flourish',
    category: 'emote',
    rarity: 'uncommon',
    description: 'A celebratory bow and flourish after a successful encounter.',
    assetPath: 'cosmetics/emotes/victory.json',
    previewUrl: 'assets/cosmetics/previews/emote_victory.png',
    modelType: 'both',
    animated: false,
    isStarter: false,
  },
];

async function main() {
  console.log('Seeding cosmetic catalog definitions...');
  for (const c of COSMETICS) {
    await prisma.cosmeticDefinition.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log(`Seeded ${COSMETICS.length} cosmetic catalog items.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
