export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0.0 - 1.0
}

export class ColorPicker {
  /**
   * Validates whether a given string is a supported color format (HEX, RGB, RGBA).
   */
  public static isValidColor(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return true;
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/i.test(trimmed)) return true;
    if (/^hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+\s*)?\)$/i.test(trimmed)) return true;
    if (['transparent', 'white', 'black'].includes(trimmed.toLowerCase())) return true;
    return false;
  }

  /**
   * Parses any valid color string into an RGBA object.
   */
  public static parseToRgba(color: string): RgbaColor {
    const trimmed = color.trim().toLowerCase();

    // 1. Hex parsing
    if (trimmed.startsWith('#')) {
      const hex = trimmed.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
          a: 1.0,
        };
      }
      if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          a: 1.0,
        };
      }
      if (hex.length === 8) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          a: Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100,
        };
      }
    }

    // 2. RGB/RGBA parsing
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (rgbMatch) {
      return {
        r: Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
        g: Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
        b: Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
        a: rgbMatch[4] !== undefined ? Math.min(1.0, Math.max(0.0, parseFloat(rgbMatch[4]))) : 1.0,
      };
    }

    if (trimmed === 'transparent') {
      return { r: 0, g: 0, b: 0, a: 0.0 };
    }

    // Fallback default white
    return { r: 255, g: 255, b: 255, a: 1.0 };
  }

  /**
   * Formats RGBA to hex string (#RRGGBB or #RRGGBBAA).
   */
  public static toHex(rgba: RgbaColor, includeAlpha = false): string {
    const pad = (n: number) => n.toString(16).padStart(2, '0');
    const r = pad(Math.min(255, Math.max(0, Math.round(rgba.r))));
    const g = pad(Math.min(255, Math.max(0, Math.round(rgba.g))));
    const b = pad(Math.min(255, Math.max(0, Math.round(rgba.b))));

    if (includeAlpha || rgba.a < 1.0) {
      const a = pad(Math.min(255, Math.max(0, Math.round(rgba.a * 255))));
      return `#${r}${g}${b}${a}`;
    }
    return `#${r}${g}${b}`;
  }

  /**
   * Formats RGBA to css string rgba(r, g, b, a).
   */
  public static toRgbaString(rgba: RgbaColor): string {
    return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
  }

  /**
   * Sets transparency/alpha on any color string without changing hue.
   */
  public static withAlpha(color: string, alpha: number): string {
    const parsed = this.parseToRgba(color);
    parsed.a = Math.min(1.0, Math.max(0.0, alpha));
    return this.toRgbaString(parsed);
  }

  /**
   * Generates a linear gradient representation between two colors.
   */
  public static createLinearGradient(startColor: string, endColor: string, angleDeg = 135): string {
    return `linear-gradient(${angleDeg}deg, ${startColor} 0%, ${endColor} 100%)`;
  }
}
