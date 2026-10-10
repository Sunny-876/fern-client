export type SupportTier =
  | 'SUPPORTED_AND_TESTED'
  | 'SUPPORTED_WITH_LIMITATIONS'
  | 'EXPERIMENTAL'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export interface MatrixItemEvaluation {
  tier: SupportTier;
  target: string;
  category: 'os' | 'minecraft' | 'java' | 'loader' | 'modpack' | 'resourcepack' | 'shader';
  notes: string;
  recommendedAlternatives?: string[];
}

export interface EnvironmentSpec {
  osName?: string; // e.g. "Windows 11 23H2" or "Windows 7"
  minecraftVersion: string;
  javaMajorVersion: number;
  loader?: 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt';
  loaderVersion?: string;
  packFormat?: number;
  shaderMod?: 'iris' | 'oculus' | 'optifine' | 'none';
}

export interface CompatibilityMatrixResult {
  overallTier: SupportTier;
  isRunnable: boolean;
  evaluations: MatrixItemEvaluation[];
  warnings: string[];
  blockers: string[];
}

export class CompatibilityMatrixService {
  /**
   * Evaluates an OS environment against support specifications.
   */
  public evaluateOS(osName = 'Windows 11'): MatrixItemEvaluation {
    const lower = osName.toLowerCase();
    if (lower.includes('windows 11') || lower.includes('windows 10')) {
      return {
        tier: 'SUPPORTED_AND_TESTED',
        target: osName,
        category: 'os',
        notes: 'Official first-class Windows platform target.',
      };
    }
    if (lower.includes('windows 8') || lower.includes('windows 7')) {
      return {
        tier: 'UNSUPPORTED',
        target: osName,
        category: 'os',
        notes: 'End-of-life Windows release; Electron and Chromium runtime security guarantees are no longer maintained.',
        recommendedAlternatives: ['Upgrade to Windows 10 22H2 or Windows 11'],
      };
    }
    if (lower.includes('linux') || lower.includes('darwin') || lower.includes('mac')) {
      return {
        tier: 'EXPERIMENTAL',
        target: osName,
        category: 'os',
        notes: 'Non-Windows system running under community compatibility mode.',
      };
    }
    return {
      tier: 'UNKNOWN',
      target: osName,
      category: 'os',
      notes: 'Unrecognized operating system version.',
    };
  }

  /**
   * Evaluates Minecraft and Java runtime pairing.
   */
  public evaluateMinecraftAndJava(mcVersion: string, javaMajor: number): MatrixItemEvaluation[] {
    const results: MatrixItemEvaluation[] = [];

    // Minecraft version check
    if (['1.21.4', '1.21.1', '1.20.4', '1.20.1'].includes(mcVersion)) {
      results.push({
        tier: 'SUPPORTED_AND_TESTED',
        target: mcVersion,
        category: 'minecraft',
        notes: 'Primary release target with verified automated benchmarks.',
      });
    } else if (['1.19.4', '1.18.2', '1.16.5'].includes(mcVersion)) {
      results.push({
        tier: 'SUPPORTED_WITH_LIMITATIONS',
        target: mcVersion,
        category: 'minecraft',
        notes: 'Supported legacy release; requires matching Java LTS runtime.',
      });
    } else if (['1.12.2', '1.8.9'].includes(mcVersion)) {
      results.push({
        tier: 'SUPPORTED_WITH_LIMITATIONS',
        target: mcVersion,
        category: 'minecraft',
        notes: 'Vintage release requiring Java 8.',
      });
    } else {
      results.push({
        tier: 'EXPERIMENTAL',
        target: mcVersion,
        category: 'minecraft',
        notes: 'Unverified Minecraft version release.',
      });
    }

    // Java LTS pairing requirements
    if (mcVersion.startsWith('1.21') || mcVersion.startsWith('1.20.5')) {
      if (javaMajor >= 21) {
        results.push({
          tier: 'SUPPORTED_AND_TESTED',
          target: `Java ${javaMajor}`,
          category: 'java',
          notes: 'Standard Java 21 LTS runtime for modern Minecraft.',
        });
      } else {
        results.push({
          tier: 'UNSUPPORTED',
          target: `Java ${javaMajor}`,
          category: 'java',
          notes: `Minecraft ${mcVersion} requires Java 21 or newer (found Java ${javaMajor}).`,
          recommendedAlternatives: ['Install Eclipse Temurin or Azul Zulu Java 21 LTS'],
        });
      }
    } else if (mcVersion.startsWith('1.18') || mcVersion.startsWith('1.19') || mcVersion.startsWith('1.20')) {
      if (javaMajor >= 17) {
        results.push({
          tier: 'SUPPORTED_AND_TESTED',
          target: `Java ${javaMajor}`,
          category: 'java',
          notes: 'Java 17 LTS runtime for Minecraft 1.18 - 1.20.4.',
        });
      } else {
        results.push({
          tier: 'UNSUPPORTED',
          target: `Java ${javaMajor}`,
          category: 'java',
          notes: `Minecraft ${mcVersion} requires Java 17 (found Java ${javaMajor}).`,
          recommendedAlternatives: ['Install Java 17 LTS'],
        });
      }
    } else if (mcVersion.startsWith('1.8') || mcVersion.startsWith('1.12')) {
      if (javaMajor === 8) {
        results.push({
          tier: 'SUPPORTED_AND_TESTED',
          target: `Java ${javaMajor}`,
          category: 'java',
          notes: 'Java 8 runtime for legacy Minecraft 1.8.9 / 1.12.2.',
        });
      } else {
        results.push({
          tier: 'SUPPORTED_WITH_LIMITATIONS',
          target: `Java ${javaMajor}`,
          category: 'java',
          notes: `Older Minecraft versions may fail to launch on Java ${javaMajor} without legacy java agent flags.`,
          recommendedAlternatives: ['Install Java 8 for 1.8.9/1.12.2'],
        });
      }
    }

    return results;
  }

  /**
   * Evaluates mod loader pairing.
   */
  public evaluateLoader(
    loader: EnvironmentSpec['loader'] = 'vanilla',
    mcVersion: string
  ): MatrixItemEvaluation {
    if (loader === 'vanilla') {
      return {
        tier: 'SUPPORTED_AND_TESTED',
        target: 'Vanilla',
        category: 'loader',
        notes: 'Clean official Mojang runtime.',
      };
    }
    if (loader === 'fabric') {
      return {
        tier: 'SUPPORTED_AND_TESTED',
        target: 'Fabric',
        category: 'loader',
        notes: 'Primary supported mod loader for Fern Client on modern versions.',
      };
    }
    if (loader === 'forge') {
      if (mcVersion === '1.20.1' || mcVersion.startsWith('1.19') || mcVersion.startsWith('1.16')) {
        return {
          tier: 'SUPPORTED_AND_TESTED',
          target: 'Forge',
          category: 'loader',
          notes: 'Tested on 1.20.1 and legacy Forge ecosystems.',
        };
      }
      return {
        tier: 'SUPPORTED_WITH_LIMITATIONS',
        target: 'Forge',
        category: 'loader',
        notes: 'Modern 1.21 Forge split with NeoForge; prefer NeoForge or Fabric on 1.21.',
      };
    }
    if (loader === 'neoforge') {
      if (mcVersion.startsWith('1.21') || mcVersion.startsWith('1.20.4')) {
        return {
          tier: 'SUPPORTED_AND_TESTED',
          target: 'NeoForge',
          category: 'loader',
          notes: 'Tested NeoForge runtime for 1.20.4+ and 1.21+.',
        };
      }
      return {
        tier: 'EXPERIMENTAL',
        target: 'NeoForge',
        category: 'loader',
        notes: 'NeoForge is not formally available on versions prior to 1.20.2.',
      };
    }
    if (loader === 'quilt') {
      return {
        tier: 'EXPERIMENTAL',
        target: 'Quilt',
        category: 'loader',
        notes: 'Quilt loader running with Fabric compatibility layer.',
      };
    }
    return {
      tier: 'UNKNOWN',
      target: String(loader),
      category: 'loader',
      notes: 'Unrecognized mod loader.',
    };
  }

  /**
   * Evaluates shader integration pipeline.
   */
  public evaluateShader(shaderMod: EnvironmentSpec['shaderMod'] = 'none'): MatrixItemEvaluation {
    if (shaderMod === 'none') {
      return {
        tier: 'SUPPORTED_AND_TESTED',
        target: 'None',
        category: 'shader',
        notes: 'Native standard Minecraft rendering pipeline.',
      };
    }
    if (shaderMod === 'iris') {
      return {
        tier: 'SUPPORTED_AND_TESTED',
        target: 'Iris',
        category: 'shader',
        notes: 'Fully integrated with Fern shader preset management on Fabric/NeoForge.',
      };
    }
    if (shaderMod === 'oculus') {
      return {
        tier: 'SUPPORTED_AND_TESTED',
        target: 'Oculus',
        category: 'shader',
        notes: 'Tested on Forge and NeoForge environments.',
      };
    }
    if (shaderMod === 'optifine') {
      return {
        tier: 'SUPPORTED_WITH_LIMITATIONS',
        target: 'OptiFine',
        category: 'shader',
        notes: 'Closed-source pipeline; may conflict with Sodium or modern Fabric mods.',
        recommendedAlternatives: ['Use Iris + Sodium for modern Fabric/NeoForge setups'],
      };
    }
    return {
      tier: 'UNKNOWN',
      target: String(shaderMod),
      category: 'shader',
      notes: 'Unrecognized shader mod pipeline.',
    };
  }

  /**
   * Full environment evaluation.
   */
  public evaluateEnvironment(spec: EnvironmentSpec): CompatibilityMatrixResult {
    const evaluations: MatrixItemEvaluation[] = [];
    const warnings: string[] = [];
    const blockers: string[] = [];

    // 1. OS
    const osEval = this.evaluateOS(spec.osName);
    evaluations.push(osEval);
    if (osEval.tier === 'UNSUPPORTED') blockers.push(osEval.notes);
    else if (osEval.tier === 'SUPPORTED_WITH_LIMITATIONS' || osEval.tier === 'EXPERIMENTAL') warnings.push(osEval.notes);

    // 2. Minecraft & Java
    const mcJavaEvals = this.evaluateMinecraftAndJava(spec.minecraftVersion, spec.javaMajorVersion);
    for (const ev of mcJavaEvals) {
      evaluations.push(ev);
      if (ev.tier === 'UNSUPPORTED') blockers.push(ev.notes);
      else if (ev.tier === 'SUPPORTED_WITH_LIMITATIONS' || ev.tier === 'EXPERIMENTAL') warnings.push(ev.notes);
    }

    // 3. Loader
    const loaderEval = this.evaluateLoader(spec.loader, spec.minecraftVersion);
    evaluations.push(loaderEval);
    if (loaderEval.tier === 'UNSUPPORTED') blockers.push(loaderEval.notes);
    else if (loaderEval.tier === 'SUPPORTED_WITH_LIMITATIONS' || loaderEval.tier === 'EXPERIMENTAL') warnings.push(loaderEval.notes);

    // 4. Shader
    const shaderEval = this.evaluateShader(spec.shaderMod);
    evaluations.push(shaderEval);
    if (shaderEval.tier === 'UNSUPPORTED') blockers.push(shaderEval.notes);
    else if (shaderEval.tier === 'SUPPORTED_WITH_LIMITATIONS') warnings.push(shaderEval.notes);

    // Overall tier determination
    let overallTier: SupportTier = 'SUPPORTED_AND_TESTED';
    if (blockers.length > 0) {
      overallTier = 'UNSUPPORTED';
    } else if (evaluations.some((e) => e.tier === 'EXPERIMENTAL')) {
      overallTier = 'EXPERIMENTAL';
    } else if (evaluations.some((e) => e.tier === 'SUPPORTED_WITH_LIMITATIONS')) {
      overallTier = 'SUPPORTED_WITH_LIMITATIONS';
    }

    return {
      overallTier,
      isRunnable: blockers.length === 0,
      evaluations,
      warnings,
      blockers,
    };
  }
}
