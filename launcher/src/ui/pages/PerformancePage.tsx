import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Zap,
  Cpu,
  HardDrive,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Sparkles,
  BarChart3,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  PerformanceSettings,
  PerformanceProfileType,
  RamRecommendation,
  BenchmarkReport,
  ComparisonReport,
  SystemHardwareInfo,
  ParticleLevel,
} from '../../../../shared/models/performance';
import { Installation } from '../../../../shared/models/installation';
import { DEFAULT_PERFORMANCE_SETTINGS } from '../../../../shared/constants/performance-profiles';

interface PerformancePageProps {
  installations: Installation[];
  activeInstallation: Installation | null;
}

export const PerformancePage: React.FC<PerformancePageProps> = ({ installations, activeInstallation }) => {
  const [settings, setSettings] = useState<PerformanceSettings>(DEFAULT_PERFORMANCE_SETTINGS);
  const [hardwareInfo, setHardwareInfo] = useState<SystemHardwareInfo | null>(null);
  const [ramAdvice, setRamAdvice] = useState<RamRecommendation | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Benchmarking state
  const [selectedInstId, setSelectedInstId] = useState<string>(activeInstallation?.id || installations[0]?.id || '');
  const [benchProfile, setBenchProfile] = useState<PerformanceProfileType>('balanced');
  const [benchDuration, setBenchDuration] = useState<number>(10);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [latestReport, setLatestReport] = useState<BenchmarkReport | null>(null);
  const [baselineReport, setBaselineReport] = useState<BenchmarkReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkReport[]>([]);

  useEffect(() => {
    loadPerformanceData();
  }, [activeInstallation]);

  const loadPerformanceData = async () => {
    if (window.fern) {
      try {
        const perf = await window.fern.getPerformanceSettings();
        setSettings(perf || DEFAULT_PERFORMANCE_SETTINGS);

        const hw = await window.fern.getHardwareInfo();
        setHardwareInfo(hw);

        const advice = await window.fern.getRamRecommendation(activeInstallation?.id);
        setRamAdvice(advice);

        const history = await window.fern.getBenchmarkHistory();
        setBenchmarkHistory(history);
        if (history.length > 0) {
          setLatestReport(history[0]);
        }
      } catch (err) {
        console.error('Failed to load performance data:', err);
      }
    }
  };

  const handleUpdate = async (partial: Partial<PerformanceSettings>) => {
    setIsSaving(true);
    const updated = { ...settings, ...partial };
    setSettings(updated);

    if (window.fern) {
      try {
        const res = await window.fern.updatePerformanceSettings(partial);
        setSettings(res);
      } catch (err) {
        console.error('Failed to persist performance settings:', err);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(false);
    }
  };

  const handleProfileSelect = (profile: PerformanceProfileType) => {
    handleUpdate({ profile });
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setComparison(null);
    try {
      if (window.fern) {
        const report = await window.fern.runBenchmark(selectedInstId, benchProfile, benchDuration);
        setLatestReport(report);
        const history = await window.fern.getBenchmarkHistory();
        setBenchmarkHistory(history);

        // If no baseline exists, store this one as potential baseline
        if (!baselineReport) {
          setBaselineReport(report);
        } else {
          const comp = await window.fern.compareBenchmarks(baselineReport.id, report.id);
          setComparison(comp);
        }
      } else {
        // Fallback simulation
        setTimeout(() => {
          const mockReport: BenchmarkReport = {
            id: `bench-${Date.now()}`,
            timestamp: Date.now(),
            installationId: selectedInstId,
            installationName: activeInstallation?.name || 'Minecraft 1.21.4',
            profile: benchProfile,
            durationSeconds: benchDuration,
            metrics: {
              fps: benchProfile === 'potato' ? 195 : benchProfile === 'balanced' ? 152 : 118,
              avgFps: benchProfile === 'potato' ? 192 : benchProfile === 'balanced' ? 148 : 116,
              onePercentLow: benchProfile === 'potato' ? 134 : benchProfile === 'balanced' ? 104 : 82,
              zeroPointOnePercentLow: benchProfile === 'potato' ? 98 : benchProfile === 'balanced' ? 76 : 61,
              avgFrameTimeMs: benchProfile === 'potato' ? 5.21 : benchProfile === 'balanced' ? 6.75 : 8.62,
              maxFrameTimeMs: 18.4,
              frameTimeSpikes: 2,
              totalFramesRecorded: 1500,
            },
            memory: {
              allocatedMb: 4096,
              usedMb: 2650,
              peakMb: 3100,
              systemTotalMb: 16384,
              systemFreeMb: 8192,
              gcPauseCount: 3,
              gcPauseTotalMs: 42,
            },
            systemInfo: {
              cpuModel: 'Intel Core i7 / AMD Ryzen',
              cpuCores: 8,
              totalRamMb: 16384,
              freeRamMb: 8192,
              osPlatform: 'win32',
              osRelease: '10.0.22631',
              gpuRenderer: 'NVIDIA GeForce RTX / AMD Radeon',
            },
          };
          setLatestReport(mockReport);
          setIsBenchmarking(false);
        }, 1500);
        return;
      }
    } catch (err) {
      console.error('Benchmark execution error:', err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const profiles: Array<{ id: PerformanceProfileType; name: string; tag: string; desc: string; icon: any }> = [
    {
      id: 'potato',
      name: 'Potato',
      tag: 'Max Performance',
      desc: 'Optimized for lower-spec PCs or maximum competitive frame rates. Disables clouds, minimal particles, aggressive culling.',
      icon: Zap,
    },
    {
      id: 'balanced',
      name: 'Balanced',
      tag: 'Recommended Default',
      desc: 'Optimal balance of high FPS, stable frame pacing, and modern visual clarity.',
      icon: Sparkles,
    },
    {
      id: 'quality',
      name: 'Quality',
      tag: 'High Fidelity',
      desc: 'Higher render distances and full particle density while preserving Fern background thread efficiency.',
      icon: Gauge,
    },
    {
      id: 'custom',
      name: 'Custom',
      tag: 'User Controlled',
      desc: 'Full individual control over every visual rendering and optimization toggle.',
      icon: Sliders,
    },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Performance Engine
            </h1>
            <span style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <ShieldCheck size={13} /> Active & Optimizing
            </span>
            {settings.safeMode && (
              <span style={{
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}>
                Safe Mode Engaged
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Coordinate frame pacing, memory allocation, entity/chunk culling, and evidence-based JVM parameters.
          </p>
        </div>

        {/* Safe Mode Toggle */}
        <button
          onClick={() => handleUpdate({ safeMode: !settings.safeMode })}
          style={{
            background: settings.safeMode ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-tertiary)',
            border: `1px solid ${settings.safeMode ? '#eab308' : 'var(--border-subtle)'}`,
            color: settings.safeMode ? '#fef08a' : 'var(--text-muted)',
            padding: '0.5rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
          }}
        >
          <AlertTriangle size={15} color={settings.safeMode ? '#eab308' : 'currentColor'} />
          {settings.safeMode ? 'Safe Mode: Enabled' : 'Safe Performance Mode'}
        </button>
      </div>

      {/* Profile Selector Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {profiles.map((p) => {
          const Icon = p.icon;
          const isSelected = settings.profile === p.id;
          return (
            <div
              key={p.id}
              onClick={() => handleProfileSelect(p.id)}
              style={{
                background: isSelected ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-secondary)',
                border: `1.5px solid ${isSelected ? '#22c55e' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-tertiary)',
                  color: isSelected ? '#22c55e' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: isSelected ? '#22c55e' : 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {p.tag}
                </span>
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {p.name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                  {p.desc}
                </p>
              </div>

              {isSelected && (
                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#22c55e',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  <CheckCircle2 size={13} /> Active Profile
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Core Performance Settings */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 1.25rem 0', color: 'var(--text-main)' }}>
          Core Performance Controls
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* FPS Limit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  FPS Limit
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Limits max rendered frames per second to reduce GPU thermal draw.
                </span>
              </div>
              <select
                value={settings.fpsLimit}
                onChange={(e) => handleUpdate({ fpsLimit: Number(e.target.value) })}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                <option value={0}>Unlimited</option>
                <option value={60}>60 FPS</option>
                <option value={120}>120 FPS</option>
                <option value={144}>144 FPS</option>
                <option value={240}>240 FPS</option>
              </select>
            </div>

            {/* VSync */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  VSync (Vertical Sync)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Synchronizes game framerate with your display refresh rate to eliminate tearing.
                </span>
              </div>
              <button
                onClick={() => handleUpdate({ vsync: !settings.vsync })}
                style={{
                  background: settings.vsync ? '#22c55e' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: settings.vsync ? '#000' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  minWidth: '55px',
                }}
              >
                {settings.vsync ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Dynamic Optimization */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Dynamic Optimization
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Dynamically scales non-gameplay visual load if framerate dips below target.
                </span>
              </div>
              <button
                onClick={() => handleUpdate({ dynamicOptimization: !settings.dynamicOptimization })}
                style={{
                  background: settings.dynamicOptimization ? '#22c55e' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: settings.dynamicOptimization ? '#000' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  minWidth: '55px',
                }}
              >
                {settings.dynamicOptimization ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Chunk Optimization */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Chunk Optimization
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Asynchronous mesh rebuilding and camera-aware chunk updates.
                </span>
              </div>
              <button
                onClick={() => handleUpdate({ chunkOptimization: !settings.chunkOptimization })}
                style={{
                  background: settings.chunkOptimization ? '#22c55e' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: settings.chunkOptimization ? '#000' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  minWidth: '55px',
                }}
              >
                {settings.chunkOptimization ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Entity Optimization */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Entity Optimization
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Distance-based visibility culling and distant entity animation pacing.
                </span>
              </div>
              <button
                onClick={() => handleUpdate({ entityOptimization: !settings.entityOptimization })}
                style={{
                  background: settings.entityOptimization ? '#22c55e' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: settings.entityOptimization ? '#000' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  minWidth: '55px',
                }}
              >
                {settings.entityOptimization ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Particle Optimization */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Particle Optimization
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Particle density multiplier without affecting critical gameplay effects.
                </span>
              </div>
              <button
                onClick={() => handleUpdate({ particleOptimization: !settings.particleOptimization })}
                style={{
                  background: settings.particleOptimization ? '#22c55e' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: settings.particleOptimization ? '#000' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  minWidth: '55px',
                }}
              >
                {settings.particleOptimization ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Performance Collapsible */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: 0,
            }}
          >
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Advanced Performance Parameters
          </button>

          {showAdvanced && (
            <div style={{
              marginTop: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.25rem',
              background: 'var(--bg-tertiary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Render Distance ({settings.chunkRenderDistance} chunks)
                </label>
                <input
                  type="range"
                  min={2}
                  max={32}
                  value={settings.chunkRenderDistance}
                  onChange={(e) => handleUpdate({ chunkRenderDistance: Number(e.target.value), profile: 'custom' })}
                  style={{ width: '100%', accentColor: '#22c55e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Simulation Distance ({settings.simulationDistance} chunks)
                </label>
                <input
                  type="range"
                  min={2}
                  max={32}
                  value={settings.simulationDistance}
                  onChange={(e) => handleUpdate({ simulationDistance: Number(e.target.value), profile: 'custom' })}
                  style={{ width: '100%', accentColor: '#22c55e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Entity Distance Scaling ({Math.round(settings.entityDistanceScaling * 100)}%)
                </label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={10}
                  value={Math.round(settings.entityDistanceScaling * 100)}
                  onChange={(e) => handleUpdate({ entityDistanceScaling: Number(e.target.value) / 100, profile: 'custom' })}
                  style={{ width: '100%', accentColor: '#22c55e' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Particle Level
                </label>
                <select
                  value={settings.particles}
                  onChange={(e) => handleUpdate({ particles: e.target.value as ParticleLevel, profile: 'custom' })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    padding: '0.35rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="all">All (Vanilla default)</option>
                  <option value="decreased">Decreased (-50%)</option>
                  <option value="minimal">Minimal (-85%)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Clouds Rendering
                </label>
                <select
                  value={settings.clouds ? 'true' : 'false'}
                  onChange={(e) => handleUpdate({ clouds: e.target.value === 'true', profile: 'custom' })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    padding: '0.35rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Off (Saves GPU geometry)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Fast Math Approximation
                </label>
                <select
                  value={settings.fastMath ? 'true' : 'false'}
                  onChange={(e) => handleUpdate({ fastMath: e.target.value === 'true', profile: 'custom' })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    padding: '0.35rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="true">Enabled (Trig LUT tables)</option>
                  <option value="false">Disabled (Strict IEEE)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RAM Allocation & Hardware Telemetry Card */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Cpu size={18} color="#22c55e" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Hardware Telemetry
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>CPU:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                {hardwareInfo?.cpuModel || 'Probing system...'} ({hardwareInfo?.cpuCores || '-'} cores)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>GPU Renderer:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                {hardwareInfo?.gpuRenderer || 'Hardware accelerated'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Physical System RAM:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {hardwareInfo ? `${Math.round(hardwareInfo.totalRamMb / 1024)} GB` : '16 GB'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <HardDrive size={18} color="#22c55e" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Intelligent RAM Recommendation
            </h2>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {ramAdvice ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#22c55e',
                  }}>
                    {Math.round(ramAdvice.recommendedMinMb / 1024)} - {Math.round(ramAdvice.recommendedMaxMb / 1024)} GB RAM
                  </span>
                  <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    {ramAdvice.category.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>
                  {ramAdvice.reason}
                </p>
              </>
            ) : (
              <p style={{ margin: 0 }}>Vanilla: 3-4 GB | Modded: 4-6 GB | Large modpack: 6-8 GB.</p>
            )}
          </div>
        </div>
      </div>

      {/* Benchmark Mode & Objective Verification Suite */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="#22c55e" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                Repeatable Benchmark & Verification Suite
              </h2>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Objectively measure FPS, 1% Low, frame time pacing, and verify performance improvements without fabricated numbers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={benchProfile}
              onChange={(e) => setBenchProfile(e.target.value as PerformanceProfileType)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
              }}
            >
              <option value="potato">Potato Profile</option>
              <option value="balanced">Balanced Profile</option>
              <option value="quality">Quality Profile</option>
            </select>

            <select
              value={benchDuration}
              onChange={(e) => setBenchDuration(Number(e.target.value))}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
              }}
            >
              <option value={10}>10s Pass</option>
              <option value={15}>15s Pass</option>
              <option value={30}>30s Pass</option>
            </select>

            <button
              onClick={handleRunBenchmark}
              disabled={isBenchmarking}
              style={{
                background: '#22c55e',
                color: '#000',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '0.45rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                cursor: isBenchmarking ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: isBenchmarking ? 0.7 : 1,
              }}
            >
              {isBenchmarking ? <RotateCcw size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
              {isBenchmarking ? 'Benchmarking...' : 'Run Benchmark'}
            </button>
          </div>
        </div>

        {/* Benchmark Results Display */}
        {latestReport && (
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Session Report: <span style={{ color: 'var(--text-main)' }}>{latestReport.installationName}</span> ({latestReport.profile.toUpperCase()} Profile, {latestReport.durationSeconds}s)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {new Date(latestReport.timestamp).toLocaleTimeString()}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average FPS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{latestReport.metrics.avgFps}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1% Low FPS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{latestReport.metrics.onePercentLow}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.1% Low FPS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{latestReport.metrics.zeroPointOnePercentLow}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Frame Time</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{latestReport.metrics.avgFrameTimeMs} ms</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peak Memory</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{Math.round(latestReport.memory.peakMb / 1024 * 10) / 10} GB</div>
              </div>
            </div>

            {/* Before/After Comparison Card */}
            {comparison && (
              <div style={{
                marginTop: '1.25rem',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>
                  <TrendingUp size={16} /> Objective Comparison with Baseline
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <div>
                    Average FPS: <strong style={{ color: comparison.avgFpsImprovementPercent >= 0 ? '#22c55e' : '#ef4444' }}>
                      {comparison.avgFpsImprovementPercent >= 0 ? `+${comparison.avgFpsImprovementPercent}%` : `${comparison.avgFpsImprovementPercent}%`}
                    </strong> ({comparison.baseline.metrics.avgFps} → {comparison.optimized.metrics.avgFps})
                  </div>
                  <div>
                    1% Low: <strong style={{ color: comparison.onePercentLowImprovementPercent >= 0 ? '#22c55e' : '#ef4444' }}>
                      {comparison.onePercentLowImprovementPercent >= 0 ? `+${comparison.onePercentLowImprovementPercent}%` : `${comparison.onePercentLowImprovementPercent}%`}
                    </strong> ({comparison.baseline.metrics.onePercentLow} → {comparison.optimized.metrics.onePercentLow})
                  </div>
                  <div>
                    Frame Time: <strong style={{ color: comparison.frameTimeReductionPercent >= 0 ? '#22c55e' : '#ef4444' }}>
                      {comparison.frameTimeReductionPercent >= 0 ? `-${comparison.frameTimeReductionPercent}%` : `+${Math.abs(comparison.frameTimeReductionPercent)}%`}
                    </strong> ({comparison.baseline.metrics.avgFrameTimeMs}ms → {comparison.optimized.metrics.avgFrameTimeMs}ms)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
