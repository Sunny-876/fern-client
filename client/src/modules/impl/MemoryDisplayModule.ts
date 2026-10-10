import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class MemoryHudElement extends BaseHudElement {
  private usedMb = 3200;
  private maxMb = 8192;

  constructor(private parentModule: MemoryDisplayModule) {
    super('hud_memory', 'Memory Display', { x: 10, y: 70, width: 115, height: 16, anchor: 'TOP_LEFT' });
  }

  public updateMemory(usedMb: number, maxMb: number): void {
    this.usedMb = usedMb;
    this.maxMb = maxMb;
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const usedGb = (this.usedMb / 1024).toFixed(1);
    const maxGb = (this.maxMb / 1024).toFixed(1);

    let text = `RAM: ${usedGb} / ${maxGb} GB`;
    if (this.parentModule.showPercentageSetting.value && this.maxMb > 0) {
      const pct = Math.round((this.usedMb / this.maxMb) * 100);
      text += ` (${pct}%)`;
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

export class MemoryDisplayModule extends BaseModule {
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly showPercentageSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: MemoryHudElement;

  constructor(private hudManager?: HUDManager) {
    super('memory_display', 'Memory Display', 'Shows real-time Java JVM memory allocation and usage.', 'HUD');

    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders background box.', true);
    this.showPercentageSetting = new BooleanSetting('show_percentage', 'Show Percentage', 'Displays percentage of allocated heap in use.', true);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of text readout.', '#f8fafc');

    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.showPercentageSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new MemoryHudElement(this);
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

  public setMemory(usedMb: number, maxMb: number): void {
    this.hudElement.updateMemory(usedMb, maxMb);
  }
}
