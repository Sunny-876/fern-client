import { Mod } from '../../../shared/models/mod';
import { Installation } from '../../../shared/models/installation';

export type CompatibilityStatus =
  | 'compatible'
  | 'warning'
  | 'incompatible'
  | 'missing_dependency'
  | 'unknown';

export interface CompatibilityIssue {
  type:
    | 'java'
    | 'loader'
    | 'mod_dependency'
    | 'mod_conflict'
    | 'memory'
    | 'resource_pack'
    | 'shader_pack';
  status: CompatibilityStatus;
  code: string;
  title: string;
  explanation: string;
  suggestedResolution: string;
  affectedComponent: string;
  isFatal: boolean;
}

export interface CompatibilityCheckInput {
  minecraftVersion: string;
  javaMajorVersion: number;
  loader: string; // 'vanilla' | 'fabric' | 'neoforge' | 'forge' | 'quilt'
  loaderVersion?: string;
  installedMods?: Array<{
    id: string;
    name: string;
    version?: string;
    loaders?: string[];
    dependencies?: Array<{
      id: string;
      name?: string;
      type: 'required' | 'optional' | 'incompatible';
      versionRange?: string;
    }>;
    enabled?: boolean;
  }>;
  minRamMb?: number;
  allocatedRamMb?: number;
  totalSystemRamMb?: number;
  resourcePacks?: Array<{ name: string; packFormat?: number }>;
  shaderPacks?: Array<{ name: string; enabled?: boolean }>;
}

export interface CompatibilityReport {
  overallStatus: CompatibilityStatus;
  isPlayable: boolean;
  issues: CompatibilityIssue[];
  checkedAt: string;
  summary: string;
}

export class CompatibilityEngine {
  /**
   * Unified entry point: validates full compatibility between Minecraft version,
   * Java runtime, Mod loader, installed mods, and memory configuration.
   */
  public evaluate(input: CompatibilityCheckInput): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];

    // 1. Validate Minecraft <-> Java Runtime Compatibility
    this.checkJavaCompatibility(input, issues);

    // 2. Validate Minecraft <-> Mod Loader Compatibility
    this.checkLoaderCompatibility(input, issues);

    // 3. Validate Mod Loaders, Dependencies & Incompatibilities
    this.checkModCompatibility(input, issues);

    // 4. Validate Memory Allocation Boundaries
    this.checkMemoryLimits(input, issues);

    // 5. Validate Shader Pack & Graphic Mod Requirements
    this.checkShaderPackCompatibility(input, issues);

    // Determine Overall Status
    let overallStatus: CompatibilityStatus = 'compatible';
    const hasIncompatible = issues.some((i) => i.status === 'incompatible');
    const hasMissing = issues.some((i) => i.status === 'missing_dependency');
    const hasWarning = issues.some((i) => i.status === 'warning');
    const hasUnknown = issues.some((i) => i.status === 'unknown');

    if (hasIncompatible) {
      overallStatus = 'incompatible';
    } else if (hasMissing) {
      overallStatus = 'missing_dependency';
    } else if (hasWarning) {
      overallStatus = 'warning';
    } else if (hasUnknown) {
      overallStatus = 'unknown';
    }

    const isPlayable = !hasIncompatible && !hasMissing;

    let summary = 'Configuration is fully compatible.';
    if (!isPlayable) {
      summary = `Found ${issues.filter((i) => i.isFatal).length} critical incompatibility issue(s) preventing launch.`;
    } else if (hasWarning) {
      summary = `Configuration is playable with ${issues.length} operational warning(s).`;
    }

    return {
      overallStatus,
      isPlayable,
      issues,
      checkedAt: new Date().toISOString(),
      summary,
    };
  }

  /**
   * Evaluates Java version requirements for official Minecraft releases.
   */
  private checkJavaCompatibility(input: CompatibilityCheckInput, issues: CompatibilityIssue[]): void {
    const mc = input.minecraftVersion;
    const java = input.javaMajorVersion;

    if (!mc || java <= 0) {
      issues.push({
        type: 'java',
        status: 'unknown',
        code: 'JAVA_VERSION_UNKNOWN',
        title: 'Unverified Java Environment',
        explanation: 'Could not determine Minecraft release version or Java runtime version.',
        suggestedResolution: 'Verify Java installation in launcher Settings > Java.',
        affectedComponent: 'Java Runtime',
        isFatal: false,
      });
      return;
    }

    // Modern Minecraft 1.20.5 & 1.21.x strictly requires Java 21+
    if (this.isVersionAtLeast(mc, '1.20.5')) {
      if (java < 21) {
        issues.push({
          type: 'java',
          status: 'incompatible',
          code: 'JAVA_21_REQUIRED',
          title: 'Java 21 LTS Required',
          explanation: `Minecraft ${mc} is compiled with class file version 65 (Java 21). Found Java ${java}.`,
          suggestedResolution: 'Install Eclipse Adoptium Temurin 21 or Microsoft OpenJDK 21 LTS.',
          affectedComponent: `Java ${java}`,
          isFatal: true,
        });
      }
    }
    // Minecraft 1.18 to 1.20.4 strictly requires Java 17+
    else if (this.isVersionAtLeast(mc, '1.18')) {
      if (java < 17) {
        issues.push({
          type: 'java',
          status: 'incompatible',
          code: 'JAVA_17_REQUIRED',
          title: 'Java 17 LTS Required',
          explanation: `Minecraft ${mc} requires Java 17 or higher. Found Java ${java}.`,
          suggestedResolution: 'Select or install a Java 17 or Java 21 runtime.',
          affectedComponent: `Java ${java}`,
          isFatal: true,
        });
      }
    }
    // Legacy Minecraft <= 1.16.5 requires Java 8
    else {
      if (java > 16) {
        issues.push({
          type: 'java',
          status: 'warning',
          code: 'LEGACY_JAVA_WARNING',
          title: 'Legacy Minecraft Java Compatibility',
          explanation: `Minecraft ${mc} was developed for Java 8. Running on Java ${java} may cause reflection or security manager errors on older mod loaders.`,
          suggestedResolution: 'If crashes occur, configure Java 8 in Installation Settings.',
          affectedComponent: `Java ${java}`,
          isFatal: false,
        });
      }
    }
  }

  /**
   * Evaluates Mod Loader compatibility against Minecraft version.
   */
  private checkLoaderCompatibility(input: CompatibilityCheckInput, issues: CompatibilityIssue[]): void {
    const mc = input.minecraftVersion;
    const loader = (input.loader || 'vanilla').toLowerCase();

    if (loader === 'vanilla') return;

    if (loader === 'neoforge') {
      // NeoForge split from Forge on 1.20.2
      if (!this.isVersionAtLeast(mc, '1.20.2')) {
        issues.push({
          type: 'loader',
          status: 'incompatible',
          code: 'NEOFORGE_VERSION_UNSUPPORTED',
          title: 'NeoForge Version Mismatch',
          explanation: `NeoForge only supports Minecraft 1.20.2 and newer releases. Target version is ${mc}.`,
          suggestedResolution: 'Switch mod loader to Forge or Fabric for Minecraft versions older than 1.20.2.',
          affectedComponent: 'NeoForge',
          isFatal: true,
        });
      }
    }
  }

  /**
   * Evaluates installed mods for loader compatibility, declared dependencies, and conflicting pairs.
   */
  private checkModCompatibility(input: CompatibilityCheckInput, issues: CompatibilityIssue[]): void {
    if (!input.installedMods || input.installedMods.length === 0) return;

    const currentLoader = (input.loader || 'vanilla').toLowerCase();
    const activeMods = input.installedMods.filter((m) => m.enabled !== false);
    const installedIds = new Set<string>();

    for (const m of activeMods) {
      installedIds.add(m.id.toLowerCase());
      installedIds.add(m.name.toLowerCase().replace(/[\s_]+/g, '-'));
    }

    for (const mod of activeMods) {
      // 1. Check Loader Compatibility
      if (currentLoader !== 'vanilla' && mod.loaders && mod.loaders.length > 0) {
        const modLoaders = mod.loaders.map((l) => l.toLowerCase());
        const canRun =
          modLoaders.includes(currentLoader) ||
          (currentLoader === 'quilt' && modLoaders.includes('fabric'));

        if (!canRun) {
          issues.push({
            type: 'loader',
            status: 'incompatible',
            code: 'MOD_LOADER_INCOMPATIBLE',
            title: `Mod "${mod.name}" Requires Different Loader`,
            explanation: `Mod requires [${mod.loaders.join(', ')}], but current installation uses [${input.loader}].`,
            suggestedResolution: `Disable "${mod.name}" or switch installation loader to ${mod.loaders[0]}.`,
            affectedComponent: mod.name,
            isFatal: true,
          });
        }
      }

      // 2. Check Dependencies
      if (mod.dependencies && mod.dependencies.length > 0) {
        for (const dep of mod.dependencies) {
          const depId = dep.id.toLowerCase();

          if (dep.type === 'required') {
            const isInstalled =
              installedIds.has(depId) ||
              activeMods.some((m) => m.id.toLowerCase().includes(depId) || m.name.toLowerCase().includes(depId));

            if (!isInstalled) {
              issues.push({
                type: 'mod_dependency',
                status: 'missing_dependency',
                code: 'MISSING_REQUIRED_DEPENDENCY',
                title: `Missing Dependency: ${dep.name || dep.id}`,
                explanation: `Mod "${mod.name}" requires "${dep.name || dep.id}" to run.`,
                suggestedResolution: `Download and install "${dep.name || dep.id}" into instance mods directory.`,
                affectedComponent: mod.name,
                isFatal: true,
              });
            }
          } else if (dep.type === 'incompatible') {
            const hasConflict =
              installedIds.has(depId) ||
              activeMods.some((m) => m.id.toLowerCase().includes(depId) || m.name.toLowerCase().includes(depId));

            if (hasConflict) {
              issues.push({
                type: 'mod_conflict',
                status: 'incompatible',
                code: 'MOD_MUTUAL_CONFLICT',
                title: `Incompatible Mods: "${mod.name}" and "${dep.name || dep.id}"`,
                explanation: `"${mod.name}" cannot be used simultaneously with "${dep.name || dep.id}".`,
                suggestedResolution: `Remove or disable one of the conflicting mods.`,
                affectedComponent: `${mod.name} <-> ${dep.name || dep.id}`,
                isFatal: true,
              });
            }
          }
        }
      }
    }

    // Special known conflict check: OptiFine vs Sodium / Iris
    const hasOptifine = activeMods.some((m) => m.id.toLowerCase().includes('optifine') || m.name.toLowerCase().includes('optifine'));
    const hasSodium = activeMods.some((m) => m.id.toLowerCase().includes('sodium') || m.name.toLowerCase().includes('sodium'));
    const hasIris = activeMods.some((m) => m.id.toLowerCase().includes('iris') || m.name.toLowerCase().includes('iris'));

    if (hasOptifine && (hasSodium || hasIris)) {
      issues.push({
        type: 'mod_conflict',
        status: 'incompatible',
        code: 'OPTIFINE_SODIUM_CONFLICT',
        title: 'Conflicting Rendering Engines: OptiFine & Sodium/Iris',
        explanation: 'OptiFine and Sodium rewrite the same Minecraft rendering pipeline and crash if loaded together.',
        suggestedResolution: 'Use Sodium + Iris for modern Fabric/NeoForge shaders, or OptiFine alone on legacy Forge.',
        affectedComponent: 'OptiFine + Sodium',
        isFatal: true,
      });
    }
  }

  /**
   * Validates RAM boundaries against minimum thresholds and total available hardware RAM.
   */
  private checkMemoryLimits(input: CompatibilityCheckInput, issues: CompatibilityIssue[]): void {
    const allocated = input.allocatedRamMb;
    const minRam = input.minRamMb;
    const total = input.totalSystemRamMb;

    if (allocated !== undefined && minRam !== undefined && minRam > allocated) {
      issues.push({
        type: 'memory',
        status: 'incompatible',
        code: 'MIN_RAM_EXCEEDS_MAX',
        title: 'Invalid JVM Heap Limits',
        explanation: `Minimum memory (${minRam} MB) cannot be greater than Maximum memory (${allocated} MB).`,
        suggestedResolution: 'Adjust RAM sliders in Settings so Min RAM is less than or equal to Max RAM.',
        affectedComponent: 'JVM Memory Settings',
        isFatal: true,
      });
    }

    if (allocated !== undefined && allocated < 1024) {
      issues.push({
        type: 'memory',
        status: 'warning',
        code: 'RAM_ALLOCATION_TOO_LOW',
        title: 'Very Low Memory Allocation',
        explanation: `Allocating only ${allocated} MB of RAM will likely cause OutOfMemory crashes during world loading.`,
        suggestedResolution: 'Increase allocated RAM to at least 2048 MB (2 GB).',
        affectedComponent: `${allocated} MB RAM`,
        isFatal: false,
      });
    }

    if (allocated !== undefined && total !== undefined && total > 0 && allocated > total * 0.85) {
      issues.push({
        type: 'memory',
        status: 'warning',
        code: 'RAM_ALLOCATION_EXCEEDS_RECOMMENDED',
        title: 'High Physical Memory Allocation',
        explanation: `Allocating ${allocated} MB (>85% of total ${total} MB system RAM) may cause Windows system freezing or swap thrashing.`,
        suggestedResolution: `Reduce allocated RAM to at most ${Math.floor(total * 0.75)} MB.`,
        affectedComponent: `${allocated} MB RAM`,
        isFatal: false,
      });
    }
  }

  /**
   * Validates shader packs against installed shader-compatible mods (Iris or OptiFine).
   */
  private checkShaderPackCompatibility(input: CompatibilityCheckInput, issues: CompatibilityIssue[]): void {
    const activeShaders = input.shaderPacks?.filter((s) => s.enabled);
    if (!activeShaders || activeShaders.length === 0) return;

    const activeMods = input.installedMods?.filter((m) => m.enabled !== false) || [];
    const hasShaderMod = activeMods.some(
      (m) =>
        m.id.toLowerCase().includes('iris') ||
        m.id.toLowerCase().includes('oculus') ||
        m.id.toLowerCase().includes('optifine')
    );

    if (!hasShaderMod) {
      issues.push({
        type: 'shader_pack',
        status: 'warning',
        code: 'MISSING_SHADER_RENDERER',
        title: 'Shader Pack Active Without Shader Mod',
        explanation: `A shader pack is enabled, but neither Iris, Oculus, nor OptiFine is installed. Shaders will not render in-game.`,
        suggestedResolution: 'Install Iris (Fabric/NeoForge) or Oculus (Forge) to enable shader rendering.',
        affectedComponent: activeShaders[0].name,
        isFatal: false,
      });
    }
  }

  /**
   * Semver comparison helper (supports versions like 1.21.4, 1.20.5, 1.18).
   */
  private isVersionAtLeast(version: string, minimum: string): boolean {
    const vParts = version.split('.').map((p) => parseInt(p, 10) || 0);
    const mParts = minimum.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < Math.max(vParts.length, mParts.length); i++) {
      const v = vParts[i] || 0;
      const m = mParts[i] || 0;
      if (v > m) return true;
      if (v < m) return false;
    }
    return true;
  }
}
