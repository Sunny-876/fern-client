import { describe, it, expect } from 'vitest';
import { ThemeManager, FernTheme } from '../client/src/theme/ThemeManager';
import { ColorPicker } from '../client/src/theme/ColorPicker';

describe('Theme System & ColorPicker - Deep Customization & Accessibility', () => {
  it('loads built-in themes including High Contrast and OLED', () => {
    const manager = new ThemeManager();
    const themes = manager.getAllThemes();

    expect(themes.length).toBeGreaterThanOrEqual(4);
    const themeIds = themes.map((t) => t.id);
    expect(themeIds).toContain('fern_dark');
    expect(themeIds).toContain('fern_light');
    expect(themeIds).toContain('high_contrast');
    expect(themeIds).toContain('oled_midnight');

    // Switch to High Contrast
    expect(manager.setTheme('high_contrast')).toBe(true);
    expect(manager.getActiveTheme().id).toBe('high_contrast');
    expect(manager.getActiveTheme().text).toBe('#ffffff');
    expect(manager.getActiveTheme().accent).toBe('#ffff00');
  });

  it('validates and creates custom themes', () => {
    const manager = new ThemeManager();

    const validCustomTheme = {
      id: 'custom_emerald',
      name: 'Emerald Dream',
      background: '#052e16',
      surface: '#064e3b',
      surfaceHover: '#065f46',
      panel: '#022c22',
      text: '#ecfdf5',
      secondaryText: '#a7f3d0',
      accent: '#10b981',
      accentHover: '#059669',
      border: 'rgba(255, 255, 255, 0.1)',
      borderFocus: 'rgba(16, 185, 129, 0.6)',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    };

    const result = manager.createCustomTheme(validCustomTheme);
    expect(result.success).toBe(true);
    expect(manager.getTheme('custom_emerald')).toBeDefined();

    // Invalid theme missing required tokens
    const invalidTheme = {
      id: 'broken',
      name: 'Broken Theme',
      background: 'not-a-color',
    };
    const invalidRes = manager.createCustomTheme(invalidTheme as any);
    expect(invalidRes.success).toBe(false);
  });

  it('exports and imports theme JSON safely', () => {
    const manager = new ThemeManager();
    const json = manager.exportTheme('fern_dark');
    expect(json).toContain('"Fern Dark"');

    // Import into fresh manager
    const freshManager = new ThemeManager();
    const customExport = JSON.stringify({
      theme: {
        id: 'imported_amber',
        name: 'Imported Amber',
        background: '#451a03',
        surface: '#78350f',
        surfaceHover: '#92400e',
        panel: '#290f02',
        text: '#fffbeb',
        secondaryText: '#fde68a',
        accent: '#f59e0b',
        accentHover: '#d97706',
        border: 'rgba(255, 255, 255, 0.1)',
        borderFocus: 'rgba(245, 158, 11, 0.6)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    });

    const res = freshManager.importTheme(customExport);
    expect(res.success).toBe(true);
    expect(freshManager.getTheme('imported_amber')).toBeDefined();
  });

  it('parses and manipulates colors with ColorPicker', () => {
    expect(ColorPicker.isValidColor('#22c55e')).toBe(true);
    expect(ColorPicker.isValidColor('rgba(34, 197, 94, 0.5)')).toBe(true);
    expect(ColorPicker.isValidColor('invalid-color-string')).toBe(false);

    // Parse hex
    const rgba = ColorPicker.parseToRgba('#ffffff');
    expect(rgba.r).toBe(255);
    expect(rgba.g).toBe(255);
    expect(rgba.b).toBe(255);
    expect(rgba.a).toBe(1.0);

    // Apply alpha
    const transparent = ColorPicker.withAlpha('#000000', 0.5);
    expect(transparent).toBe('rgba(0, 0, 0, 0.5)');

    // Gradient
    const grad = ColorPicker.createLinearGradient('#22c55e', '#15803d');
    expect(grad).toContain('linear-gradient(135deg, #22c55e 0%, #15803d 100%)');
  });
});
