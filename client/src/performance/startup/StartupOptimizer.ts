import { StartupMetrics } from '../../../../shared/models/performance';

export class StartupOptimizer {
  private startTime: number = 0;
  private prepEndTime: number = 0;
  private processStartTime: number = 0;
  private readyTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  public markLauncherReady(): void {
    this.prepEndTime = Date.now();
  }

  public markProcessStarting(): void {
    this.processStartTime = Date.now();
  }

  public markClientReady(): void {
    this.readyTime = Date.now();
  }

  public getMetrics(): StartupMetrics {
    const launcherStartupMs = this.prepEndTime > this.startTime ? this.prepEndTime - this.startTime : 0;
    const preparationMs = this.processStartTime > this.prepEndTime ? this.processStartTime - this.prepEndTime : 0;
    const processStartupMs = this.readyTime > this.processStartTime ? this.readyTime - this.processStartTime : 0;
    const totalStartupMs = this.readyTime > this.startTime ? this.readyTime - this.startTime : (launcherStartupMs + preparationMs + processStartupMs);

    return {
      launcherStartupMs,
      preparationMs,
      processStartupMs,
      totalStartupMs,
    };
  }
}
