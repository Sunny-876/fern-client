import { BaseModule } from '../IModule';
import { BooleanSetting, EnumSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export interface PotionEffect {
  id: string;
  name: string;
  amplifier: number; // 0 = I, 1 = II
  durationTicks: number; // 20 ticks = 1 second
}

export class PotionHudElement extends BaseHudElement {
  public effects: PotionEffect[] = [
    { id: 'speed', name: 'Speed', amplifier: 1, durationTicks: 1680 }, // 1:24
    { id: 'strength', name: 'Strength', amplifier: 0, durationTicks: 960 }, // 0:48
  ];

  constructor(private parentModule: PotionHudModule) {
    super('hud_potion', 'Potion Effects HUD', {
      x: 10,
      y: 110,
      width: 120,
      height: 48,
      anchor: 'TOP_RIGHT',
    });
  }

  public updateEffects(effects: PotionEffect[]): void {
    this.effects = effects;
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const showDuration = this.parentModule.showDurationSetting.value;
    const compact = this.parentModule.displayModeSetting.value === 'Compact';
    const color = this.parentModule.textColorSetting.value;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      let curY = pos.screenY + 4;
      for (const eff of this.effects) {
        const roman = eff.amplifier > 0 ? ` ${this.toRoman(eff.amplifier + 1)}` : '';
        const secs = Math.floor(eff.durationTicks / 20);
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        const durStr = `${mins}:${String(remSecs).padStart(2, '0')}`;

        const text = compact
          ? `${eff.name}${roman} [${durStr}]`
          : `${eff.name}${roman}${showDuration ? ` - ${durStr}` : ''}`;

        context.drawText(text, pos.screenX + 4, curY, color, true);
        curY += 16;
      }
    }
  }

  private toRoman(n: number): string {
    const r = ['I', 'II', 'III', 'IV', 'V'];
    return r[n - 1] || String(n);
  }
}

export class PotionHudModule extends BaseModule {
  public readonly displayModeSetting: EnumSetting<'Detailed' | 'Compact'>;
  public readonly showDurationSetting: BooleanSetting;
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: PotionHudElement;

  constructor(private hudManager?: HUDManager) {
    super(
      'potion_hud',
      'Potion Effects HUD',
      'Displays active status potion effects and countdown timers.',
      'HUD'
    );

    this.displayModeSetting = new EnumSetting(
      'mode',
      'Display Mode',
      'Detailed with separate rows or compact.',
      'Detailed',
      ['Detailed', 'Compact'] as const
    );

    this.showDurationSetting = new BooleanSetting(
      'show_duration',
      'Show Duration',
      'Displays countdown minutes and seconds remaining.',
      true
    );

    this.showBackgroundSetting = new BooleanSetting(
      'show_background',
      'Show Background',
      'Renders dark translucent panel backing.',
      true
    );

    this.textColorSetting = new ColorSetting(
      'text_color',
      'Text Color',
      'Color of potion effect labels.',
      '#f8fafc'
    );

    this.addSetting(this.displayModeSetting);
    this.addSetting(this.showDurationSetting);
    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new PotionHudElement(this);
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
