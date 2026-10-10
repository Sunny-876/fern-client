export interface ClientEvent {
  readonly eventName: string;
  cancelled?: boolean;
}

export interface ClientTickEvent extends ClientEvent {
  readonly eventName: 'client_tick';
  readonly tickCount: number;
}

export interface Render2DEvent extends ClientEvent {
  readonly eventName: 'render_2d';
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly partialTicks: number;
  readonly drawRect?: (x: number, y: number, w: number, h: number, color: string) => void;
  readonly drawText?: (text: string, x: number, y: number, color: string, shadow?: boolean) => void;
}

export interface WorldLoadEvent extends ClientEvent {
  readonly eventName: 'world_load';
  readonly worldName: string;
  readonly isMultiplayer: boolean;
}

export interface WorldUnloadEvent extends ClientEvent {
  readonly eventName: 'world_unload';
}

export interface PlayerJoinEvent extends ClientEvent {
  readonly eventName: 'player_join';
  readonly username: string;
  readonly uuid: string;
  readonly serverAddress?: string;
}

export interface PlayerLeaveEvent extends ClientEvent {
  readonly eventName: 'player_leave';
}

export interface ScreenOpenEvent extends ClientEvent {
  readonly eventName: 'screen_open';
  readonly screenName: string | null;
}

export interface KeyPressEvent extends ClientEvent {
  readonly eventName: 'key_press';
  readonly key: string;
  readonly action: 'down' | 'up' | 'repeat';
  readonly modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
  };
}

export interface MouseInputEvent extends ClientEvent {
  readonly eventName: 'mouse_input';
  readonly button: number; // 0=LMB, 1=RMB, 2=MMB
  readonly action: 'down' | 'up';
  readonly x: number;
  readonly y: number;
}

export interface GameShutdownEvent extends ClientEvent {
  readonly eventName: 'game_shutdown';
}

export interface ScreenshotTakenEvent extends ClientEvent {
  readonly eventName: 'screenshot_taken';
  readonly entry: any;
}

export interface ChatMessageEvent extends ClientEvent {
  readonly eventName: 'chat_message';
  readonly message: string;
  readonly sender?: string;
}

export type FernEventMap = {
  client_tick: ClientTickEvent;
  render_2d: Render2DEvent;
  world_load: WorldLoadEvent;
  world_unload: WorldUnloadEvent;
  player_join: PlayerJoinEvent;
  player_leave: PlayerLeaveEvent;
  screen_open: ScreenOpenEvent;
  key_press: KeyPressEvent;
  mouse_input: MouseInputEvent;
  game_shutdown: GameShutdownEvent;
  screenshot_taken: ScreenshotTakenEvent;
  chat_message: ChatMessageEvent;
};

export type EventName = keyof FernEventMap;
