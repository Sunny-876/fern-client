import { FernMenu } from './FernMenu';
import { ModuleManager } from '../modules/ModuleManager';
import { KeybindManager } from '../keybinds/KeybindManager';
import { HUDManager } from '../hud/HUDManager';
import { NotificationManager } from '../notifications/NotificationManager';
import { ThemeManager } from '../theme/ThemeManager';
import { ProfileManager } from '../profiles/ProfileManager';
import { EventBus } from '../events/EventBus';
import { KeyPressEvent, Render2DEvent, MouseInputEvent } from '../events/ClientEvents';

export class UIManager {
  public readonly menu: FernMenu;

  constructor(
    private moduleManager: ModuleManager,
    private keybindManager: KeybindManager,
    private hudManager: HUDManager,
    public readonly notifications: NotificationManager,
    public readonly themes: ThemeManager,
    private eventBus: EventBus,
    private profileManager?: ProfileManager
  ) {
    this.menu = new FernMenu(
      this.moduleManager,
      this.keybindManager,
      this.hudManager,
      this.themes,
      this.profileManager
    );

    // Register primary keybind action to toggle Fern Menu
    this.keybindManager.registerAction({
      id: 'open_fern_menu',
      name: 'Open Fern Menu',
      description: 'Opens the in-game module browser and configuration screen.',
      key: 'Right Shift',
      defaultKey: 'Right Shift',
      onTrigger: () => {
        this.menu.toggle();
      },
    });

    // Register action to toggle HUD Edit Mode
    this.keybindManager.registerAction({
      id: 'toggle_hud_edit',
      name: 'Toggle HUD Edit Mode',
      description: 'Enters or exits in-game HUD positioning mode.',
      key: 'None',
      defaultKey: 'None',
      onTrigger: () => {
        if (this.hudManager.isEditing()) {
          this.hudManager.setEditMode(false);
        } else {
          this.menu.enterHudEditMode();
        }
      },
    });

    // Listen to keypresses to handle menu navigation / escape / undo / redo
    this.eventBus.on('key_press', (evt: KeyPressEvent) => {
      this.handleKeyPress(evt);
    });

    // Listen to mouse input to handle HUD dragging
    this.eventBus.on('mouse_input', (evt: MouseInputEvent) => {
      this.handleMouseInput(evt);
    });

    // Listen to 2D render loop to draw overlay elements and menu if open
    this.eventBus.on('render_2d', (evt: Render2DEvent) => {
      this.renderScreen(evt);
    });
  }

  private handleKeyPress(evt: KeyPressEvent): void {
    if (evt.action !== 'down') return;

    // If in rebinding mode, capture any key to bind
    if (this.menu.isRebinding()) {
      if (evt.key === 'Escape') {
        this.menu.cancelRebinding();
      } else {
        this.menu.finishRebinding(evt.key);
      }
      evt.cancelled = true;
      return;
    }

    // If HUD Edit mode is active
    if (this.hudManager.isEditing()) {
      // Undo: Ctrl+Z
      if (evt.modifiers?.ctrl && evt.key.toLowerCase() === 'z' && !evt.modifiers?.shift) {
        const undone = this.hudManager.editor.undoRedo.undo();
        if (undone) {
          this.notifications.notify('Action undone', 'info', 1500);
        }
        evt.cancelled = true;
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (evt.modifiers?.ctrl && evt.key.toLowerCase() === 'y') ||
        (evt.modifiers?.ctrl && evt.modifiers?.shift && evt.key.toLowerCase() === 'z')
      ) {
        const redone = this.hudManager.editor.undoRedo.redo();
        if (redone) {
          this.notifications.notify('Action redone', 'info', 1500);
        }
        evt.cancelled = true;
        return;
      }

      // Escape exits edit mode
      if (evt.key === 'Escape') {
        this.hudManager.setEditMode(false);
        this.notifications.notify('HUD layout saved', 'success', 2000);
        evt.cancelled = true;
        return;
      }
    }

    // If menu is open and Escape is pressed, close menu
    if (this.menu.isMenuOpen() && evt.key === 'Escape') {
      this.menu.close();
      evt.cancelled = true;
      return;
    }
  }

  private handleMouseInput(evt: MouseInputEvent): void {
    if (!this.hudManager.isEditing()) return;

    // Abstract screen size fallback if not passed in event
    const screenWidth = 1920;
    const screenHeight = 1080;

    if (evt.action === 'down' && evt.button === 0) {
      this.hudManager.editor.onMouseDown(evt.x, evt.y, screenWidth, screenHeight);
    } else if (evt.action === 'up' && evt.button === 0) {
      this.hudManager.editor.onMouseUp();
    }
  }

  public renderScreen(evt: Render2DEvent): void {
    // 1. Render active notifications
    const notifs = this.notifications.getActiveNotifications();
    if (notifs.length > 0 && evt.drawRect && evt.drawText) {
      let curY = evt.screenHeight - 28;
      for (const n of notifs) {
        const theme = this.themes.getActiveTheme();
        evt.drawRect(evt.screenWidth - 220, curY, 210, 22, theme.surface);
        evt.drawText(n.message, evt.screenWidth - 212, curY + 5, theme.text, true);
        curY -= 26;
      }
    }
  }

  public shouldCaptureInput(): boolean {
    return this.menu.isMenuOpen() || this.hudManager.isEditing();
  }
}
