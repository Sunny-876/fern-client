import * as fs from 'fs/promises';
import * as path from 'path';
import { FernLogger } from '../core/logger';
import { readZipEntryText } from '../utils/zip';
import { ScreenshotMetadata } from './screenshot-manager';

export interface ReplayRecordingMetadata {
  durationMs: number;
  recordedAt: number;
  minecraftVersion: string;
  protocolVersion?: number;
  fileFormatVersion?: number;
  players?: string[];
  serverName?: string;
  customServerName?: string;
}

export interface ReplayRecordingSession {
  id: string;
  filename: string;
  filePath: string;
  fileSizeBytes: number;
  metadata?: ReplayRecordingMetadata;
  linkedScreenshots?: ScreenshotMetadata[];
}

export interface ReplaySupportStatus {
  installed: boolean;
  version?: string;
  modFileName?: string;
  compatible: boolean;
  notes: string;
}

/**
 * Architectural and licensing documentation for ReplayMod integration in Fern Client.
 */
export const REPLAY_INTEGRATION_SPECIFICATION = {
  modName: 'Replay Mod',
  license: 'GNU General Public License v3 (GPLv3)',
  supportedVersions: ['1.20.1', '1.20.2', '1.20.4', '1.21.1', '1.21.4'],
  distributionConstraint:
    'Replay Mod is licensed under GPLv3. To comply with licensing terms and prevent unauthorized redistribution, Fern Client does not bundle or rehost Replay Mod binaries. Instead, Fern Client detects and indexes user-installed Replay Mod recordings (.mcpr), reads metadata safely via standard ZIP container parsing, and correlates sessions with screenshots.',
  engineConstraint:
    'A full proprietary replay recording and camera engine is out-of-scope for Phase 14. Fern Client provides a non-invasive integration layer rather than claiming custom recording/cinematic camera functionality.',
  requiredDependencies: ['Fabric API (Fabric)', 'FFmpeg (for video rendering within Minecraft)'],
};

export class ReplaySessionService {
  constructor(private logger: FernLogger) {}

  /**
   * Detects if ReplayMod is installed in the instance's mods folder.
   */
  public async detectReplaySupport(instanceGameDir: string): Promise<ReplaySupportStatus> {
    const modsDir = path.join(instanceGameDir, 'mods');
    try {
      await fs.access(modsDir);
      const files = await fs.readdir(modsDir);

      const replayJar = files.find(
        (f) => f.toLowerCase().includes('replaymod') && !f.endsWith('.disabled')
      );

      if (!replayJar) {
        return {
          installed: false,
          compatible: false,
          notes: 'Replay Mod not detected. Install Replay Mod in the instance mods folder to enable recording.',
        };
      }

      return {
        installed: true,
        modFileName: replayJar,
        version: replayJar.replace(/^replaymod-?/i, '').replace(/\.jar$/, ''),
        compatible: true,
        notes: 'Replay Mod detected. Session recordings in .mcpr format will be automatically indexed.',
      };
    } catch {
      return {
        installed: false,
        compatible: false,
        notes: 'Mods folder could not be inspected.',
      };
    }
  }

  /**
   * Reads .mcpr files from replay_recordings/ and parses metadata.
   */
  public async scanRecordings(instanceGameDir: string): Promise<ReplayRecordingSession[]> {
    const recordingsDir = path.join(instanceGameDir, 'replay_recordings');
    const sessions: ReplayRecordingSession[] = [];

    try {
      await fs.access(recordingsDir);
      const entries = await fs.readdir(recordingsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.mcpr')) continue;

        const filePath = path.join(recordingsDir, entry.name);
        try {
          const stat = await fs.stat(filePath);
          const buf = await fs.readFile(filePath);
          const meta = this.parseMcprMetadata(buf);

          sessions.push({
            id: `replay-${stat.mtimeMs}-${entry.name}`,
            filename: entry.name,
            filePath,
            fileSizeBytes: stat.size,
            metadata: meta || undefined,
          });
        } catch (readErr) {
          this.logger.warn('ReplaySessionService', `Failed to parse .mcpr recording ${entry.name}:`, readErr);
        }
      }

      return sessions.sort((a, b) => {
        const timeA = a.metadata?.recordedAt || 0;
        const timeB = b.metadata?.recordedAt || 0;
        return timeB - timeA;
      });
    } catch {
      return [];
    }
  }

  /**
   * Safely parses metaData.json or recording.json from a .mcpr archive buffer.
   */
  public parseMcprMetadata(buffer: Buffer): ReplayRecordingMetadata | null {
    try {
      // ReplayMod .mcpr archives store metadata in metaData.json or recording.json
      let metaStr = readZipEntryText(buffer, 'metaData.json');
      if (!metaStr) {
        metaStr = readZipEntryText(buffer, 'recording.json');
      }

      if (!metaStr) return null;

      const raw = JSON.parse(metaStr);
      return {
        durationMs: typeof raw.duration === 'number' ? raw.duration : 0,
        recordedAt: typeof raw.date === 'number' ? raw.date : Date.now(),
        minecraftVersion: typeof raw.mcversion === 'string' ? raw.mcversion : 'Unknown',
        protocolVersion: typeof raw.protocol === 'number' ? raw.protocol : undefined,
        fileFormatVersion: typeof raw.fileFormatVersion === 'number' ? raw.fileFormatVersion : undefined,
        players: Array.isArray(raw.players) ? raw.players : undefined,
        serverName: typeof raw.serverName === 'string' ? raw.serverName : undefined,
        customServerName: typeof raw.customServerName === 'string' ? raw.customServerName : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Links screenshots taken during or immediately around the replay session.
   */
  public correlateWithScreenshots(
    session: ReplayRecordingSession,
    screenshots: ScreenshotMetadata[]
  ): ScreenshotMetadata[] {
    if (!session.metadata) return [];

    const startTime = session.metadata.recordedAt;
    const endTime = startTime + session.metadata.durationMs;
    const toleranceMs = 60 * 1000; // 1-minute window tolerance

    return screenshots.filter(
      (shot) =>
        shot.capturedAt >= startTime - toleranceMs &&
        shot.capturedAt <= endTime + toleranceMs
    );
  }

  /**
   * Returns integration documentation and constraints.
   */
  public getDocumentation(): typeof REPLAY_INTEGRATION_SPECIFICATION {
    return REPLAY_INTEGRATION_SPECIFICATION;
  }
}
