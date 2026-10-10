import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class WorldInfoHudElement extends BaseHudElement {
  public biome = 'Plains';
  public lightLevel = 15;
  public timeOfDay = '12:00 PM';
  public dimension = 'Overworld';

  constructor(private parentModule: WorldInfoHudModule) {
    super('hud_world_info', 'World Info HUD', {
      x: 10,
      y: 70,
      width: 150,
      height: 18,
      anchor: 'TOP_LEFT',
    });
  }

  public updateWorldInfo(info: { biome?: string; light?: number; time?: string; dim?: string }): void {
    if (info.biome) this.biome = info.biome;
    if (info.light !== undefined) this.lightLevel = info.light;
    if (info.time) this.timeOfDay = info.time;
    if (info.dim) this.dimension = info.dim;
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const color = this.parentModule.textColorSetting.value;

    const parts: string[] = [];
    if (this.parentModule.showBiomeSetting.value) parts.push(this.biome);
    if (this.parentModule.showLightSetting.value) parts.push(`Light: ${this.lightLevel}`);
    if (this.parentModule.showTimeSetting.value) parts.push(this.timeOfDay);

    const text = parts.join(' | ') || 'World';

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      context.drawText(text, pos.screenX + 4, pos.screenY + 4, color, true);
    }
  }
}

export class WorldInfoHudModule extends BaseModule {
  public readonly showBiomeSetting: BooleanSetting;
  public readonly showLightSetting: BooleanSetting;
  public readonly showTimeSetting: BooleanSetting;
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: WorldInfoHudElement;

  constructor(private hudManager?: HUDManager) {
    super(
      'world_info_hud',
      'World Information HUD',
      'Displays legitimate local world information such as current biome, light level, and time.',
      'HUD'
    );

    this.showBiomeSetting = new BooleanSetting('show_biome', 'Show Biome', 'Displays current biome name.', true);
    this.showLightSetting = new BooleanSetting('show_light', 'Show Light Level', 'Displays block light level at player feet.', true);
    this.showTimeSetting = new BooleanSetting('show_time', 'Show Time of Day', 'Displays current in-game clock time.', false);
    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders background box.', true);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of text readout.', '#f8fafc');

    this.addSetting(this.showBiomeSetting);
    this.addSetting(this.showLightSetting);
    this.addSetting(this.showTimeSetting);
    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new WorldInfoHudElement(this);
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
