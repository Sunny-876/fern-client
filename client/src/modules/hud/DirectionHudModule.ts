import { BaseModule } from '../IModule';
import { BooleanSetting, EnumSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class DirectionHudElement extends BaseHudElement {
  private currentYaw = 180; // Degrees (0 = S, 90 = W, 180 = N, 270 = E)

  constructor(private parentModule: DirectionHudModule) {
    super('hud_direction', 'Direction HUD', {
      x: 0,
      y: 10,
      width: 120,
      height: 18,
      anchor: 'TOP_CENTER',
    });
  }

  public setYaw(yaw: number): void {
    // Normalize yaw to 0..360
    let norm = yaw % 360;
    if (norm < 0) norm += 360;
    this.currentYaw = Math.round(norm);
  }

  public getCardinal(): string {
    const directions = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
    const idx = Math.round(this.currentYaw / 45) % 8;
    return directions[idx];
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const mode = this.parentModule.displayModeSetting.value;
    const color = this.parentModule.textColorSetting.value;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      const cardinal = this.getCardinal();
      let text = `[ ${cardinal} ]`;
      if (mode === 'Degrees') {
        text = `${cardinal} (${this.currentYaw}°)`;
      } else if (mode === 'Tape') {
        text = `W  ·  ${cardinal}  ·  E`;
      }
      context.drawText(text, pos.screenX + 6, pos.screenY + 4, color, true);
    }
  }
}

export class DirectionHudModule extends BaseModule {
  public readonly displayModeSetting: EnumSetting<'Cardinal' | 'Degrees' | 'Tape'>;
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: DirectionHudElement;

  constructor(private hudManager?: HUDManager) {
    super(
      'direction_hud',
      'Direction HUD',
      'On-screen compass indicating player facing direction and yaw angle.',
      'HUD'
    );

    this.displayModeSetting = new EnumSetting(
      'mode',
      'Display Mode',
      'Format of the direction readout.',
      'Degrees',
      ['Cardinal', 'Degrees', 'Tape'] as const
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
      'Color of direction text.',
      '#22c55e'
    );

    this.addSetting(this.displayModeSetting);
    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new DirectionHudElement(this);
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
