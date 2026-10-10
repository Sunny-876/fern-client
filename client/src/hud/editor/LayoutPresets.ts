import { SerializedHudElementConfig } from '../IHudElement';

export type HudPresetName = 'Minimal' | 'PvP' | 'Performance' | 'Streamer' | 'Clean' | 'Default';

export interface HudLayoutPreset {
  name: HudPresetName;
  description: string;
  elements: SerializedHudElementConfig[];
}

export const HUD_LAYOUT_PRESETS: Record<HudPresetName, HudLayoutPreset> = {
  Default: {
    name: 'Default',
    description: 'Balanced arrangement with FPS, Ping, and Coordinates top-left.',
    elements: [
      { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_ping', enabled: true, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_coords', enabled: true, x: 10, y: 50, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_memory', enabled: false, x: 10, y: 70, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_session', enabled: false, x: 10, y: 90, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_keystrokes', enabled: false, x: 10, y: 120, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_cps', enabled: false, x: 10, y: 200, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_perf_telemetry', enabled: false, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
    ],
  },
  Minimal: {
    name: 'Minimal',
    description: 'Uncluttered view with only small FPS counter and no background.',
    elements: [
      { id: 'hud_fps', enabled: true, x: 8, y: 8, scale: 0.85, anchor: 'TOP_LEFT', zIndex: 1, style: { showBackground: false } },
      { id: 'hud_ping', enabled: false, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_coords', enabled: false, x: 10, y: 50, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_memory', enabled: false, x: 10, y: 70, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_session', enabled: false, x: 10, y: 90, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_keystrokes', enabled: false, x: 10, y: 120, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_cps', enabled: false, x: 10, y: 200, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_perf_telemetry', enabled: false, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
    ],
  },
  PvP: {
    name: 'PvP',
    description: 'Optimized competitive HUD with Keystrokes, CPS, FPS, and Ping.',
    elements: [
      { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_ping', enabled: true, x: 10, y: 28, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_coords', enabled: true, x: 10, y: 46, scale: 0.95, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_cps', enabled: true, x: 10, y: 110, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 2 },
      { id: 'hud_keystrokes', enabled: true, x: 10, y: 135, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 2 },
      { id: 'hud_memory', enabled: false, x: 10, y: 70, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_session', enabled: false, x: 10, y: 90, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_perf_telemetry', enabled: false, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
    ],
  },
  Performance: {
    name: 'Performance',
    description: 'Full telemetry layout with FPS, 1% Low, Frame Time, and JVM memory allocation.',
    elements: [
      { id: 'hud_perf_telemetry', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 2 },
      { id: 'hud_memory', enabled: true, x: 10, y: 35, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 2 },
      { id: 'hud_fps', enabled: true, x: 10, y: 10, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_ping', enabled: true, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_coords', enabled: false, x: 10, y: 50, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_session', enabled: true, x: 10, y: 50, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_keystrokes', enabled: false, x: 10, y: 120, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_cps', enabled: false, x: 10, y: 200, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
    ],
  },
  Streamer: {
    name: 'Streamer',
    description: 'Clean placement shielding coordinates and sensitive server info.',
    elements: [
      { id: 'hud_fps', enabled: true, x: 15, y: 15, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
      { id: 'hud_session', enabled: true, x: 15, y: 35, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
      { id: 'hud_keystrokes', enabled: true, x: 20, y: 20, scale: 1.1, anchor: 'BOTTOM_RIGHT', zIndex: 2 },
      { id: 'hud_cps', enabled: false, x: 10, y: 200, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_coords', enabled: false, x: 10, y: 50, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 }, // Hidden for privacy
      { id: 'hud_ping', enabled: false, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_memory', enabled: false, x: 10, y: 70, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_perf_telemetry', enabled: false, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
    ],
  },
  Clean: {
    name: 'Clean',
    description: 'Subtle translucent elements tucked into top and bottom corners.',
    elements: [
      { id: 'hud_fps', enabled: true, x: 12, y: 12, scale: 0.95, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_coords', enabled: true, x: 12, y: 12, scale: 0.95, anchor: 'BOTTOM_LEFT', zIndex: 1 },
      { id: 'hud_ping', enabled: false, x: 10, y: 30, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_memory', enabled: false, x: 10, y: 70, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_session', enabled: false, x: 10, y: 90, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_keystrokes', enabled: false, x: 10, y: 120, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_cps', enabled: false, x: 10, y: 200, scale: 1.0, anchor: 'TOP_LEFT', zIndex: 1 },
      { id: 'hud_perf_telemetry', enabled: false, x: 10, y: 10, scale: 1.0, anchor: 'TOP_RIGHT', zIndex: 1 },
    ],
  },
};
