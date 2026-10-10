import { BaseModule } from '../IModule';
import { BooleanSetting, EnumSetting, FloatSetting, IntegerSetting } from '../../settings/Setting';

export interface ProcessedChatMessage {
  display: boolean;
  formattedText: string;
  isFiltered: boolean;
  filterReason?: string;
}

export class ChatCustomizerModule extends BaseModule {
  public readonly showTimestampsSetting: BooleanSetting;
  public readonly timestampFormatSetting: EnumSetting<'[HH:mm:ss]' | '[HH:mm]'>;
  public readonly chatOpacitySetting: FloatSetting;
  public readonly chatScaleSetting: FloatSetting;
  public readonly chatWidthSetting: IntegerSetting;
  public readonly chatHeightSetting: IntegerSetting;
  public readonly hideJoinMessagesSetting: BooleanSetting;
  public readonly hideLeaveMessagesSetting: BooleanSetting;
  public readonly hideSystemNoiseSetting: BooleanSetting;

  constructor() {
    super(
      'chat_customizer',
      'Chat Customizer',
      'Configurable chat timestamps, background opacity, scaling, and local message noise filters.',
      'Visual'
    );

    this.showTimestampsSetting = new BooleanSetting(
      'show_timestamps',
      'Chat Timestamps',
      'Prepends time badges to in-game chat messages.',
      true
    );

    this.timestampFormatSetting = new EnumSetting(
      'timestamp_format',
      'Timestamp Format',
      'Display seconds in timestamp.',
      '[HH:mm:ss]',
      ['[HH:mm:ss]', '[HH:mm]'] as const
    );

    this.chatOpacitySetting = new FloatSetting(
      'chat_opacity',
      'Background Opacity',
      'Translucency of the chat box background.',
      0.8,
      { min: 0.1, max: 1.0, step: 0.05 }
    );

    this.chatScaleSetting = new FloatSetting(
      'chat_scale',
      'Chat Scale',
      'Visual scale of the chat box text.',
      1.0,
      { min: 0.5, max: 2.0, step: 0.05 }
    );

    this.chatWidthSetting = new IntegerSetting(
      'chat_width',
      'Chat Width (px)',
      'Width of chat window.',
      320,
      { min: 120, max: 640, step: 10 }
    );

    this.chatHeightSetting = new IntegerSetting(
      'chat_height',
      'Chat Height (px)',
      'Height of chat window.',
      180,
      { min: 60, max: 400, step: 10 }
    );

    this.hideJoinMessagesSetting = new BooleanSetting(
      'hide_join',
      'Hide Player Join Messages',
      'Filters player join announcements from chat display.',
      false
    );

    this.hideLeaveMessagesSetting = new BooleanSetting(
      'hide_leave',
      'Hide Player Leave Messages',
      'Filters player disconnect announcements from chat display.',
      false
    );

    this.hideSystemNoiseSetting = new BooleanSetting(
      'hide_noise',
      'Hide System Noise',
      'Filters repetitive server broadcast dividers and tip noise.',
      false
    );

    this.addSetting(this.showTimestampsSetting);
    this.addSetting(this.timestampFormatSetting);
    this.addSetting(this.chatOpacitySetting);
    this.addSetting(this.chatScaleSetting);
    this.addSetting(this.chatWidthSetting);
    this.addSetting(this.chatHeightSetting);
    this.addSetting(this.hideJoinMessagesSetting);
    this.addSetting(this.hideLeaveMessagesSetting);
    this.addSetting(this.hideSystemNoiseSetting);
  }

  /**
   * Processes a raw Minecraft chat message:
   * - Never filters server moderation messages (bans, kicks, mutes, warnings).
   * - Optionally filters join/leave/system noise messages.
   * - Prepends configured timestamp badge.
   */
  public processMessage(rawText: string, date: Date = new Date()): ProcessedChatMessage {
    if (!this.isEnabled()) {
      return { display: true, formattedText: rawText, isFiltered: false };
    }

    const lower = rawText.toLowerCase();

    // Critical Rule: Server moderation messages must NEVER be hidden.
    const isModeration = /\b(banned|kicked|muted|warned|punished|report|anti-cheat)\b/i.test(lower);

    if (!isModeration) {
      if (this.hideJoinMessagesSetting.value) {
        if (/\b(joined the game|has joined|connected to the server)\b/i.test(lower)) {
          return { display: false, formattedText: rawText, isFiltered: true, filterReason: 'join_message' };
        }
      }

      if (this.hideLeaveMessagesSetting.value) {
        if (/\b(left the game|has left|disconnected|quit the server)\b/i.test(lower)) {
          return { display: false, formattedText: rawText, isFiltered: true, filterReason: 'leave_message' };
        }
      }

      if (this.hideSystemNoiseSetting.value) {
        if (/(={6,}|-{6,}|\*{6,}|\[tips\]|\[store\]|vote for rewards)/i.test(lower)) {
          return { display: false, formattedText: rawText, isFiltered: true, filterReason: 'system_noise' };
        }
      }
    }

    // Format with timestamp
    let formattedText = rawText;
    if (this.showTimestampsSetting.value) {
      const stamp = this.formatTimestamp(date);
      formattedText = `§8${stamp}§r ${rawText}`;
    }

    return { display: true, formattedText, isFiltered: false };
  }

  private formatTimestamp(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    if (this.timestampFormatSetting.value === '[HH:mm]') {
      return `[${hh}:${mm}]`;
    }
    return `[${hh}:${mm}:${ss}]`;
  }
}
