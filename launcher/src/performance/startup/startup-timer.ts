import { StartupMetrics } from '../../../../shared/models/performance';

export class StartupTimer {
  private launcherInitTime: number = Date.now();
  private prepStartTime: number = 0;
  private prepEndTime: number = 0;
  private processStartTime: number = 0;
  private clientReadyTime: number = 0;

  public markPreparationStart(): void {
    this.prepStartTime = Date.now();
  }

  public markPreparationEnd(): void {
    this.prepEndTime = Date.now();
  }

  public markProcessSpawn(): void {
    this.processStartTime = Date.now();
  }

  public markClientReady(): void {
    this.clientReadyTime = Date.now();
  }

  public getMetrics(): StartupMetrics {
    const launcherStartupMs = this.prepStartTime > this.launcherInitTime ? this.prepStartTime - this.launcherInitTime : 0;
    const preparationMs = this.prepEndTime > this.prepStartTime ? this.prepEndTime - this.prepStartTime : 0;
    const processStartupMs = this.clientReadyTime > this.processStartTime
      ? this.clientReadyTime - this.processStartTime
      : (this.processStartTime > this.prepEndTime ? this.processStartTime - this.prepEndTime : 0);
    const totalStartupMs = (this.clientReadyTime || this.processStartTime || Date.now()) - this.launcherInitTime;

    return {
      launcherStartupMs,
      preparationMs,
      processStartupMs,
      totalStartupMs,
    };
  }
}
