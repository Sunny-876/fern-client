import { BaseModule } from '../IModule';
import { BooleanSetting, EnumSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export interface ArmorPiece {
  slot: 'helmet' | 'chestplate' | 'leggings' | 'boots';
  name: string;
  durability: number; // e.g. 385
  maxDurability: number; // e.g. 407
}

export class ArmorHudElement extends BaseHudElement {
  public armorPieces: ArmorPiece[] = [
    { slot: 'helmet', name: 'Diamond Helmet', durability: 320, maxDurability: 363 },
    { slot: 'chestplate', name: 'Diamond Chestplate', durability: 490, maxDurability: 528 },
    { slot: 'leggings', name: 'Diamond Leggings', durability: 410, maxDurability: 495 },
    { slot: 'boots', name: 'Diamond Boots', durability: 395, maxDurability: 429 },
  ];

  constructor(private parentModule: ArmorHudModule) {
    super('hud_armor', 'Armor Status HUD', {
      x: 10,
      y: 180,
      width: 140,
      height: 72,
      anchor: 'BOTTOM_LEFT',
    });
  }

  public updateArmor(pieces: ArmorPiece[]): void {
    this.armorPieces = pieces;
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const isHorizontal = this.parentModule.orientationSetting.value === 'Horizontal';
    const showDurability = this.parentModule.showDurabilitySetting.value;
    const color = this.parentModule.textColorSetting.value;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      let curX = pos.screenX + 4;
      let curY = pos.screenY + 4;

      for (const piece of this.armorPieces) {
        const slotLabel = piece.slot[0].toUpperCase() + piece.slot.slice(1, 4);
        let text = slotLabel;
        if (showDurability) {
          text += `: ${piece.durability}`;
        }

        context.drawText(text, curX, curY, color, true);

        if (isHorizontal) {
          curX += 34;
        } else {
          curY += 16;
        }
      }
    }
  }
}

export class ArmorHudModule extends BaseModule {
  public readonly orientationSetting: EnumSetting<'Vertical' | 'Horizontal'>;
  public readonly showDurabilitySetting: BooleanSetting;
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: ArmorHudElement;

  constructor(private hudManager?: HUDManager) {
    super(
      'armor_hud',
      'Armor Status HUD',
      'Displays currently equipped armor durability and status on screen.',
      'HUD'
    );

    this.orientationSetting = new EnumSetting(
      'orientation',
      'Layout Orientation',
      'Display armor pieces vertically or horizontally.',
      'Vertical',
      ['Vertical', 'Horizontal'] as const
    );

    this.showDurabilitySetting = new BooleanSetting(
      'show_durability',
      'Show Durability',
      'Displays numeric durability values beside armor slots.',
      true
    );

    this.showBackgroundSetting = new BooleanSetting(
      'show_background',
      'Show Background',
      'Renders dark translucent backing behind armor icons.',
      true
    );

    this.textColorSetting = new ColorSetting(
      'text_color',
      'Text Color',
      'Color of durability numbers.',
      '#f8fafc'
    );

    this.addSetting(this.orientationSetting);
    this.addSetting(this.showDurabilitySetting);
    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new ArmorHudElement(this);
  }

  public onInitialize(): void {
    if (this.hudManager) {
      this.hudManager.register(this.hudElement);
    }
  }

  public onEnable(): void {
    this.hudElement.enabled = true;
  }

  public onDisable(): void {
    this.hudElement.enabled = false;
  }
}
