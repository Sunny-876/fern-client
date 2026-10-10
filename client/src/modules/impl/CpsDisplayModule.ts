import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting, StringSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';
import { MouseInputEvent } from '../../events/ClientEvents';

export class CpsHudElement extends BaseHudElement {
  private leftClicks: number[] = [];
  private rightClicks: number[] = [];

  constructor(private parentModule: CpsDisplayModule) {
    super('hud_cps', 'CPS Display', { x: 10, y: 200, width: 85, height: 16, anchor: 'TOP_LEFT' });
  }

  public recordClick(button: number): void {
    const now = Date.now();
    if (button === 0) {
      this.leftClicks.push(now);
    } else if (button === 1) {
      this.rightClicks.push(now);
    }
  }

  public getCps(): { left: number; right: number } {
    const cutoff = Date.now() - 1000;
    this.leftClicks = this.leftClicks.filter((t) => t >= cutoff);
    this.rightClicks = this.rightClicks.filter((t) => t >= cutoff);
    return {
      left: this.leftClicks.length,
      right: this.rightClicks.length,
    };
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const cps = this.getCps();

    let text = `${this.parentModule.prefixSetting.value} ${cps.left}`;
    if (this.parentModule.showRightClickSetting.value) {
      text += ` | ${cps.right}`;
    }

    const color = this.parentModule.textColorSetting.value;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      context.drawText(text, pos.screenX + 4, pos.screenY + 4, color, true);
    }
  }
}

export class CpsDisplayModule extends BaseModule {
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly showRightClickSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly prefixSetting: StringSetting;
  public readonly hudElement: CpsHudElement;

  constructor(private hudManager?: HUDManager) {
    super('cps_display', 'CPS Display', 'Displays real-time clicks per second with legitimate sliding-window tracking.', 'HUD');

    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders background box.', true);
    this.showRightClickSetting = new BooleanSetting('show_right_click', 'Show Right Click CPS', 'Displays both LMB and RMB click rates.', true);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of text readout.', '#f8fafc');
    this.prefixSetting = new StringSetting('prefix', 'Prefix', 'Prefix label.', 'CPS:');

    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.showRightClickSetting);
    this.addSetting(this.textColorSetting);
    this.addSetting(this.prefixSetting);

    this.hudElement = new CpsHudElement(this);
  }

  public onInitialize(): void {
    if (this.hudManager) {
      this.hudManager.register(this.hudElement);
    }
  }

  public onEnable(): void {
    this.hudElement.enabled = true;

    // Track mouse button clicks
    this.listen('mouse_input', (evt: MouseInputEvent) => {
      if (evt.action === 'down') {
        this.hudElement.recordClick(evt.button);
      }
    });
  }

  public onDisable(): void {
    this.hudElement.enabled = false;
  }
}
