import { ColorPicker } from './ColorPicker';

export interface FernTheme {
  id: string;
  name: string;
  isCustom?: boolean;
  background: string;
  surface: string;
  surfaceHover: string;
  panel: string;
  text: string;
  secondaryText: string;
  accent: string;
  accentHover: string;
  border: string;
  borderFocus: string;
  success: string;
  warning: string;
  error: string;
}

export const OFFICIAL_FERN_DARK_THEME: FernTheme = {
  id: 'fern_dark',
  name: 'Fern Dark',
  background: '#090d16',
  surface: '#111827',
  surfaceHover: '#1f2937',
  panel: '#151e2e',
  text: '#f8fafc',
  secondaryText: '#94a3b8',
  accent: '#22c55e',
  accentHover: '#16a34a',
  border: 'rgba(255, 255, 255, 0.08)',
  borderFocus: 'rgba(34, 197, 94, 0.5)',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
};

export const FERN_LIGHT_THEME: FernTheme = {
  id: 'fern_light',
  name: 'Fern Light',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',
  panel: '#e2e8f0',
  text: '#0f172a',
  secondaryText: '#64748b',
  accent: '#16a34a',
  accentHover: '#15803d',
  border: 'rgba(0, 0, 0, 0.1)',
  borderFocus: 'rgba(22, 163, 74, 0.5)',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
};

export const HIGH_CONTRAST_THEME: FernTheme = {
  id: 'high_contrast',
  name: 'High Contrast',
  background: '#000000',
  surface: '#050505',
  surfaceHover: '#1a1a1a',
  panel: '#000000',
  text: '#ffffff',
  secondaryText: '#ffff00',
  accent: '#ffff00', // High-visibility yellow
  accentHover: '#ffd700',
  border: '#ffffff',
  borderFocus: '#ffff00',
  success: '#00ff00',
  warning: '#ffff00',
  error: '#ff0000',
};

export const OLED_MIDNIGHT_THEME: FernTheme = {
  id: 'oled_midnight',
  name: 'OLED Midnight',
  background: '#000000',
  surface: '#080808',
  surfaceHover: '#121212',
  panel: '#0d0d0d',
  text: '#ffffff',
  secondaryText: '#888888',
  accent: '#22c55e',
  accentHover: '#16a34a',
  border: 'rgba(255, 255, 255, 0.12)',
  borderFocus: 'rgba(34, 197, 94, 0.6)',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
};

export class ThemeManager {
  private themes: Map<string, FernTheme> = new Map();
  private activeThemeId = 'fern_dark';

  constructor() {
    this.registerTheme(OFFICIAL_FERN_DARK_THEME);
    this.registerTheme(FERN_LIGHT_THEME);
    this.registerTheme(HIGH_CONTRAST_THEME);
    this.registerTheme(OLED_MIDNIGHT_THEME);
  }

  public registerTheme(theme: FernTheme): boolean {
    if (!this.validateTheme(theme).valid) return false;
    this.themes.set(theme.id, theme);
    return true;
  }

  public getActiveTheme(): FernTheme {
    return this.themes.get(this.activeThemeId) || OFFICIAL_FERN_DARK_THEME;
  }

  public getActiveThemeId(): string {
    return this.activeThemeId;
  }

  public setTheme(id: string): boolean {
    if (!this.themes.has(id)) return false;
    this.activeThemeId = id;
    return true;
  }

  public getTheme(id: string): FernTheme | undefined {
    return this.themes.get(id);
  }

  public getAllThemes(): FernTheme[] {
    return Array.from(this.themes.values());
  }

  public createCustomTheme(theme: Omit<FernTheme, 'isCustom'>): { success: boolean; error?: string } {
    const fullTheme: FernTheme = {
      ...theme,
      isCustom: true,
    };

    const val = this.validateTheme(fullTheme);
    if (!val.valid) {
      return { success: false, error: val.error };
    }

    this.themes.set(fullTheme.id, fullTheme);
    return { success: true };
  }

  public deleteCustomTheme(id: string): boolean {
    const theme = this.themes.get(id);
    if (!theme || !theme.isCustom) return false;

    if (this.activeThemeId === id) {
      this.activeThemeId = 'fern_dark';
    }
    return this.themes.delete(id);
  }

  public validateTheme(theme: any): { valid: boolean; error?: string } {
    if (!theme || typeof theme !== 'object') {
      return { valid: false, error: 'Theme must be an object' };
    }

    const requiredFields = [
      'id',
      'name',
      'background',
      'surface',
      'surfaceHover',
      'panel',
      'text',
      'secondaryText',
      'accent',
      'accentHover',
      'border',
      'borderFocus',
      'success',
      'warning',
      'error',
    ];

    for (const f of requiredFields) {
      if (!theme[f] || typeof theme[f] !== 'string') {
        return { valid: false, error: `Missing or invalid theme property: "${f}"` };
      }
      if (f !== 'id' && f !== 'name') {
        if (!ColorPicker.isValidColor(theme[f])) {
          return { valid: false, error: `Invalid color format for token "${f}": "${theme[f]}"` };
        }
      }
    }

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(theme.id)) {
      return {
        valid: false,
        error: 'Theme ID must only contain alphanumeric characters, underscores, or dashes (max 64 chars)',
      };
    }

    return { valid: true };
  }

  public exportTheme(id: string): string | null {
    const theme = this.themes.get(id);
    if (!theme) return null;
    return JSON.stringify({ version: 1, exportedAt: Date.now(), theme }, null, 2);
  }

  public importTheme(jsonStr: string): { success: boolean; theme?: FernTheme; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const themeData = parsed.theme || parsed;

      const validation = this.validateTheme(themeData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const imported: FernTheme = {
        ...themeData,
        isCustom: true,
      };

      this.themes.set(imported.id, imported);
      return { success: true, theme: imported };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public resetThemes(): void {
    const custom = Array.from(this.themes.values()).filter((t) => t.isCustom);
    for (const c of custom) {
      this.themes.delete(c.id);
    }
    this.activeThemeId = 'fern_dark';
  }
}
