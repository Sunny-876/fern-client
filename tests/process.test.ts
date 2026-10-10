import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { EventEmitter } from 'events';
import { FernPathManager } from '../launcher/src/core/paths';
import { FernLogger } from '../launcher/src/core/logger';
import { MinecraftProcessManager } from '../launcher/src/core/process';

class MockChildProcess extends EventEmitter {
  public pid = 12345;
  public stdout = new EventEmitter();
  public stderr = new EventEmitter();
  public killed = false;

  public kill(): boolean {
    this.killed = true;
    this.emit('exit', 0, null);
    return true;
  }
}

describe('MinecraftProcessManager', () => {
  let tempDir: string;
  let pathManager: FernPathManager;
  let logger: FernLogger;
  let processManager: MinecraftProcessManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fern-proc-test-'));
    pathManager = new FernPathManager(tempDir);
    logger = new FernLogger(pathManager);
    processManager = new MinecraftProcessManager(logger);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('tracks process lifecycle and detects exit', () => {
    const mockChild = new MockChildProcess() as any;
    let exitNotified = false;
    let recordedDuration = 0;

    const info = processManager.trackProcess(
      mockChild,
      'test-installation-1',
      'java',
      ['-jar', 'client.jar'],
      (code, signal, duration) => {
        exitNotified = true;
        recordedDuration = duration;
      }
    );

    expect(info.pid).toBe(12345);
    expect(processManager.getRunningCount()).toBe(1);
    expect(processManager.isInstallationRunning('test-installation-1')).toBe(true);

    // Simulate stdout and stderr data
    mockChild.stdout.emit('data', Buffer.from('[Client thread/INFO]: Setting user: Player\n'));
    mockChild.stderr.emit('data', Buffer.from('Warning: OpenGL 3.2 required\n'));

    // Trigger process exit
    mockChild.emit('exit', 0, null);

    expect(exitNotified).toBe(true);
    expect(processManager.getRunningCount()).toBe(0);
    expect(processManager.isInstallationRunning('test-installation-1')).toBe(false);
  });

  it('formats session durations human-readably', () => {
    expect(processManager.formatDuration(5)).toBe('5 seconds');
    expect(processManager.formatDuration(1)).toBe('1 second');
    expect(processManager.formatDuration(60)).toBe('1 minute');
    expect(processManager.formatDuration(2520)).toBe('42 minutes');
    expect(processManager.formatDuration(3665)).toBe('1h 1m');
  });

  it('terminates running installation by ID', () => {
    const mockChild = new MockChildProcess() as any;
    processManager.trackProcess(mockChild, 'inst-terminate', 'java', []);

    expect(processManager.isInstallationRunning('inst-terminate')).toBe(true);
    const success = processManager.killInstallation('inst-terminate');
    expect(success).toBe(true);
    expect(processManager.isInstallationRunning('inst-terminate')).toBe(false);
  });
});
