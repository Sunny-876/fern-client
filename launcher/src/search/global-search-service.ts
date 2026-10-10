export type SearchResultCategory =
  | 'installation'
  | 'mod'
  | 'module'
  | 'hud'
  | 'setting'
  | 'theme'
  | 'profile'
  | 'workspace'
  | 'docs';

export interface SearchResultAction {
  type: 'navigate' | 'select' | 'toggle' | 'open_doc';
  target: string;
  payload?: any;
}

export interface SearchResultItem {
  id: string;
  title: string;
  description: string;
  category: SearchResultCategory;
  score: number;
  action: SearchResultAction;
  shortcutHint?: string;
}

export interface SearchIndexEntry {
  id: string;
  title: string;
  description: string;
  category: SearchResultCategory;
  keywords: string[];
  action: SearchResultAction;
}

export const STATIC_SEARCH_ENTRIES: SearchIndexEntry[] = [
  // Modules
  {
    id: 'mod-fps',
    title: 'FPS Display',
    description: 'Displays current frame rate with custom prefix and color styling.',
    category: 'module',
    keywords: ['fps', 'frames', 'performance', 'counter'],
    action: { type: 'navigate', target: 'modules/fps_display' },
  },
  {
    id: 'mod-coords',
    title: 'Coordinates HUD',
    description: 'Real-time player X, Y, Z coordinates and Nether conversion ratio.',
    category: 'module',
    keywords: ['coords', 'coordinates', 'xyz', 'position', 'location', 'nether'],
    action: { type: 'navigate', target: 'modules/coordinates_display' },
  },
  {
    id: 'mod-ping',
    title: 'Ping Display',
    description: 'Displays network latency to the connected multiplayer server in milliseconds.',
    category: 'module',
    keywords: ['ping', 'latency', 'ms', 'connection', 'network'],
    action: { type: 'navigate', target: 'modules/ping_display' },
  },
  {
    id: 'mod-keystrokes',
    title: 'Keystrokes Overlay',
    description: 'Shows WASD movement keys, sprint, jump, and mouse clicks on screen.',
    category: 'module',
    keywords: ['keystrokes', 'wasd', 'keys', 'input', 'clicks'],
    action: { type: 'navigate', target: 'modules/keystrokes' },
  },
  {
    id: 'mod-cps',
    title: 'CPS Counter',
    description: 'Real-time left and right mouse click frequency counter.',
    category: 'module',
    keywords: ['cps', 'clicks', 'click speed', 'counter'],
    action: { type: 'navigate', target: 'modules/cps_display' },
  },
  {
    id: 'mod-session',
    title: 'Session Timer',
    description: 'Tracks elapsed gameplay duration for the current Minecraft session.',
    category: 'module',
    keywords: ['session', 'timer', 'time', 'duration', 'stopwatch'],
    action: { type: 'navigate', target: 'modules/session_timer' },
  },

  // HUD Elements
  {
    id: 'hud-editor',
    title: 'HUD Layout Editor',
    description: 'Interactive visual canvas to move, snap, scale, and anchor HUD widgets.',
    category: 'hud',
    keywords: ['hud', 'editor', 'layout', 'canvas', 'drag', 'widgets', 'anchor'],
    action: { type: 'navigate', target: 'hud/editor' },
  },

  // Settings
  {
    id: 'setting-memory',
    title: 'Memory Allocation (RAM)',
    description: 'Configure minimum and maximum RAM for the Minecraft Java runtime.',
    category: 'setting',
    keywords: ['memory', 'ram', 'allocation', 'java', 'heap', 'mb', 'gb'],
    action: { type: 'navigate', target: 'settings/memory' },
  },
  {
    id: 'setting-java',
    title: 'Java Runtime Manager',
    description: 'Select installed JDK/JRE paths or let Fern manage automatic runtimes.',
    category: 'setting',
    keywords: ['java', 'jdk', 'jre', 'runtime', 'path', 'version'],
    action: { type: 'navigate', target: 'settings/java' },
  },
  {
    id: 'setting-accessibility',
    title: 'Accessibility & Motion Settings',
    description: 'Configure high contrast, reduced motion, and UI text scaling.',
    category: 'setting',
    keywords: ['accessibility', 'reduced motion', 'contrast', 'text scale', 'fonts'],
    action: { type: 'navigate', target: 'settings/accessibility' },
  },

  // Themes
  {
    id: 'theme-fern-dark',
    title: 'Fern Dark Theme',
    description: 'Deep forest green slate with crisp minimal borders.',
    category: 'theme',
    keywords: ['theme', 'dark', 'fern', 'green'],
    action: { type: 'select', target: 'theme', payload: 'fern_dark' },
  },
  {
    id: 'theme-oled-midnight',
    title: 'OLED Midnight Theme',
    description: 'Pure black background with ultra-high contrast for OLED displays.',
    category: 'theme',
    keywords: ['theme', 'oled', 'black', 'contrast', 'midnight'],
    action: { type: 'select', target: 'theme', payload: 'oled_midnight' },
  },

  // Profiles
  {
    id: 'prof-minimal',
    title: 'Minimal Profile',
    description: 'Clean HUD layout with minimal distraction and standard latency.',
    category: 'profile',
    keywords: ['profile', 'minimal', 'clean', 'simple'],
    action: { type: 'select', target: 'profile', payload: 'minimal' },
  },
  {
    id: 'prof-performance',
    title: 'Performance Profile',
    description: 'Telemetry HUD, potato graphics engine, and maximum FPS settings.',
    category: 'profile',
    keywords: ['profile', 'performance', 'fps', 'potato', 'speed'],
    action: { type: 'select', target: 'profile', payload: 'performance' },
  },
  {
    id: 'prof-streaming',
    title: 'Streaming & Creator Profile',
    description: 'Coordinates hidden for privacy with clean broadcast-ready widgets.',
    category: 'profile',
    keywords: ['profile', 'streaming', 'streamer', 'recording', 'privacy'],
    action: { type: 'select', target: 'profile', payload: 'streaming' },
  },

  // Documentation
  {
    id: 'doc-shortcuts',
    title: 'Keyboard Shortcuts Reference',
    description: 'View global hotkeys: Ctrl+K for search, Right Shift for Fern menu, F2 for screenshots.',
    category: 'docs',
    keywords: ['shortcuts', 'hotkeys', 'keybinds', 'ctrl+k', 'right shift', 'help'],
    action: { type: 'open_doc', target: 'docs/shortcuts' },
  },
  {
    id: 'doc-replay-guide',
    title: 'Replay Mod & Creator Architecture',
    description: 'Learn how Fern Client integrates with Replay Mod and parses .mcpr recordings.',
    category: 'docs',
    keywords: ['replay', 'recordings', 'mcpr', 'cinematic', 'creator', 'docs'],
    action: { type: 'open_doc', target: 'docs/replay' },
  },
  {
    id: 'doc-compatibility',
    title: 'Compatibility Matrix & Java Requirements',
    description: 'Official Java LTS versions required for Minecraft 1.21, 1.20, and 1.16.',
    category: 'docs',
    keywords: ['compatibility', 'java requirements', 'lts', 'matrix', 'docs'],
    action: { type: 'open_doc', target: 'docs/compatibility' },
  },
];

export class GlobalSearchService {
  private dynamicEntries: SearchIndexEntry[] = [];

  /**
   * Sets dynamic entries from live managers (installations, installed mods, workspaces).
   */
  public updateDynamicEntries(entries: SearchIndexEntry[]): void {
    this.dynamicEntries = entries;
  }

  /**
   * Executes local scoring search across static index and dynamic entries.
   * Completely local with zero external network requests.
   */
  public search(query: string, maxResults = 15): SearchResultItem[] {
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) return [];

    const allEntries = [...STATIC_SEARCH_ENTRIES, ...this.dynamicEntries];
    const scored: SearchResultItem[] = [];

    for (const item of allEntries) {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();

      // Exact title match
      if (titleLower === cleanQ) {
        score += 100;
      }
      // Title starts with query
      else if (titleLower.startsWith(cleanQ)) {
        score += 60;
      }
      // Title contains query
      else if (titleLower.includes(cleanQ)) {
        score += 40;
      }

      // Keyword matches
      for (const kw of item.keywords) {
        const kwLower = kw.toLowerCase();
        if (kwLower === cleanQ) {
          score += 50;
        } else if (kwLower.startsWith(cleanQ)) {
          score += 30;
        } else if (kwLower.includes(cleanQ)) {
          score += 15;
        }
      }

      // Description contains query
      if (descLower.includes(cleanQ)) {
        score += 10;
      }

      if (score > 0) {
        scored.push({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          score,
          action: item.action,
        });
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, maxResults);
  }
}
