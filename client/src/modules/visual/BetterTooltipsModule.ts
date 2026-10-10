import { BaseModule } from '../IModule';
import { BooleanSetting } from '../../settings/Setting';

export interface FormattedTooltipItem {
  name: string;
  id?: string;
  durability?: { current: number; max: number };
  enchantments?: Array<{ name: string; level: number }>;
  modName?: string;
}

export class BetterTooltipsModule extends BaseModule {
  public readonly showItemIdSetting: BooleanSetting;
  public readonly showDurabilitySetting: BooleanSetting;
  public readonly showEnchantDetailsSetting: BooleanSetting;
  public readonly showModOriginSetting: BooleanSetting;

  constructor() {
    super(
      'better_tooltips',
      'Better Tooltips',
      'Enhanced inventory item tooltips showing durability numbers, IDs, and mod origin.',
      'Visual'
    );

    this.showItemIdSetting = new BooleanSetting(
      'show_id',
      'Show Item ID',
      'Displays registry identifier e.g. "minecraft:diamond_sword".',
      true
    );

    this.showDurabilitySetting = new BooleanSetting(
      'show_durability',
      'Numeric Durability',
      'Displays remaining durability ratio and percentage.',
      true
    );

    this.showEnchantDetailsSetting = new BooleanSetting(
      'show_enchants',
      'Enchantment Levels',
      'Highlights item enchantments in golden roman numerals.',
      true
    );

    this.showModOriginSetting = new BooleanSetting(
      'show_mod_origin',
      'Mod Origin',
      'Displays mod name responsible for adding the item.',
      true
    );

    this.addSetting(this.showItemIdSetting);
    this.addSetting(this.showDurabilitySetting);
    this.addSetting(this.showEnchantDetailsSetting);
    this.addSetting(this.showModOriginSetting);
  }

  public formatTooltipLines(item: FormattedTooltipItem): string[] {
    const lines: string[] = [item.name];

    if (this.showEnchantDetailsSetting.value && item.enchantments && item.enchantments.length > 0) {
      for (const e of item.enchantments) {
        lines.push(`§7${e.name} ${this.toRomanNumeral(e.level)}`);
      }
    }

    if (this.showDurabilitySetting.value && item.durability) {
      const pct = Math.round((item.durability.current / item.durability.max) * 100);
      lines.push(`§8Durability: §f${item.durability.current} / ${item.durability.max} (${pct}%)`);
    }

    if (this.showItemIdSetting.value && item.id) {
      lines.push(`§8${item.id}`);
    }

    if (this.showModOriginSetting.value && item.modName) {
      lines.push(`§9§o${item.modName}`);
    }

    return lines;
  }

  private toRomanNumeral(num: number): string {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return romans[num - 1] || String(num);
  }
}
