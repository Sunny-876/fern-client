import { EventBus } from '../events/EventBus';
import { KeyPressEvent, MouseInputEvent } from '../events/ClientEvents';

export interface KeybindAction {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  key: string; // e.g. 'Right Shift', 'Ctrl + M', 'F8', 'Mouse0', 'None'
  readonly defaultKey: string;
  readonly onTrigger: () => void;
  readonly allowWhenMenuOpen?: boolean;
}

export interface KeybindConflict {
  key: string;
  actionIds: string[];
  actionNames: string[];
}

export class KeybindManager {
  private actions: Map<string, KeybindAction> = new Map();

  constructor(private eventBus: EventBus) {
    this.eventBus.on('key_press', (evt) => {
      this.handleKeyPress(evt);
    });

    this.eventBus.on('mouse_input', (evt) => {
      this.handleMouseInput(evt);
    });
  }

  public registerAction(action: KeybindAction): void {
    this.actions.set(action.id, { ...action, key: this.normalizeKey(action.key) });
  }

  public unregisterAction(id: string): void {
    this.actions.delete(id);
  }

  public getAction(id: string): KeybindAction | undefined {
    return this.actions.get(id);
  }

  public getAllActions(): KeybindAction[] {
    return Array.from(this.actions.values());
  }

  public setKeybind(id: string, key: string): boolean {
    const action = this.actions.get(id);
    if (!action) return false;
    action.key = this.normalizeKey(key);
    return true;
  }

  public resetKeybind(id: string): boolean {
    const action = this.actions.get(id);
    if (!action) return false;
    action.key = action.defaultKey;
    return true;
  }

  /**
   * Checks for conflicts for a proposed key.
   */
  public getConflictDetails(proposedKey: string, excludeActionId?: string): {
    hasConflict: boolean;
    conflictingActions: KeybindAction[];
    warningText?: string;
  } {
    const norm = this.normalizeKey(proposedKey);
    if (norm === 'None') {
      return { hasConflict: false, conflictingActions: [] };
    }

    const matches: KeybindAction[] = [];
    for (const a of this.actions.values()) {
      if (a.id === excludeActionId) continue;
      if (this.normalizeKey(a.key) === norm) {
        matches.push(a);
      }
    }

    if (matches.length > 0) {
      const names = matches.map((m) => m.name).join(', ');
      return {
        hasConflict: true,
        conflictingActions: matches,
        warningText: `Keybind already used by: ${names}`,
      };
    }

    return { hasConflict: false, conflictingActions: [] };
  }

  /**
   * Detects duplicate / conflicting keybindings.
   */
  public detectConflicts(): KeybindConflict[] {
    const keyMap = new Map<string, { ids: string[]; names: string[] }>();
    for (const action of this.actions.values()) {
      if (!action.key || action.key.toLowerCase() === 'none') continue;
      const norm = this.normalizeKey(action.key);
      const entry = keyMap.get(norm) || { ids: [], names: [] };
      entry.ids.push(action.id);
      entry.names.push(action.name);
      keyMap.set(norm, entry);
    }

    const conflicts: KeybindConflict[] = [];
    for (const [key, data] of keyMap.entries()) {
      if (data.ids.length > 1) {
        conflicts.push({
          key,
          actionIds: data.ids,
          actionNames: data.names,
        });
      }
    }
    return conflicts;
  }

  private handleKeyPress(evt: KeyPressEvent): void {
    if (evt.action !== 'down') return;

    // Build combo string if modifiers are held
    const parts: string[] = [];
    if (evt.modifiers?.ctrl && evt.key.toLowerCase() !== 'control') parts.push('Ctrl');
    if (evt.modifiers?.shift && evt.key.toLowerCase() !== 'shift') parts.push('Shift');
    if (evt.modifiers?.alt && evt.key.toLowerCase() !== 'alt') parts.push('Alt');
    parts.push(this.formatKeyPart(evt.key));

    const comboKey = this.normalizeKey(parts.join(' + '));
    const rawKey = this.normalizeKey(evt.key);

    for (const action of this.actions.values()) {
      const actionKey = this.normalizeKey(action.key);
      // Match full combo or single key if no modifiers configured for this action
      if (actionKey === comboKey || (actionKey === rawKey && !actionKey.includes('+'))) {
        try {
          action.onTrigger();
        } catch (err) {
          console.error(`[KeybindManager] Error triggering action "${action.id}":`, err);
        }
      }
    }
  }

  private handleMouseInput(evt: MouseInputEvent): void {
    if (evt.action !== 'down') return;
    const buttonKey = `Mouse${evt.button}`;

    for (const action of this.actions.values()) {
      if (this.normalizeKey(action.key) === buttonKey) {
        try {
          action.onTrigger();
        } catch (err) {
          console.error(`[KeybindManager] Error triggering mouse action "${action.id}":`, err);
        }
      }
    }
  }

  private formatKeyPart(k: string): string {
    const trimmed = k.trim();
    if (/^f\d{1,2}$/i.test(trimmed)) return trimmed.toUpperCase();
    if (/^[a-zA-Z]$/.test(trimmed)) return trimmed.toUpperCase();
    return trimmed;
  }

  public normalizeKey(key: string): string {
    if (!key) return 'None';
    const trimmed = key.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'none') return 'None';

    // Handle combinations like "ctrl+m" or "Control + M"
    if (trimmed.includes('+')) {
      const tokens = trimmed.split('+').map((t) => t.trim().toLowerCase());
      const normalizedTokens: string[] = [];
      if (tokens.some((t) => t === 'ctrl' || t === 'control')) normalizedTokens.push('Ctrl');
      if (tokens.some((t) => t === 'shift')) normalizedTokens.push('Shift');
      if (tokens.some((t) => t === 'alt')) normalizedTokens.push('Alt');

      const primary = tokens.filter((t) => !['ctrl', 'control', 'shift', 'alt'].includes(t));
      if (primary.length > 0) {
        normalizedTokens.push(this.formatKeyPart(primary[primary.length - 1]));
      }
      return normalizedTokens.join(' + ');
    }

    // Normalize single key aliases
    const lower = trimmed.toLowerCase();
    if (lower === 'rshift' || lower === 'right shift') return 'Right Shift';
    if (lower === 'lshift' || lower === 'left shift') return 'Left Shift';
    if (lower === 'rcontrol' || lower === 'right control') return 'Right Control';
    if (lower === 'lcontrol' || lower === 'left control') return 'Left Control';
    if (/^f\d{1,2}$/i.test(trimmed)) return trimmed.toUpperCase();
    if (/^[a-zA-Z]$/.test(trimmed)) return trimmed.toUpperCase();

    return trimmed;
  }
}
