import { FernLogger } from '../../core/logger';

export type TaskPriority = 'critical' | 'normal' | 'background';

export interface BackgroundTask {
  id: string;
  name: string;
  priority: TaskPriority;
  intervalMs: number;
  execute: () => Promise<void> | void;
  timerHandle?: NodeJS.Timeout;
  isRunning: boolean;
  isPaused: boolean;
  lastRunTimestamp?: number;
}

export class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private isGameRunning: boolean = false;

  constructor(private logger: FernLogger) {}

  public registerTask(
    id: string,
    name: string,
    priority: TaskPriority,
    intervalMs: number,
    execute: () => Promise<void> | void
  ): void {
    if (this.tasks.has(id)) {
      this.unregisterTask(id);
    }

    const task: BackgroundTask = {
      id,
      name,
      priority,
      intervalMs,
      execute,
      isRunning: false,
      isPaused: this.isGameRunning && priority === 'background',
    };

    this.tasks.set(id, task);
    this.scheduleTask(task);
  }

  public unregisterTask(id: string): void {
    const task = this.tasks.get(id);
    if (task && task.timerHandle) {
      clearInterval(task.timerHandle);
    }
    this.tasks.delete(id);
  }

  /**
   * Called when a Minecraft process starts.
   * Throttles or suspends all non-critical background jobs to minimize launcher CPU & disk impact.
   */
  public onGameStarted(): void {
    this.isGameRunning = true;
    this.logger.info('BackgroundTaskManager', 'Minecraft session active: pausing launcher background tasks.');

    for (const task of this.tasks.values()) {
      if (task.priority === 'background') {
        task.isPaused = true;
      }
    }
  }

  /**
   * Called when all Minecraft processes have exited.
   * Resumes regular background operations.
   */
  public onGameExited(): void {
    this.isGameRunning = false;
    this.logger.info('BackgroundTaskManager', 'Minecraft session ended: resuming regular background tasks.');

    for (const task of this.tasks.values()) {
      task.isPaused = false;
    }
  }

  public isGameActive(): boolean {
    return this.isGameRunning;
  }

  public getTasks(): Array<{ id: string; name: string; priority: TaskPriority; isPaused: boolean }> {
    return Array.from(this.tasks.values()).map((t) => ({
      id: t.id,
      name: t.name,
      priority: t.priority,
      isPaused: t.isPaused,
    }));
  }

  private scheduleTask(task: BackgroundTask): void {
    task.timerHandle = setInterval(async () => {
      if (task.isPaused || task.isRunning) {
        return;
      }

      task.isRunning = true;
      try {
        await task.execute();
        task.lastRunTimestamp = Date.now();
      } catch (err) {
        this.logger.warn('BackgroundTaskManager', `Error executing background task ${task.id}:`, err);
      } finally {
        task.isRunning = false;
      }
    }, task.intervalMs);
  }

  public dispose(): void {
    for (const task of this.tasks.values()) {
      if (task.timerHandle) {
        clearInterval(task.timerHandle);
      }
    }
    this.tasks.clear();
  }
}
