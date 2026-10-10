export type EditorActionType =
  | 'MOVE'
  | 'RESIZE'
  | 'SCALE'
  | 'ANCHOR'
  | 'STYLE'
  | 'LAYER'
  | 'VISIBILITY'
  | 'RESET'
  | 'BATCH';

export interface EditorAction {
  type: EditorActionType;
  description: string;
  elementId?: string;
  undo: () => void;
  redo: () => void;
}

export class UndoRedoManager {
  private undoStack: EditorAction[] = [];
  private redoStack: EditorAction[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  public push(action: EditorAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Any new action clears the redo stack
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(): boolean {
    const action = this.undoStack.pop();
    if (!action) return false;

    try {
      action.undo();
      this.redoStack.push(action);
      return true;
    } catch (err) {
      console.error('[UndoRedoManager] Error executing undo action:', err);
      return false;
    }
  }

  public redo(): boolean {
    const action = this.redoStack.pop();
    if (!action) return false;

    try {
      action.redo();
      this.undoStack.push(action);
      return true;
    } catch (err) {
      console.error('[UndoRedoManager] Error executing redo action:', err);
      return false;
    }
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }
}
