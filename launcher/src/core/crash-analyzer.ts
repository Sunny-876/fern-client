import * as fs from 'fs/promises';
import * as path from 'path';

export type CrashCategory =
  | 'java_version'
  | 'out_of_memory'
  | 'mod_conflict'
  | 'missing_dependency'
  | 'graphics_driver'
  | 'loader_failure'
  | 'corrupted_config'
  | 'network_timeout'
  | 'unknown';

export type CrashConfidence = 'high' | 'medium' | 'low';

export interface CrashAnalysisResult {
  hasCrash: boolean;
  exitCode?: number;
  possibleCause: string;
  suspectedCause: string;
  suggestedAction: string;
  category: CrashCategory;
  confidence: CrashConfidence;
  crashReportPath?: string;
  snippet?: string;
  sanitizedReport?: string;
}

export class CrashAnalyzer {
  /**
   * Scans an instance game directory or log text for crash causes.
   */
  public static async analyze(gameDir: string, exitCode?: number): Promise<CrashAnalysisResult> {
    const defaultResult: CrashAnalysisResult = {
      hasCrash: exitCode !== 0,
      exitCode,
      possibleCause: 'Minecraft closed unexpectedly with no specific error signature detected.',
      suspectedCause: 'Minecraft closed unexpectedly with no specific error signature detected.',
      suggestedAction: 'Check launcher logs or launch in Safe Mode to isolate mod issues.',
      category: 'unknown',
      confidence: 'low',
    };

    if (exitCode === 0) {
      return {
        hasCrash: false,
        exitCode: 0,
        possibleCause: 'Normal exit.',
        suspectedCause: 'Normal exit.',
        suggestedAction: 'None.',
        category: 'unknown',
        confidence: 'high',
      };
    }

    let logText = '';
    let crashReportPath: string | undefined;

    // 1. Look for latest crash report in crash-reports/
    const crashReportsDir = path.join(gameDir, 'crash-reports');
    try {
      const files = await fs.readdir(crashReportsDir);
      const crashFiles = files.filter((f) => f.startsWith('crash-') && f.endsWith('.txt')).sort().reverse();
      if (crashFiles.length > 0) {
        crashReportPath = path.join(crashReportsDir, crashFiles[0]);
        logText = await fs.readFile(crashReportPath, 'utf-8');
      }
    } catch {}

    // 2. If no crash report, read logs/latest.log
    if (!logText) {
      const latestLogPath = path.join(gameDir, 'logs', 'latest.log');
      try {
        logText = await fs.readFile(latestLogPath, 'utf-8');
      } catch {}
    }

    if (!logText) return defaultResult;

    return this.parseLogContent(logText, exitCode, crashReportPath);
  }

  public static parseLogContent(log: string, exitCode?: number, crashReportPath?: string): CrashAnalysisResult {
    // 1. Java Version Mismatch
    if (log.includes('UnsupportedClassVersionError') || /has been compiled by a more recent version of the Java Runtime/i.test(log)) {
      const cause = 'Java version incompatible. Minecraft or an installed mod requires a newer Java runtime (e.g. Java 21).';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Open Java Settings and select a compatible Java runtime (Java 21 for 1.20.5+ / 1.21+).',
        category: 'java_version',
        confidence: 'high',
        crashReportPath,
        snippet: 'java.lang.UnsupportedClassVersionError',
      };
    }

    // 2. Out of Memory
    if (log.includes('OutOfMemoryError') || /Java heap space/i.test(log) || /GC overhead limit exceeded/i.test(log)) {
      const cause = 'Out of memory: The game ran out of allocated memory (RAM).';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Increase allocated RAM in Installation Settings (recommended: 4–6 GB for modpacks).',
        category: 'out_of_memory',
        confidence: 'high',
        crashReportPath,
        snippet: 'java.lang.OutOfMemoryError: Java heap space',
      };
    }

    // 3. Graphics Driver / OpenGL Initialization Failure
    if (
      log.includes('GLFW error 65542') ||
      /Pixel format not accelerated/i.test(log) ||
      /WGL: The driver does not appear to support OpenGL/i.test(log) ||
      /ig9ic64\.dll|nvoglv64\.dll|atio6axx\.dll/i.test(log)
    ) {
      const cause = 'Graphics driver failure: GPU does not support required OpenGL version or display driver crashed.';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Update your graphics card drivers from NVIDIA, AMD, or Intel. Ensure your dedicated GPU is selected.',
        category: 'graphics_driver',
        confidence: 'high',
        crashReportPath,
        snippet: 'GLFW error 65542: WGL OpenGL acceleration failure',
      };
    }

    // 4. Mod resolution / incompatibility
    const modIncompatMatch = log.match(/Incompatible mods found!|ModResolutionException|incompatible with version|Mod resolution failed|FormattedException/i);
    if (modIncompatMatch) {
      const cause = 'Mod loader resolution failed: Some installed mods are incompatible with the game or each other.';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Open Mods manager and check installed mod versions or try launching in Safe Mode.',
        category: 'mod_conflict',
        confidence: 'high',
        crashReportPath,
        snippet: modIncompatMatch[0],
      };
    }

    // 5. Mixin application conflict
    if (log.includes('MixinApplyError') || log.includes('Critical injection failure')) {
      const cause = 'Mixin conflict detected between two installed mods modifying the same game bytecode.';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Try launching in Safe Mode or disable overlapping optimization/rendering mods.',
        category: 'mod_conflict',
        confidence: 'high',
        crashReportPath,
        snippet: 'org.spongepowered.asm.mixin.transformer.throwables.MixinApplyError',
      };
    }

    // 6. Loader Bootstrap Failure
    if (log.includes('net.minecraftforge.fml.ModLoadingException') || /FabricLoaderImpl failed to initialize/i.test(log)) {
      const cause = 'Mod loader bootstrap failed during initial classloader setup.';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Verify your mod loader installation or switch to a stable loader version in Installation Settings.',
        category: 'loader_failure',
        confidence: 'medium',
        crashReportPath,
        snippet: 'Mod loader initialization failure',
      };
    }

    // 7. Corrupted Configuration File
    if (log.includes('JsonSyntaxException') || /Failed to parse options\.txt/i.test(log) || /Invalid configuration format/i.test(log)) {
      const cause = 'A mod or game configuration file is corrupted with invalid JSON/TOML syntax.';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Check recent files in the instance "config/" folder or restore configurations from backup.',
        category: 'corrupted_config',
        confidence: 'high',
        crashReportPath,
        snippet: 'JsonSyntaxException: Corrupted configuration file',
      };
    }

    // 8. Missing dependency
    if (log.includes('ClassNotFoundException') || log.includes('NoClassDefFoundError')) {
      const cause = 'A required mod dependency or library is missing.';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Check mod dependencies in the Mod Manager and install required libraries (e.g. Fabric API).',
        category: 'missing_dependency',
        confidence: 'medium',
        crashReportPath,
      };
    }

    // 9. Network / Download Timeout
    if (log.includes('SocketTimeoutException') || log.includes('ConnectException') || /Failed to download library/i.test(log)) {
      const cause = 'Network connection failed during library or asset retrieval.';
      return {
        hasCrash: true,
        exitCode,
        possibleCause: cause,
        suspectedCause: cause,
        suggestedAction: 'Check your internet connection, firewall rules, and try launching again.',
        category: 'network_timeout',
        confidence: 'medium',
        crashReportPath,
      };
    }

    const defaultCause = 'A crash was detected, but no specific known error signature was matched.';
    return {
      hasCrash: true,
      exitCode,
      possibleCause: defaultCause,
      suspectedCause: defaultCause,
      suggestedAction: 'Review the latest crash report or run Fern Safe Mode.',
      category: 'unknown',
      confidence: 'low',
      crashReportPath,
    };
  }

  /**
   * Sanitizes diagnostic and crash report text:
   * Strips Bearer tokens, passwords, session tokens, and local Windows usernames.
   */
  public static sanitizeLog(rawLog: string): string {
    if (!rawLog) return '';

    return rawLog
      // Redact Bearer tokens
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
      // Redact access tokens
      .replace(/--accessToken\s+[^\s]+/gi, '--accessToken [REDACTED]')
      .replace(/"accessToken"\s*:\s*"[^"]+"/gi, '"accessToken": "[REDACTED]"')
      // Redact password fields
      .replace(/"password"\s*:\s*"[^"]+"/gi, '"password": "[REDACTED]"')
      // Redact Windows user home paths
      .replace(/[a-zA-Z]:\\Users\\[^\\]+/gi, 'C:\\Users\\[USER]');
  }
}
