import { describe, it, expect, vi } from 'vitest';
import {
  BooleanSetting,
  IntegerSetting,
  FloatSetting,
  EnumSetting,
  ColorSetting,
  KeybindSetting,
  StringSetting,
} from '../client/src/settings/Setting';

describe('Settings System - Type Safety, Validation & Serialization', () => {
  it('handles BooleanSetting', () => {
    const setting = new BooleanSetting('test_bool', 'Test Bool', 'Description', true);
    expect(setting.value).toBe(true);
    expect(setting.type).toBe('BOOLEAN');

    const listener = vi.fn();
    setting.onChange(listener);

    setting.setValue(false);
    expect(setting.value).toBe(false);
    expect(listener).toHaveBeenCalledWith(false, true);

    expect(setting.serialize()).toBe(false);
    setting.deserialize(true);
    expect(setting.value).toBe(true);

    // Reset to default
    setting.setValue(false);
    setting.reset();
    expect(setting.value).toBe(true);
  });

  it('handles IntegerSetting with bounds clamping and step rounding', () => {
    const setting = new IntegerSetting('fps_limit', 'FPS Limit', 'Max FPS', 60, {
      min: 0,
      max: 240,
      step: 10,
    });

    expect(setting.value).toBe(60);

    // Test bounds
    setting.setValue(300);
    expect(setting.value).toBe(240); // clamped to max

    setting.setValue(-50);
    expect(setting.value).toBe(0); // clamped to min

    // Test step snapping
    setting.setValue(67);
    expect(setting.value).toBe(70);

    // Serialization
    expect(setting.serialize()).toBe(70);
    setting.deserialize(120);
    expect(setting.value).toBe(120);
  });

  it('handles FloatSetting with precision rounding', () => {
    const setting = new FloatSetting('scale', 'Scale', 'Element scale', 1.0, {
      min: 0.5,
      max: 2.0,
      step: 0.05,
    });

    setting.setValue(1.2345);
    expect(setting.value).toBe(1.25);

    setting.setValue(5.0);
    expect(setting.value).toBe(2.0);

    setting.setValue(0.1);
    expect(setting.value).toBe(0.5);
  });

  it('handles EnumSetting with option enforcement', () => {
    const setting = new EnumSetting(
      'profile',
      'Profile',
      'Preset',
      'balanced',
      ['potato', 'balanced', 'quality'] as const
    );

    expect(setting.value).toBe('balanced');
    setting.setValue('quality');
    expect(setting.value).toBe('quality');

    // Invalid option ignored
    setting.setValue('ultra' as any);
    expect(setting.value).toBe('quality');

    expect(setting.getOptions()).toEqual(['potato', 'balanced', 'quality']);
  });

  it('handles ColorSetting with hex normalization', () => {
    const setting = new ColorSetting('color', 'Color', 'Color', '#22c55e');
    expect(setting.value).toBe('#22c55e');

    setting.setValue('#fff');
    expect(setting.value).toBe('#ffffff');

    setting.setValue('rgba(255, 0, 0, 0.5)');
    expect(setting.value).toBe('rgba(255, 0, 0, 0.5)');

    // Invalid string leaves value unchanged
    setting.setValue('not-a-color');
    expect(setting.value).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('handles KeybindSetting and StringSetting', () => {
    const keySetting = new KeybindSetting('open_menu', 'Menu Key', 'Key', 'Right Shift');
    expect(keySetting.value).toBe('Right Shift');

    keySetting.setValue('f8');
    expect(keySetting.value).toBe('F8');

    const strSetting = new StringSetting('prefix', 'Prefix', 'Prefix', 'FPS:');
    strSetting.setValue('Frames:');
    expect(strSetting.value).toBe('Frames:');
    expect(strSetting.serialize()).toBe('Frames:');
  });
});
