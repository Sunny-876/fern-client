import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting, StringSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class PingHudElement extends BaseHudElement {
  private currentPing: number = 28;

  constructor(private parentModule: PingDisplayModule) {
    super('hud_ping', 'Ping Display', { x: 10, y: 30, width: 74, height: 16, anchor: 'TOP_LEFT' });
  }

  public updatePing(pingMs: number): void {
    this.currentPing = pingMs;
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const text = `${this.parentModule.prefixSetting.value} ${this.currentPing} ms`;
    const color = this.parentModule.textColorSetting.value;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      context.drawText(text, pos.screenX + 4, pos.screenY + 4, color, true);
    }
  }
}

export class PingDisplayModule extends BaseModule {
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly prefixSetting: StringSetting;
  public readonly hudElement: PingHudElement;

  constructor(private hudManager?: HUDManager) {
    super('ping_display', 'Ping Display', 'Shows real-time server latency in milliseconds.', 'HUD');

    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders a background box behind text.', true);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of the ping readout.', '#f8fafc');
    this.prefixSetting = new StringSetting('prefix', 'Prefix Text', 'Label before ping readout.', 'Ping:');

    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);
    this.addSetting(this.prefixSetting);

    this.hudElement = new PingHudElement(this);
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

  public setPing(pingMs: number): void {
    this.hudElement.updatePing(pingMs);
  }
}
