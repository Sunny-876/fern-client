export type SettingType =
  | 'boolean'
  | 'integer'
  | 'float'
  | 'enum'
  | 'color'
  | 'keybind'
  | 'string'
  | 'BOOLEAN'
  | 'INTEGER'
  | 'FLOAT'
  | 'ENUM'
  | 'COLOR'
  | 'KEYBIND'
  | 'STRING';

export type SettingChangeListener<T> = (newValue: T, oldValue: T) => void;

export abstract class Setting<T> {
  protected _value: T;
  private changeListeners: Set<SettingChangeListener<T>> = new Set();

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly type: SettingType,
    public readonly defaultValue: T
  ) {
    this._value = this.cloneValue(defaultValue);
  }

  public get value(): T {
    return this._value;
  }

  public set value(val: T) {
    this.setValue(val);
  }

  public set(val: T): boolean {
    return this.setValue(val);
  }

  public setValue(val: T): boolean {
    const validated = this.validate(val);
    if (this._value === validated) return false;

    const old = this._value;
    this._value = validated;
    this.notifyChange(this._value, old);
    return true;
  }

  public reset(): void {
    this.setValue(this.defaultValue);
  }

  public onChange(listener: SettingChangeListener<T>): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(newVal: T, oldVal: T): void {
    for (const listener of this.changeListeners) {
      try {
        listener(newVal, oldVal);
      } catch (err) {
        console.error(`[Setting:${this.id}] Listener error:`, err);
      }
    }
  }

  public abstract validate(val: unknown): T;

  public serialize(): any {
    return this._value;
  }

  public deserialize(serialized: any): boolean {
    if (serialized === undefined || serialized === null) return false;
    return this.setValue(serialized);
  }

  protected cloneValue(val: T): T {
    return typeof val === 'object' && val !== null ? JSON.parse(JSON.stringify(val)) : val;
  }
}

// 1. Boolean Setting
export class BooleanSetting extends Setting<boolean> {
  constructor(id: string, name: string, description: string, defaultValue: boolean) {
    super(id, name, description, 'BOOLEAN', defaultValue);
  }

  public validate(val: unknown): boolean {
    return Boolean(val);
  }

  public toggle(): boolean {
    const next = !this.value;
    this.setValue(next);
    return next;
  }
}

// 2. Number Settings (Integer & Float)
export interface NumberBounds {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export class IntegerSetting extends Setting<number> {
  public readonly min: number;
  public readonly max: number;
  public readonly step: number;
  public readonly unit?: string;

  constructor(
    id: string,
    name: string,
    description: string,
    defaultValue: number,
    bounds: NumberBounds = {}
  ) {
    super(id, name, description, 'INTEGER', Math.round(defaultValue));
    this.min = bounds.min ?? Number.MIN_SAFE_INTEGER;
    this.max = bounds.max ?? Number.MAX_SAFE_INTEGER;
    this.step = bounds.step ?? 1;
    this.unit = bounds.unit;
    this._value = this.validate(defaultValue);
  }

  public validate(val: unknown): number {
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    if (isNaN(num)) return this._value ?? this.defaultValue;

    let stepped = num;
    if (this.step > 1) {
      stepped = Math.round(num / this.step) * this.step;
    }

    const clamped = Math.min(this.max, Math.max(this.min, stepped));
    return clamped;
  }
}

export class FloatSetting extends Setting<number> {
  public readonly min: number;
  public readonly max: number;
  public readonly step: number;
  public readonly unit?: string;

  constructor(
    id: string,
    name: string,
    description: string,
    defaultValue: number,
    bounds: NumberBounds = {}
  ) {
    super(id, name, description, 'FLOAT', defaultValue);
    this.min = bounds.min ?? -Infinity;
    this.max = bounds.max ?? Infinity;
    this.step = bounds.step ?? 0.05;
    this.unit = bounds.unit;
    this._value = this.validate(defaultValue);
  }

  public validate(val: unknown): number {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num)) return this._value ?? this.defaultValue;

    let stepped = num;
    if (this.step > 0) {
      const precision = Math.round(1 / this.step);
      stepped = Math.round(num * precision) / precision;
    }

    const clamped = Math.min(this.max, Math.max(this.min, stepped));
    return Number(clamped.toFixed(4));
  }
}

// 3. Enum Setting
export class EnumSetting<T extends string> extends Setting<T> {
  public readonly options: readonly T[];

  constructor(
    id: string,
    name: string,
    description: string,
    defaultValue: T,
    options: readonly T[]
  ) {
    super(id, name, description, 'ENUM', defaultValue);
    this.options = options;
    this._value = this.validate(defaultValue);
  }

  public getOptions(): readonly T[] {
    return this.options;
  }

  public validate(val: unknown): T {
    if (typeof val === 'string' && (this.options as readonly string[]).includes(val)) {
      return val as T;
    }
    return this._value ?? this.defaultValue;
  }
}

// 4. Color Setting (Hex format, e.g. #22c55e or #fff or rgba(...))
export class ColorSetting extends Setting<string> {
  constructor(id: string, name: string, description: string, defaultValue: string) {
    super(id, name, description, 'COLOR', defaultValue);
    this._value = this.validate(defaultValue);
  }

  public validate(val: unknown): string {
    if (typeof val !== 'string') return this._value ?? this.defaultValue;
    const str = val.trim();

    // 3-char hex -> 6-char hex
    const shortHex = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
    if (shortHex.test(str)) {
      return str.replace(shortHex, '#$1$1$2$2$3$3').toLowerCase();
    }

    // 6 or 8-char hex
    if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(str)) {
      return str.toLowerCase();
    }

    // CSS rgba/rgb format
    if (/^rgba?\([\d\s,.]+\)$/i.test(str)) {
      return str;
    }

    return this._value ?? this.defaultValue;
  }
}

// 5. Keybind Setting
export class KeybindSetting extends Setting<string> {
  constructor(id: string, name: string, description: string, defaultKey: string) {
    super(id, name, description, 'KEYBIND', defaultKey);
    this._value = this.validate(defaultKey);
  }

  public validate(val: unknown): string {
    if (typeof val === 'string' && val.trim().length > 0) {
      const trimmed = val.trim();
      if (/^f\d{1,2}$/i.test(trimmed)) {
        return trimmed.toUpperCase();
      }
      return trimmed;
    }
    return 'None';
  }
}

// 6. String Setting
export class StringSetting extends Setting<string> {
  public readonly maxLength: number;

  constructor(
    id: string,
    name: string,
    description: string,
    defaultValue: string,
    maxLength: number = 256
  ) {
    super(id, name, description, 'STRING', defaultValue);
    this.maxLength = maxLength;
    this._value = this.validate(defaultValue);
  }

  public validate(val: unknown): string {
    if (typeof val === 'string') {
      return val.slice(0, this.maxLength);
    }
    return this._value ?? this.defaultValue;
  }
}
