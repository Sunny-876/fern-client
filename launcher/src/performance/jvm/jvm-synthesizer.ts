import { JvmArgumentSpec } from '../../../../shared/models/performance';

export interface JvmSynthesisOptions {
  javaMajorVersion: number;
  allocatedRamMb: number;
  minecraftVersion: string;
  isSafeMode?: boolean;
  preferZgc?: boolean;
}

export class JvmSynthesizer {
  /**
   * Generates evidence-based, documented JVM arguments tailored to the environment.
   */
  public synthesizeArguments(options: JvmSynthesisOptions): JvmArgumentSpec[] {
    const specs: JvmArgumentSpec[] = [];
    const { javaMajorVersion, allocatedRamMb, preferZgc, isSafeMode } = options;

    // 1. Heap sizing
    specs.push({
      flag: `-Xms${allocatedRamMb}M`,
      reason: 'Sets initial heap size equal to max heap to eliminate runtime heap resizing overhead.',
      category: 'heap',
    });
    specs.push({
      flag: `-Xmx${allocatedRamMb}M`,
      reason: 'Sets maximum heap allocation boundary based on system and installation configuration.',
      category: 'heap',
    });

    // 2. Garbage Collector Selection
    // If Java 21+ with high RAM (>= 12GB) and user requests ZGC: Generational ZGC
    const canUseGenerationalZgc = javaMajorVersion >= 21 && allocatedRamMb >= 12288 && preferZgc && !isSafeMode;

    if (canUseGenerationalZgc) {
      specs.push({
        flag: '-XX:+UseZGC',
        reason: 'Enables ultra-low latency ZGC suitable for large heaps.',
        category: 'gc',
        minJavaVersion: 21,
      });
      specs.push({
        flag: '-XX:+ZGenerational',
        reason: 'Enables generational mode in ZGC for vastly improved allocation throughput in Java 21+.',
        category: 'gc',
        minJavaVersion: 21,
      });
    } else {
      // Default standard: G1GC (proven stability across all Minecraft workloads)
      specs.push({
        flag: '-XX:+UseG1GC',
        reason: 'Enables the Garbage-First collector, balancing high throughput and predictable low pauses.',
        category: 'gc',
      });
      specs.push({
        flag: '-XX:MaxGCPauseMillis=50',
        reason: 'Sets target pause time goal to 50ms, helping maintain smooth 60+ FPS without GC micro-stutter.',
        category: 'gc',
      });
      specs.push({
        flag: '-XX:+ParallelRefProcEnabled',
        reason: 'Processes soft/weak/phantom references in parallel threads during GC pauses.',
        category: 'gc',
      });

      if (!isSafeMode) {
        specs.push({
          flag: '-XX:G1NewSizePercent=20',
          reason: 'Ensures young generation does not shrink excessively, reducing young GC frequency.',
          category: 'gc',
        });
        specs.push({
          flag: '-XX:G1ReservePercent=15',
          reason: 'Reserves 15% heap headroom to prevent evacuation failures and fallback full GCs.',
          category: 'gc',
        });
        specs.push({
          flag: '-XX:InitiatingHeapOccupancyPercent=45',
          reason: 'Starts concurrent background marking early (45% occupancy) to avoid allocation spikes.',
          category: 'gc',
        });

        // Heap region size tuning
        if (allocatedRamMb >= 8192) {
          specs.push({
            flag: '-XX:G1HeapRegionSize=32M',
            reason: 'Sets 32MB G1 region size for large heaps to minimize card-table and region bookkeeping.',
            category: 'gc',
          });
        } else if (allocatedRamMb >= 4096) {
          specs.push({
            flag: '-XX:G1HeapRegionSize=16M',
            reason: 'Sets 16MB G1 region size for medium heaps to optimize object allocation granularity.',
            category: 'gc',
          });
        }
      }
    }

    // 3. JVM System & Memory Optimizations
    if (javaMajorVersion >= 11 && !isSafeMode) {
      specs.push({
        flag: '-XX:+AlwaysPreTouch',
        reason: 'Pre-touches committed memory pages on startup, preventing page-fault latency spikes during active gameplay.',
        category: 'optimization',
        minJavaVersion: 11,
      });
    }

    // Modern Java module export permissions for loaders (Fabric/Forge on Java 17+)
    if (javaMajorVersion >= 17) {
      specs.push({
        flag: '-Dfile.encoding=UTF-8',
        reason: 'Enforces UTF-8 character encoding consistency across all platforms and file systems.',
        category: 'system',
      });
    }

    return specs;
  }

  /**
   * Returns flat list of argument strings ready for process execution.
   */
  public generateArgumentList(options: JvmSynthesisOptions): string[] {
    const specs = this.synthesizeArguments(options);
    return specs.map((s) => s.flag);
  }
}
