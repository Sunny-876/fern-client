import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { JavaRuntime, JavaDetectionResult } from '../../../shared/models/java';
import { FernPathManager } from '../core/paths';
import { FernLogger } from '../core/logger';

const execFileAsync = promisify(execFile);

export class JavaManager {
  private runtimes: Map<string, JavaRuntime> = new Map();
  private isScanning = false;

  constructor(
    private pathManager: FernPathManager,
    private logger: FernLogger
  ) {}

  public getRuntimes(): JavaRuntime[] {
    return Array.from(this.runtimes.values());
  }

  public getRuntimeByPath(javaPath: string): JavaRuntime | undefined {
    return this.runtimes.get(path.normalize(javaPath));
  }

  /**
   * Scans system for installed Java runtimes across PATH, JAVA_HOME, Program Files, and Fern directory.
   */
  public async detectRuntimes(): Promise<JavaDetectionResult> {
    if (this.isScanning) {
      return {
        runtimes: this.getRuntimes(),
      };
    }

    this.isScanning = true;
    this.logger.info('JavaManager', 'Beginning scan for local Java runtimes...');
    const candidatePaths = new Set<string>();

    // 1. Check JAVA_HOME
    if (process.env.JAVA_HOME) {
      const p = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
      if (fs.existsSync(p)) candidatePaths.add(path.normalize(p));
    }

    // 2. Check PATH
    if (process.env.PATH) {
      const pathSeparator = process.platform === 'win32' ? ';' : ':';
      const parts = process.env.PATH.split(pathSeparator);
      const binaryName = process.platform === 'win32' ? 'java.exe' : 'java';

      for (const part of parts) {
        if (!part) continue;
        const potential = path.join(part, binaryName);
        if (fs.existsSync(potential)) {
          candidatePaths.add(path.normalize(potential));
        }
      }
    }

    // 3. Check standard Windows directories
    if (process.platform === 'win32') {
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      const localAppData = process.env['LOCALAPPDATA'];

      const searchRoots = [
        path.join(programFiles, 'Java'),
        path.join(programFiles, 'Eclipse Adoptium'),
        path.join(programFiles, 'BellSoft'),
        path.join(programFiles, 'Zulu'),
        path.join(programFiles, 'Microsoft'),
        path.join(programFilesX86, 'Java'),
      ];

      if (localAppData) {
        searchRoots.push(path.join(localAppData, 'Programs', 'Eclipse Adoptium'));
      }

      for (const root of searchRoots) {
        if (fs.existsSync(root)) {
          try {
            const entries = fs.readdirSync(root, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const javaBin = path.join(root, entry.name, 'bin', 'java.exe');
                if (fs.existsSync(javaBin)) {
                  candidatePaths.add(path.normalize(javaBin));
                }
              }
            }
          } catch {
            // Ignore access errors on individual directories
          }
        }
      }
    }

    // 4. Check Fern's managed Java directory
    const fernJavaDir = this.pathManager.getJavaDir();
    if (fs.existsSync(fernJavaDir)) {
      try {
        const entries = fs.readdirSync(fernJavaDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const javaBin = path.join(fernJavaDir, entry.name, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
            if (fs.existsSync(javaBin)) {
              candidatePaths.add(path.normalize(javaBin));
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // Probe each candidate
    this.runtimes.clear();
    let recommended: JavaRuntime | undefined;

    for (const binPath of candidatePaths) {
      try {
        const runtime = await this.probeJavaExecutable(binPath);
        if (runtime && runtime.isValid) {
          this.runtimes.set(path.normalize(binPath), runtime);

          // Prefer Java 21 for modern Minecraft 1.20.5+ / 1.21+
          if (!recommended || (runtime.majorVersion === 21 && recommended.majorVersion !== 21)) {
            recommended = runtime;
          }
        }
      } catch (err) {
        this.logger.debug('JavaManager', `Failed to probe Java at ${binPath}:`, err);
      }
    }

    this.isScanning = false;
    this.logger.info('JavaManager', `Scan complete. Found ${this.runtimes.size} valid Java runtime(s).`);

    return {
      runtimes: this.getRuntimes(),
      recommendedPath: recommended?.path,
      systemPath: candidatePaths.values().next().value,
    };
  }

  /**
   * Probes a specific java executable to determine version and vendor.
   */
  public async probeJavaExecutable(binPath: string): Promise<JavaRuntime | null> {
    try {
      if (!fs.existsSync(binPath)) {
        return null;
      }

      // Execute `java -version` (outputs to stderr in standard Java implementations)
      const { stderr, stdout } = await execFileAsync(binPath, ['-version'], { timeout: 4000 });
      const output = (stderr || stdout || '').toString();

      const versionMatch = output.match(/(?:java|openjdk)\s+version\s+"([^"]+)"/i) ||
                           output.match(/(?:java|openjdk)\s+([0-9._]+)/i);

      const versionStr = versionMatch ? versionMatch[1] : 'Unknown';
      const majorVersion = this.parseMajorVersion(versionStr);

      let vendor = 'Unknown';
      if (/Adoptium|Temurin/i.test(output)) vendor = 'Eclipse Adoptium';
      else if (/Microsoft/i.test(output)) vendor = 'Microsoft';
      else if (/Oracle/i.test(output)) vendor = 'Oracle';
      else if (/Zulu|Azul/i.test(output)) vendor = 'Azul Zulu';
      else if (/BellSoft|Liberica/i.test(output)) vendor = 'BellSoft Liberica';
      else if (/Corretto|Amazon/i.test(output)) vendor = 'Amazon Corretto';
      else if (/OpenJDK/i.test(output)) vendor = 'OpenJDK';

      const architecture = /64-Bit/i.test(output) ? 'x64' : 'x86';
      const normPath = path.normalize(binPath);

      return {
        id: `java-${majorVersion}-${Math.abs(normPath.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0))}`,
        name: `Java ${majorVersion} (${vendor})`,
        path: normPath,
        version: versionStr,
        majorVersion,
        architecture,
        vendor,
        isDefault: false,
        isValid: true,
      };
    } catch (err) {
      return {
        id: `java-invalid-${Date.now()}`,
        name: 'Invalid Java',
        path: binPath,
        version: '0',
        majorVersion: 0,
        architecture: 'unknown',
        vendor: 'unknown',
        isDefault: false,
        isValid: false,
      };
    }
  }

  private parseMajorVersion(versionStr: string): number {
    if (versionStr.startsWith('1.')) {
      const parts = versionStr.split('.');
      return parseInt(parts[1], 10) || 8;
    }
    const match = versionStr.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Validates if a Java major version is compatible with a Minecraft version.
   */
  public isCompatible(javaMajor: number, mcVersion: string): { compatible: boolean; requiredVersion: number } {
    let required = 8;
    const parts = mcVersion.split('.').map((p) => parseInt(p, 10));
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    if (minor > 20 || (minor === 20 && patch >= 5)) {
      required = 21; // 1.20.5+ and 1.21+ requires Java 21
    } else if (minor >= 18) {
      required = 17; // 1.18 - 1.20.4 requires Java 17
    } else if (minor >= 17) {
      required = 16; // 1.17 requires Java 16
    } else {
      required = 8; // 1.16.5 and below requires Java 8
    }

    return {
      compatible: javaMajor >= required,
      requiredVersion: required,
    };
  }

  /**
   * Adds a Java runtime manually by path, probing for version and validity.
   */
  public async addRuntimeManually(customPath: string): Promise<JavaRuntime | null> {
    const norm = path.normalize(customPath);
    let binPath = norm;
    if (fs.existsSync(norm) && fs.statSync(norm).isDirectory()) {
      binPath = path.join(norm, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    }

    const runtime = await this.probeJavaExecutable(binPath);
    if (runtime && runtime.isValid) {
      this.runtimes.set(path.normalize(binPath), runtime);
      this.logger.info('JavaManager', `Manually registered Java runtime: ${runtime.name} at ${runtime.path}`);
      return runtime;
    }
    return null;
  }

  public removeRuntime(idOrPath: string): boolean {
    const norm = path.normalize(idOrPath);
    if (this.runtimes.has(norm)) {
      this.runtimes.delete(norm);
      return true;
    }
    for (const [key, rt] of this.runtimes.entries()) {
      if (rt.id === idOrPath) {
        this.runtimes.delete(key);
        return true;
      }
    }
    return false;
  }

  public setDefaultRuntime(idOrPath: string): boolean {
    let found = false;
    for (const rt of this.runtimes.values()) {
      if (rt.id === idOrPath || rt.path === path.normalize(idOrPath)) {
        rt.isDefault = true;
        found = true;
      } else {
        rt.isDefault = false;
      }
    }
    return found;
  }

  public getDefaultRuntime(): JavaRuntime | undefined {
    return Array.from(this.runtimes.values()).find((rt) => rt.isDefault);
  }

  public getRecommendedRuntimeForMinecraft(mcVersion: string): JavaRuntime | undefined {
    const { requiredVersion } = this.isCompatible(0, mcVersion);
    const valid = Array.from(this.runtimes.values()).filter((rt) => rt.isValid);

    // Exact match major version first
    const exact = valid.find((rt) => rt.majorVersion === requiredVersion);
    if (exact) return exact;

    // Highest compatible major version
    return valid
      .filter((rt) => rt.majorVersion >= requiredVersion)
      .sort((a, b) => b.majorVersion - a.majorVersion)[0];
  }

  public checkJavaAvailability(mcVersion: string): {
    hasCompatible: boolean;
    requiredVersion: number;
    compatibleRuntimes: JavaRuntime[];
    downloadOffer?: { version: number; name: string; url: string };
  } {
    const { requiredVersion } = this.isCompatible(0, mcVersion);
    const compatibleRuntimes = Array.from(this.runtimes.values()).filter(
      (rt) => rt.isValid && rt.majorVersion >= requiredVersion
    );

    const hasCompatible = compatibleRuntimes.length > 0;
    let downloadOffer: { version: number; name: string; url: string } | undefined;

    if (!hasCompatible) {
      downloadOffer = {
        version: requiredVersion,
        name: `Eclipse Temurin OpenJDK ${requiredVersion} (LTS)`,
        url: `https://api.adoptium.net/v3/binary/latest/${requiredVersion}/ga/windows/x64/jdk/hotspot/normal/eclipse`,
      };
    }

    return {
      hasCompatible,
      requiredVersion,
      compatibleRuntimes,
      downloadOffer,
    };
  }
}
