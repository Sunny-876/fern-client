export interface FernFontDefinition {
  id: string;
  name: string;
  fontFamily: string;
  monospace: boolean;
  pixelated: boolean;
  averageCharWidth: number; // Approximate baseline for fast cached layouts
  lineHeight: number;
}

export const SUPPORTED_FONTS: Record<string, FernFontDefinition> = {
  fern_default: {
    id: 'fern_default',
    name: 'Fern Sans',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    monospace: false,
    pixelated: false,
    averageCharWidth: 7.2,
    lineHeight: 14,
  },
  minecraft_classic: {
    id: 'minecraft_classic',
    name: 'Minecraft Classic',
    fontFamily: '"Minecraftia", "Minecraft", monospace',
    monospace: false,
    pixelated: true,
    averageCharWidth: 6.0,
    lineHeight: 10,
  },
  minecraft_modern: {
    id: 'minecraft_modern',
    name: 'Minecraft Modern',
    fontFamily: '"Minecraft Seven", "Mojangles", sans-serif',
    monospace: false,
    pixelated: true,
    averageCharWidth: 6.5,
    lineHeight: 12,
  },
  system_mono: {
    id: 'system_mono',
    name: 'Monospace',
    fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
    monospace: true,
    pixelated: false,
    averageCharWidth: 8.0,
    lineHeight: 14,
  },
};

export class FontManager {
  private fonts: Map<string, FernFontDefinition> = new Map();
  private activeFontId = 'fern_default';
  // Fast measurement cache: key = `${fontId}_${fontSize}_${text}` -> width
  private textWidthCache: Map<string, number> = new Map();
  private maxCacheSize = 1000;

  constructor() {
    for (const font of Object.values(SUPPORTED_FONTS)) {
      this.fonts.set(font.id, font);
    }
  }

  public getActiveFont(): FernFontDefinition {
    return this.fonts.get(this.activeFontId) || SUPPORTED_FONTS.fern_default;
  }

  public setFont(fontId: string): boolean {
    if (!this.fonts.has(fontId)) return false;
    this.activeFontId = fontId;
    return true;
  }

  public getAllFonts(): FernFontDefinition[] {
    return Array.from(this.fonts.values());
  }

  /**
   * Fast, zero-allocation text width measurement with bounded caching.
   */
  public measureTextWidth(text: string, fontSize = 10, fontId = this.activeFontId): number {
    if (!text) return 0;
    const cacheKey = `${fontId}_${fontSize}_${text}`;
    const cached = this.textWidthCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const fontDef = this.fonts.get(fontId) || SUPPORTED_FONTS.fern_default;
    // Fast proportional calculation based on font scale
    const scale = fontSize / 10;
    const width = Math.round(text.length * fontDef.averageCharWidth * scale);

    if (this.textWidthCache.size >= this.maxCacheSize) {
      this.textWidthCache.clear();
    }
    this.textWidthCache.set(cacheKey, width);
    return width;
  }

  public clearCache(): void {
    this.textWidthCache.clear();
  }
}
