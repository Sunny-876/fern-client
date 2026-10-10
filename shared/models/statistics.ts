export interface PlayerStatistics {
  totalPlaytimeSeconds: number;
  sessionCount: number;
  firstLaunch: number;
  lastPlayed: number;
  versionsPlayed: Record<string, number>; // versionId -> seconds played
  installationsPlayed: Record<string, number>; // installationName -> seconds played
  favoriteInstallation?: string;
  favoriteVersion?: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_PLAYER_STATISTICS: PlayerStatistics = {
  totalPlaytimeSeconds: 0,
  sessionCount: 0,
  firstLaunch: Date.now(),
  lastPlayed: Date.now(),
  versionsPlayed: {},
  installationsPlayed: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export class StatisticsCalculator {
  public static formatPlaytime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }

  public static determineFavorites(stats: PlayerStatistics): {
    favoriteInstallation?: string;
    favoriteVersion?: string;
  } {
    let topInst: string | undefined;
    let topInstSec = 0;
    for (const [name, sec] of Object.entries(stats.installationsPlayed)) {
      if (sec > topInstSec) {
        topInstSec = sec;
        topInst = name;
      }
    }

    let topVer: string | undefined;
    let topVerSec = 0;
    for (const [ver, sec] of Object.entries(stats.versionsPlayed)) {
      if (sec > topVerSec) {
        topVerSec = sec;
        topVer = ver;
      }
    }

    return {
      favoriteInstallation: topInst,
      favoriteVersion: topVer,
    };
  }
}
