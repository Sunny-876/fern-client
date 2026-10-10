import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class CoordinatesHudElement extends BaseHudElement {
  private xCoord = 125;
  private yCoord = 64;
  private zCoord = -320;

  constructor(private parentModule: CoordinatesDisplayModule) {
    super('hud_coords', 'Coordinates Display', { x: 10, y: 50, width: 140, height: 16, anchor: 'TOP_LEFT' });
  }

  public updateCoords(x: number, y: number, z: number): void {
    this.xCoord = Math.round(x);
    this.yCoord = Math.round(y);
    this.zCoord = Math.round(z);
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    let text = `XYZ: ${this.xCoord} / ${this.yCoord} / ${this.zCoord}`;

    if (this.parentModule.showNetherSetting.value) {
      const netherX = Math.round(this.xCoord / 8);
      const netherZ = Math.round(this.zCoord / 8);
      text += ` [Nether: ${netherX}, ${netherZ}]`;
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

export class CoordinatesDisplayModule extends BaseModule {
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly showNetherSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: CoordinatesHudElement;

  constructor(private hudManager?: HUDManager) {
    super('coordinates_display', 'Coordinates Display', 'Displays current world position XYZ and Nether calculations.', 'HUD');

    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders background box.', true);
    this.showNetherSetting = new BooleanSetting('show_nether', 'Show Nether Translation', 'Calculates coordinates in the Nether dimension (8:1 ratio).', false);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of the coordinate numbers.', '#f8fafc');

    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.showNetherSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new CoordinatesHudElement(this);
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

  public setCoordinates(x: number, y: number, z: number): void {
    this.hudElement.updateCoords(x, y, z);
  }
}
