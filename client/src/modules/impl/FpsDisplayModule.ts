import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting, FloatSetting, StringSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class FpsHudElement extends BaseHudElement {
  private currentFps: number = 144;
  private lastUpdate: number = Date.now();

  constructor(private parentModule: FpsDisplayModule) {
    super('hud_fps', 'FPS Display', { x: 10, y: 10, width: 68, height: 16, anchor: 'TOP_LEFT' });
  }

  public updateFps(fps: number): void {
    this.currentFps = fps;
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const prefix = this.parentModule.prefixSetting.value;
    const text = `${prefix} ${this.currentFps}`;
    const color = this.parentModule.textColorSetting.value;

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      context.drawText(text, pos.screenX + 4, pos.screenY + 4, color, true);
    }
  }
}

export class FpsDisplayModule extends BaseModule {
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly prefixSetting: StringSetting;
  public readonly hudElement: FpsHudElement;

  constructor(private hudManager?: HUDManager) {
    super('fps_display', 'FPS Display', 'Displays current frames per second on screen.', 'HUD');

    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders a semi-transparent dark box behind the text.', true);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of the FPS counter.', '#22c55e');
    this.prefixSetting = new StringSetting('prefix', 'Prefix Text', 'Text displayed before the FPS number.', 'FPS:');

    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);
    this.addSetting(this.prefixSetting);

    this.hudElement = new FpsHudElement(this);
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

  public setSampledFps(fps: number): void {
    this.hudElement.updateFps(fps);
  }
}
