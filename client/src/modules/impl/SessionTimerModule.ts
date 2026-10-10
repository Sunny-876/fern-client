import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting, EnumSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class SessionTimerHudElement extends BaseHudElement {
  private startTime = Date.now();

  constructor(private parentModule: SessionTimerModule) {
    super('hud_session', 'Session Timer', { x: 10, y: 90, width: 105, height: 16, anchor: 'TOP_LEFT' });
  }

  public resetTimer(): void {
    this.startTime = Date.now();
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - this.startTime) / 1000));

    const hours = Math.floor(elapsedSecs / 3600);
    const mins = Math.floor((elapsedSecs % 3600) / 60);
    const secs = elapsedSecs % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    let timeFormatted = '';

    if (this.parentModule.formatSetting.value === 'HH:MM:SS' || hours > 0) {
      timeFormatted = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    } else {
      timeFormatted = `${pad(mins)}:${pad(secs)}`;
    }

    const text = `Session: ${timeFormatted}`;
    const color = this.parentModule.textColorSetting.value;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      context.drawText(text, pos.screenX + 4, pos.screenY + 4, color, true);
    }
  }
}

export class SessionTimerModule extends BaseModule {
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly formatSetting: EnumSetting<'MM:SS' | 'HH:MM:SS'>;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: SessionTimerHudElement;

  constructor(private hudManager?: HUDManager) {
    super('session_timer', 'Session Timer', 'Tracks continuous gameplay session time.', 'HUD');

    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders background box.', true);
    this.formatSetting = new EnumSetting('format', 'Time Format', 'Display format of timer.', 'MM:SS', ['MM:SS', 'HH:MM:SS'] as const);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of timer text.', '#f8fafc');

    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.formatSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new SessionTimerHudElement(this);
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

  public reset(): void {
    this.hudElement.resetTimer();
  }
}
