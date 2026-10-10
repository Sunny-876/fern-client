import { BaseModule } from '../IModule';
import { BooleanSetting, ColorSetting } from '../../settings/Setting';
import { BaseHudElement, HudRenderContext } from '../../hud/IHudElement';
import { HUDManager } from '../../hud/HUDManager';

export class ServerInfoHudElement extends BaseHudElement {
  public serverAddress = 'play.hypixel.net';
  public pingMs = 28;
  public playerCount = 124;
  public isConnected = true;

  constructor(private parentModule: ServerInfoHudModule) {
    super('hud_server_info', 'Server Info HUD', {
      x: 10,
      y: 90,
      width: 140,
      height: 18,
      anchor: 'TOP_LEFT',
    });
  }

  public updateServer(info: { address?: string; ping?: number; players?: number; connected?: boolean }): void {
    if (info.address) this.serverAddress = info.address;
    if (info.ping !== undefined) this.pingMs = info.ping;
    if (info.players !== undefined) this.playerCount = info.players;
    if (info.connected !== undefined) this.isConnected = info.connected;
  }

  public render(context: HudRenderContext): void {
    const pos = this.getCalculatedPosition(context.screenWidth, context.screenHeight);
    const color = this.parentModule.textColorSetting.value;

    let text = this.serverAddress;
    if (this.parentModule.showPingSetting.value) {
      text += ` (${this.pingMs}ms)`;
    }
    if (this.parentModule.showPlayersSetting.value) {
      text += ` [${this.playerCount}]`;
    }

    if (this.parentModule.showBackgroundSetting.value && context.drawRect) {
      context.drawRect(pos.screenX, pos.screenY, pos.renderWidth, pos.renderHeight, 'rgba(0, 0, 0, 0.45)');
    }

    if (context.drawText) {
      context.drawText(text, pos.screenX + 4, pos.screenY + 4, color, true);
    }
  }
}

export class ServerInfoHudModule extends BaseModule {
  public readonly showPingSetting: BooleanSetting;
  public readonly showPlayersSetting: BooleanSetting;
  public readonly showBackgroundSetting: BooleanSetting;
  public readonly textColorSetting: ColorSetting;
  public readonly hudElement: ServerInfoHudElement;

  constructor(private hudManager?: HUDManager) {
    super(
      'server_info_hud',
      'Server Info HUD',
      'Displays connected server hostname, ping latency, and player count.',
      'HUD'
    );

    this.showPingSetting = new BooleanSetting('show_ping', 'Show Ping', 'Displays current server latency in ms.', true);
    this.showPlayersSetting = new BooleanSetting('show_players', 'Show Players', 'Displays player count.', false);
    this.showBackgroundSetting = new BooleanSetting('show_background', 'Show Background', 'Renders background box.', true);
    this.textColorSetting = new ColorSetting('text_color', 'Text Color', 'Color of text readout.', '#22c55e');

    this.addSetting(this.showPingSetting);
    this.addSetting(this.showPlayersSetting);
    this.addSetting(this.showBackgroundSetting);
    this.addSetting(this.textColorSetting);

    this.hudElement = new ServerInfoHudElement(this);
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
