import { ChildProcess } from 'child_process';
import { FernLogger } from './logger';

export interface RunningProcessInfo {
  pid: number;
  startTime: number;
  installationId: string;
  command: string;
  args: string[];
}

export type ProcessExitCallback = (exitCode: number | null, signal: NodeJS.Signals | null, durationSeconds: number) => void;
export type ProcessStateChangeListener = (runningCount: number) => void;

export class MinecraftProcessManager {
  private activeProcesses: Map<number, { process: ChildProcess; info: RunningProcessInfo }> = new Map();
  private runningInstallationIds: Set<string> = new Set();
  private stateChangeListeners: Set<ProcessStateChangeListener> = new Set();

  constructor(private logger: FernLogger) {}

  public onStateChange(listener: ProcessStateChangeListener): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  private notifyStateChange(): void {
    const count = this.activeProcesses.size;
    for (const listener of this.stateChangeListeners) {
      try {
        listener(count);
      } catch (err) {
        this.logger.error('ProcessManager', 'Error in state change listener:', err);
      }
    }
  }

  public getRunningCount(): number {
    return this.activeProcesses.size;
  }

  public isInstallationRunning(installationId: string): boolean {
    return this.runningInstallationIds.has(installationId);
  }

  public getRunningProcesses(): RunningProcessInfo[] {
    return Array.from(this.activeProcesses.values()).map((p) => ({ ...p.info }));
  }

  public trackProcess(
    child: ChildProcess,
    installationId: string,
    command: string,
    args: string[],
    onExit?: ProcessExitCallback
  ): RunningProcessInfo {
    const pid = child.pid || -1;
    const startTime = Date.now();
    const info: RunningProcessInfo = {
      pid,
      startTime,
      installationId,
      command,
      args,
    };

    this.activeProcesses.set(pid, { process: child, info });
    this.runningInstallationIds.add(installationId);
    this.notifyStateChange();
    this.logger.info('ProcessManager', `Started tracking Minecraft instance PID: ${pid} (Installation: ${installationId})`);

    child.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) {
        this.logger.info(`MC-PID-${pid}`, line);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) {
        this.logger.warn(`MC-PID-${pid}`, line);
      }
    });

    child.on('error', (err: Error) => {
      this.logger.error(`MC-PID-${pid}`, `Minecraft process encountered error: ${err.message}`, err);
      this.activeProcesses.delete(pid);
      this.runningInstallationIds.delete(installationId);
      this.notifyStateChange();
      if (onExit) {
        onExit(-1, null, 0);
      }
    });

    child.on('exit', (code, signal) => {
      const durationMs = Date.now() - startTime;
      const durationSeconds = Math.round(durationMs / 1000);
      const durationFormatted = this.formatDuration(durationSeconds);

      this.logger.info(
        'ProcessManager',
        `Minecraft PID ${pid} closed (Exit Code: ${code}, Signal: ${signal}). Session duration: ${durationFormatted}`
      );

      this.activeProcesses.delete(pid);
      this.runningInstallationIds.delete(installationId);
      this.notifyStateChange();

      if (onExit) {
        onExit(code, signal, durationSeconds);
      }
    });

    return info;
  }

  public killProcess(pid: number): boolean {
    const record = this.activeProcesses.get(pid);
    if (!record) return false;

    this.logger.info('ProcessManager', `Terminating Minecraft PID ${pid}`);
    const killed = record.process.kill();
    if (killed) {
      this.runningInstallationIds.delete(record.info.installationId);
      this.activeProcesses.delete(pid);
      this.notifyStateChange();
    }
    return killed;
  }

  public killInstallation(installationId: string): boolean {
    for (const [pid, record] of this.activeProcesses.entries()) {
      if (record.info.installationId === installationId) {
        return this.killProcess(pid);
      }
    }
    return false;
  }

  public killAll(): void {
    for (const pid of this.activeProcesses.keys()) {
      this.killProcess(pid);
    }
  }

  public formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds === 1 ? '' : 's'}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    if (minutes < 60) {
      return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s` : `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  }
}
