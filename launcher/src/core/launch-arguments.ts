export type JvmTier = 'Recommended' | 'Advanced' | 'Custom';

export interface JvmArgValidation {
  arg: string;
  tier: JvmTier;
  isSafe: boolean;
  warning?: string;
}

export class LaunchArgumentValidator {
  private static readonly DEPRECATED_FLAGS = [
    { flag: '-XX:+UseConcMarkSweepGC', warning: 'CMS Garbage Collector is removed in Java 14+ and will crash modern Java.' },
    { flag: '-XX:+UseParallelGC', warning: 'Parallel GC may cause micro-stutters in client rendering. G1GC is recommended.' },
    { flag: '--illegal-access=permit', warning: 'Illegal access flag is obsolete in Java 17+.' },
    { flag: '-XX:+AggressiveOpts', warning: 'AggressiveOpts was removed in Java 12 and will crash or be ignored.' },
    { flag: '-Xincgc', warning: 'Incremental GC was removed in Java 9.' },
  ];

  public static validateArgs(args: string[], javaMajorVersion: number = 21): {
    isValid: boolean;
    allValid: boolean;
    warnings: string[];
    results: JvmArgValidation[];
    categorized: {
      recommended: JvmArgValidation[];
      advanced: JvmArgValidation[];
      custom: JvmArgValidation[];
    };
  } {
    const warnings: string[] = [];
    const results: JvmArgValidation[] = [];
    let allValid = true;

    for (const arg of args) {
      const trimmed = arg.trim();
      if (!trimmed) continue;

      // Check for shell injection / command chaining characters
      if (/[;&|><`$]/.test(trimmed)) {
        allValid = false;
        const msg = `Forbidden special character in JVM argument: "${trimmed}"`;
        warnings.push(msg);
        results.push({ arg: trimmed, tier: 'Custom', isSafe: false, warning: msg });
        continue;
      }

      // Check deprecated flags
      const deprecated = this.DEPRECATED_FLAGS.find((d) => trimmed.startsWith(d.flag));
      if (deprecated) {
        const warnMsg = `Argument "${deprecated.flag}" is deprecated or unsupported: ${deprecated.warning}`;
        warnings.push(warnMsg);
        results.push({ arg: trimmed, tier: 'Custom', isSafe: false, warning: warnMsg });
        continue;
      }

      // Check tier
      if (
        trimmed.startsWith('-XX:+UseG1GC') ||
        trimmed.startsWith('-Xms') ||
        trimmed.startsWith('-Xmx') ||
        trimmed.startsWith('-Djava.net.preferIPv4Stack') ||
        trimmed.startsWith('-Dfern.') ||
        trimmed.startsWith('--fern')
      ) {
        results.push({ arg: trimmed, tier: 'Recommended', isSafe: true });
      } else if (trimmed.startsWith('-XX:')) {
        results.push({ arg: trimmed, tier: 'Advanced', isSafe: true });
      } else {
        results.push({ arg: trimmed, tier: 'Custom', isSafe: true });
      }
    }

    return {
      isValid: allValid,
      allValid,
      warnings,
      results,
      categorized: {
        recommended: results.filter((r) => r.tier === 'Recommended'),
        advanced: results.filter((r) => r.tier === 'Advanced'),
        custom: results.filter((r) => r.tier === 'Custom'),
      },
    };
  }

  public static validateMemoryArgs(
    minMb: number,
    maxMb: number,
    systemRamMb?: number
  ): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isValid = true;

    if (minMb > maxMb) {
      isValid = false;
      warnings.push(`Initial heap (-Xms ${minMb}MB) cannot exceed maximum heap (-Xmx ${maxMb}MB).`);
    }

    if (maxMb < 1024) {
      warnings.push(`Allocated heap (${maxMb}MB) is less than 1GB. Minecraft may exhaust memory on startup.`);
    }

    if (systemRamMb && systemRamMb > 0 && maxMb > systemRamMb * 0.85) {
      warnings.push(
        `Allocating ${maxMb}MB exceeds 85% of total system RAM (${systemRamMb}MB). Windows may become unresponsive.`
      );
    }

    return { isValid, warnings };
  }
}
