import { describe, it, expect, vi } from 'vitest';
import { UndoRedoManager } from '../client/src/hud/editor/UndoRedoManager';

describe('UndoRedoManager - Bounded Action History', () => {
  it('records actions and executes undo and redo', () => {
    const manager = new UndoRedoManager(10);
    let state = 0;

    manager.push({
      type: 'MOVE',
      description: 'Increment state',
      undo: () => { state = 0; },
      redo: () => { state = 1; },
    });

    state = 1;
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);

    // Execute Undo
    expect(manager.undo()).toBe(true);
    expect(state).toBe(0);
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);

    // Execute Redo
    expect(manager.redo()).toBe(true);
    expect(state).toBe(1);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('caps history at maxHistory limit without unbounded memory leak', () => {
    const manager = new UndoRedoManager(5);

    for (let i = 0; i < 15; i++) {
      manager.push({
        type: 'RESIZE',
        description: `Action ${i}`,
        undo: () => {},
        redo: () => {},
      });
    }

    expect(manager.getUndoCount()).toBe(5);
  });

  it('clears redo stack upon new action', () => {
    const manager = new UndoRedoManager(10);

    manager.push({
      type: 'MOVE',
      description: 'Action 1',
      undo: () => {},
      redo: () => {},
    });

    manager.undo();
    expect(manager.canRedo()).toBe(true);

    // New action invalidates redo
    manager.push({
      type: 'MOVE',
      description: 'Action 2',
      undo: () => {},
      redo: () => {},
    });

    expect(manager.canRedo()).toBe(false);
  });
});
