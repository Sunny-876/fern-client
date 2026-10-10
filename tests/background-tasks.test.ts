import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackgroundTaskManager } from '../launcher/src/performance/background/background-task-manager';
import { FernLogger } from '../launcher/src/core/logger';
import { defaultPathManager } from '../launcher/src/core/paths';
import { MinecraftProcessManager } from '../launcher/src/core/process';
import { EventEmitter } from 'events';

describe('BackgroundTaskManager & Process Lifecycle Coordination', () => {
  let logger: FernLogger;
  let taskManager: BackgroundTaskManager;

  beforeEach(() => {
    logger = new FernLogger(defaultPathManager);
    taskManager = new BackgroundTaskManager(logger);
  });

  afterEach(() => {
    taskManager.dispose();
  });

  it('registers tasks and manages execution state', () => {
    taskManager.registerTask('meta-refresh', 'Metadata Refresh', 'background', 5000, () => {});
    taskManager.registerTask('account-token', 'Auth Validation', 'critical', 10000, () => {});

    const tasks = taskManager.getTasks();
    expect(tasks.length).toBe(2);
    expect(tasks.find((t) => t.id === 'meta-refresh')?.isPaused).toBe(false);
  });

  it('pauses background tasks when Minecraft starts and resumes when it exits', () => {
    taskManager.registerTask('cache-clean', 'Cache Validation', 'background', 5000, () => {});
    taskManager.registerTask('auth-keepalive', 'Auth Keepalive', 'critical', 5000, () => {});

    // Game starts
    taskManager.onGameStarted();
    expect(taskManager.isGameActive()).toBe(true);

    const activeTasks = taskManager.getTasks();
    const bgTask = activeTasks.find((t) => t.id === 'cache-clean');
    const critTask = activeTasks.find((t) => t.id === 'auth-keepalive');

    expect(bgTask?.isPaused).toBe(true);
    expect(critTask?.isPaused).toBe(false); // Critical tasks are not paused

    // Game exits
    taskManager.onGameExited();
    expect(taskManager.isGameActive()).toBe(false);
    expect(taskManager.getTasks().find((t) => t.id === 'cache-clean')?.isPaused).toBe(false);
  });

  it('coordinates with MinecraftProcessManager state transitions', () => {
    const procManager = new MinecraftProcessManager(logger);
    let lastRunningCount = -1;

    procManager.onStateChange((count) => {
      lastRunningCount = count;
      if (count > 0) {
        taskManager.onGameStarted();
      } else {
        taskManager.onGameExited();
      }
    });

    taskManager.registerTask('cache-worker', 'Cache Worker', 'background', 5000, () => {});

    // Mock ChildProcess
    const fakeChild = new EventEmitter() as any;
    fakeChild.pid = 9999;
    fakeChild.stdout = new EventEmitter();
    fakeChild.stderr = new EventEmitter();

    procManager.trackProcess(fakeChild, 'inst-1', 'java', []);
    expect(lastRunningCount).toBe(1);
    expect(taskManager.isGameActive()).toBe(true);
    expect(taskManager.getTasks()[0].isPaused).toBe(true);

    // Simulate process exit
    fakeChild.emit('exit', 0, null);
    expect(lastRunningCount).toBe(0);
    expect(taskManager.isGameActive()).toBe(false);
    expect(taskManager.getTasks()[0].isPaused).toBe(false);
  });
});
