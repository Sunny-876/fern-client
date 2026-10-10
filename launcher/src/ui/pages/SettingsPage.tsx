import React, { useState } from 'react';
import {
  Save,
  RefreshCw,
  Cpu,
  HardDrive,
  Monitor,
  Sliders,
  CheckCircle,
  Shield,
  DownloadCloud,
  FileText,
  AlertTriangle,
  RotateCcw,
  Cloud,
  CloudOff,
  UploadCloud,
  Check,
} from 'lucide-react';
import { FernSettings } from '../../../../shared/models/settings';
import { JavaRuntime } from '../../../../shared/models/java';
import { CloudSyncStatus } from '../../../../shared/models/cloud-sync';

interface SettingsPageProps {
  settings: FernSettings;
  javaRuntimes: JavaRuntime[];
  onUpdateSettings: (partial: Partial<FernSettings>) => Promise<void>;
  onDetectJava: () => Promise<void>;
}

type SettingsSection =
  | 'general'
  | 'appearance'
  | 'minecraft'
  | 'java'
  | 'memory'
  | 'downloads'
  | 'updates'
  | 'privacy'
  | 'cloudSync'
  | 'diagnostics'
  | 'advanced';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  javaRuntimes,
  onUpdateSettings,
  onDetectJava,
}) => {
  const [section, setSection] = useState<SettingsSection>('general');

  // General & Startup
  const [keepOpen, setKeepOpen] = useState(settings.general.keepLauncherOpen || 'hide');
  const [launchAtStartup, setLaunchAtStartup] = useState(settings.general.launchAtStartup || false);
  const [minimizeToTray, setMinimizeToTray] = useState(settings.general.minimizeToTray || false);
  const [rememberLastInstallation, setRememberLastInstallation] = useState(settings.general.rememberLastInstallation ?? true);

  // Appearance
  const [theme, setTheme] = useState(settings.appearance?.theme || 'dark');
  const [reduceMotion, setReduceMotion] = useState(settings.appearance?.reduceMotion || false);

  // Minecraft
  const [resWidth, setResWidth] = useState(settings.minecraft.defaultResolution.width);
  const [resHeight, setResHeight] = useState(settings.minecraft.defaultResolution.height);
  const [fullscreen, setFullscreen] = useState(settings.minecraft.fullscreen);
  const [logWindowOnLaunch, setLogWindowOnLaunch] = useState(settings.minecraft.logWindowOnLaunch || false);

  // Java
  const [selectedJava, setSelectedJava] = useState(settings.java.defaultJavaPath || '');
  const [jvmArgs, setJvmArgs] = useState(settings.java.customJvmArgs.join(' '));
  const [autoDetectJava, setAutoDetectJava] = useState(settings.java.autoDetectJava ?? true);

  // Memory
  const [minRam, setMinRam] = useState(settings.memory.defaultMinMemoryMb);
  const [maxRam, setMaxRam] = useState(settings.memory.defaultMaxMemoryMb);

  // Downloads
  const [maxConcurrent, setMaxConcurrent] = useState(settings.downloads?.maxConcurrentDownloads || 6);
  const [retryAttempts, setRetryAttempts] = useState(settings.downloads?.downloadRetryAttempts || 3);

  // Updates
  const [updateChannel, setUpdateChannel] = useState<'stable' | 'beta'>(settings.updates?.channel || 'stable');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(settings.updates?.autoCheck ?? true);
  const [notifyOnUpdate, setNotifyOnUpdate] = useState(settings.updates?.notifyOnUpdate ?? true);

  // Privacy
  const [localDiagnostics, setLocalDiagnostics] = useState(settings.privacy?.localDiagnostics ?? true);
  const [crashReporting, setCrashReporting] = useState(settings.privacy?.crashReporting ?? false);
  const [updateChecks, setUpdateChecks] = useState(settings.privacy?.updateChecks ?? true);
  const [usageData, setUsageData] = useState(settings.privacy?.usageData ?? false);

  // Advanced & Diagnostics
  const [logLevel, setLogLevel] = useState(settings.advanced.logLevel);
  const [developerMode, setDeveloperMode] = useState(settings.advanced.developerMode || false);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(settings.advanced.enableHardwareAcceleration ?? true);

  const [isScanningJava, setIsScanningJava] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = async () => {
    await onUpdateSettings({
      general: {
        ...settings.general,
        keepLauncherOpen: keepOpen,
        launchAtStartup,
        minimizeToTray,
        rememberLastInstallation,
      },
      appearance: {
        ...settings.appearance,
        theme,
        reduceMotion,
      },
      minecraft: {
        ...settings.minecraft,
        defaultResolution: { width: resWidth, height: resHeight },
        fullscreen,
        logWindowOnLaunch,
      },
      java: {
        ...settings.java,
        defaultJavaPath: selectedJava || undefined,
        autoDetectJava,
        customJvmArgs: jvmArgs.trim().split(/\s+/).filter(Boolean),
      },
      memory: {
        defaultMinMemoryMb: minRam,
        defaultMaxMemoryMb: maxRam,
      },
      downloads: {
        ...settings.downloads,
        maxConcurrentDownloads: maxConcurrent,
        downloadRetryAttempts: retryAttempts,
      },
      updates: {
        ...settings.updates,
        channel: updateChannel,
        autoCheck: autoCheckUpdates,
        notifyOnUpdate,
      },
      privacy: {
        localDiagnostics,
        crashReporting,
        updateChecks,
        usageData,
      },
      advanced: {
        ...settings.advanced,
        logLevel,
        developerMode,
        enableHardwareAcceleration: hardwareAcceleration,
      },
    });

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleScanJava = async () => {
    setIsScanningJava(true);
    try {
      await onDetectJava();
    } finally {
      setIsScanningJava(false);
    }
  };

  // Cloud Sync (Phase 10)
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadCloudSyncStatus = async () => {
    if (window.fern?.getCloudSyncStatus) {
      setSyncLoading(true);
      try {
        const status = await window.fern.getCloudSyncStatus();
        setCloudSyncStatus(status);
      } catch (err: any) {
        setSyncMessage(`Could not fetch sync status: ${err.message}`);
      } finally {
        setSyncLoading(false);
      }
    }
  };

  const handleToggleSync = async (enable: boolean) => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      if (enable) {
        await window.fern?.enableCloudSync();
        setSyncMessage('Cloud sync enabled. Initial configuration uploaded.');
      } else {
        await window.fern?.disableCloudSync();
        setSyncMessage('Cloud sync disabled.');
      }
      await loadCloudSyncStatus();
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePushSync = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      const rev = await window.fern?.pushCloudSync();
      setSyncMessage(`Configuration pushed successfully (Revision #${rev?.revisionNumber}).`);
      await loadCloudSyncStatus();
    } catch (err: any) {
      setSyncMessage(`Push error: ${err.message}`);
      await loadCloudSyncStatus();
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePullSync = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      await window.fern?.pullCloudSync();
      setSyncMessage('Configuration pulled and applied. Local backup created prior to applying.');
      await loadCloudSyncStatus();
    } catch (err: any) {
      setSyncMessage(`Pull error: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleResolveConflict = async (strategy: 'keep_local' | 'take_cloud') => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      await window.fern?.resolveCloudSyncConflict(strategy);
      setSyncMessage(strategy === 'keep_local' ? 'Local configuration preserved and synced to cloud.' : 'Cloud configuration downloaded and applied.');
      await loadCloudSyncStatus();
    } catch (err: any) {
      setSyncMessage(`Resolution error: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const sectionsList: { id: SettingsSection; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'minecraft', label: 'Minecraft' },
    { id: 'java', label: 'Java' },
    { id: 'memory', label: 'Memory' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'updates', label: 'Updates' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'cloudSync', label: 'Cloud Sync' },
    { id: 'diagnostics', label: 'Diagnostics' },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1024px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>Settings</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Configure client defaults, runtime paths, updates, privacy, and memory allocations.
          </p>
        </div>

        <button onClick={handleSave} className="btn-primary" style={{ fontSize: '0.82rem' }}>
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>

      {savedNotice && (
        <div style={{
          background: 'var(--color-accent-subtle)',
          border: '1px solid var(--border-focus)',
          color: 'var(--color-accent)',
          padding: '0.6rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <CheckCircle size={16} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Settings Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.5rem',
        overflowX: 'auto',
      }}>
        {sectionsList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            style={{
              background: section === tab.id ? 'var(--bg-tertiary)' : 'transparent',
              color: section === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
              border: section === tab.id ? '1px solid var(--border-subtle)' : '1px solid transparent',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        {/* GENERAL */}
        {section === 'general' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Launcher Behavior & Startup
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Customize startup rules and window behavior when Minecraft launches.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">When game starts:</label>
                <select
                  value={keepOpen}
                  onChange={(e) => setKeepOpen(e.target.value as any)}
                  className="input-field"
                  style={{ maxWidth: '300px' }}
                >
                  <option value="keep">Keep Fern Client launcher open</option>
                  <option value="hide">Hide launcher to system tray while playing</option>
                  <option value="close">Close launcher entirely</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={launchAtStartup}
                    onChange={(e) => setLaunchAtStartup(e.target.checked)}
                  />
                  <span>Launch Fern at Windows startup (disabled by default)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={minimizeToTray}
                    onChange={(e) => setMinimizeToTray(e.target.checked)}
                  />
                  <span>Minimize to Windows system tray instead of closing</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberLastInstallation}
                    onChange={(e) => setRememberLastInstallation(e.target.checked)}
                  />
                  <span>Remember and automatically select last played installation</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* APPEARANCE */}
        {section === 'appearance' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Appearance & Theme
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Customize UI aesthetics, colors, and motion behavior.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Theme Mode:</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {(['dark', 'oled', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: theme === t ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                        background: theme === t ? 'var(--color-accent-subtle)' : 'var(--bg-secondary)',
                        color: theme === t ? 'var(--color-accent)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                />
                <span>Reduce animations and UI motion</span>
              </label>
            </div>
          </>
        )}

        {/* MINECRAFT */}
        {section === 'minecraft' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Minecraft Display & Window Settings
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Default window resolution and game window launch flags.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label className="form-label">Default Width (px)</label>
                <input
                  type="number"
                  value={resWidth}
                  onChange={(e) => setResWidth(parseInt(e.target.value) || 854)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label">Default Height (px)</label>
                <input
                  type="number"
                  value={resHeight}
                  onChange={(e) => setResHeight(parseInt(e.target.value) || 480)}
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fullscreen}
                  onChange={(e) => setFullscreen(e.target.checked)}
                />
                <span>Launch in Fullscreen by default</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={logWindowOnLaunch}
                  onChange={(e) => setLogWindowOnLaunch(e.target.checked)}
                />
                <span>Show live Minecraft game log on launch</span>
              </label>
            </div>
          </>
        )}

        {/* JAVA */}
        {section === 'java' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  Java Runtime Configuration
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Set the default JRE/JDK path and customized global JVM flags.
                </p>
              </div>

              <button
                onClick={handleScanJava}
                disabled={isScanningJava}
                className="btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <RefreshCw size={14} className={isScanningJava ? 'animate-spin' : ''} />
                <span>Rescan Runtimes</span>
              </button>
            </div>

            <div>
              <label className="form-label">Default Java Runtime:</label>
              <select
                value={selectedJava}
                onChange={(e) => setSelectedJava(e.target.value)}
                className="input-field"
              >
                <option value="">Auto-select compatible version (Recommended)</option>
                {javaRuntimes.map((r) => (
                  <option key={r.path} value={r.path}>
                    {r.name} ({r.majorVersion ? `Java ${r.majorVersion}` : 'Unknown'}) - {r.path}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Custom JVM Arguments:</label>
              <input
                type="text"
                value={jvmArgs}
                onChange={(e) => setJvmArgs(e.target.value)}
                className="input-field"
                placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions"
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                Flags are validated before launch. Dangerous or invalid arguments will produce warnings.
              </span>
            </div>
          </>
        )}

        {/* MEMORY */}
        {section === 'memory' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Default Memory Allocation
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Allocate system RAM for Minecraft JVM execution.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="form-label">Minimum RAM (MB): {minRam} MB</label>
                <input
                  type="range"
                  min="1024"
                  max="16384"
                  step="512"
                  value={minRam}
                  onChange={(e) => setMinRam(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label">Maximum RAM (MB): {maxRam} MB ({(maxRam / 1024).toFixed(1)} GB)</label>
                <input
                  type="range"
                  min="1024"
                  max="32768"
                  step="512"
                  value={maxRam}
                  onChange={(e) => setMaxRam(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* RAM Recommendation Box (Section 11) */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              fontSize: '0.78rem',
            }}>
              <div style={{ fontWeight: 600, color: '#60a5fa' }}>Fern Recommendation Engine:</div>
              <div style={{ color: 'var(--text-muted)' }}>• Vanilla 1.21.x: 4 GB</div>
              <div style={{ color: 'var(--text-muted)' }}>• Medium Modpack (30–80 mods): 6 GB</div>
              <div style={{ color: 'var(--text-muted)' }}>• Heavy Modpack / High Shaders: 8 GB+</div>
            </div>
          </>
        )}

        {/* DOWNLOADS */}
        {section === 'downloads' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Download Engine & Network
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Configure concurrent threads and retry parameters.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label className="form-label">Max Concurrent Downloads</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 6)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Retry Attempts on Failure</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={retryAttempts}
                  onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 3)}
                  className="input-field"
                />
              </div>
            </div>
          </>
        )}

        {/* UPDATES */}
        {section === 'updates' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Update Channel & Distribution
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Select between production Stable updates and early Beta features.
              </p>
            </div>

            <div>
              <label className="form-label">Distribution Channel:</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(['stable', 'beta'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setUpdateChannel(ch)}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      border: updateChannel === ch ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                      background: updateChannel === ch ? (ch === 'stable' ? 'var(--color-accent-subtle)' : 'rgba(59, 130, 246, 0.15)') : 'var(--bg-secondary)',
                      color: updateChannel === ch ? (ch === 'stable' ? 'var(--color-accent)' : '#60a5fa') : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {ch} (Default: Stable)
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoCheckUpdates}
                  onChange={(e) => setAutoCheckUpdates(e.target.checked)}
                />
                <span>Automatically check for updates on startup</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyOnUpdate}
                  onChange={(e) => setNotifyOnUpdate(e.target.checked)}
                />
                <span>Show banner notification when an update is available</span>
              </label>
            </div>
          </>
        )}

        {/* PRIVACY */}
        {section === 'privacy' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Privacy & Data Controls
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Fern Client defaults to privacy-friendly local operation. Authentication tokens and private files are never uploaded.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={localDiagnostics}
                  onChange={(e) => setLocalDiagnostics(e.target.checked)}
                />
                <span>Allow generating local diagnostics reports (Sanitized on export)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={crashReporting}
                  onChange={(e) => setCrashReporting(e.target.checked)}
                />
                <span>Enable local automated crash log heuristic analysis</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={updateChecks}
                  onChange={(e) => setUpdateChecks(e.target.checked)}
                />
                <span>Enable periodic official update metadata checks</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={usageData}
                  onChange={(e) => setUsageData(e.target.checked)}
                />
                <span>Anonymous usage metrics (Disabled by default)</span>
              </label>
            </div>
          </>
        )}

        {/* CLOUD SYNC (PHASE 10) */}
        {section === 'cloudSync' && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Cloud Configuration Synchronization
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Opt-in seamless synchronization for HUD layouts, visual themes, modules, keybinds, and client settings.
                Sensitive credentials, Microsoft tokens, and machine-local file paths are strictly excluded.
              </p>
            </div>

            {syncMessage && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                fontSize: '0.8rem',
              }}>
                {syncMessage}
              </div>
            )}

            {/* Conflict Alert Banner */}
            {cloudSyncStatus?.hasConflict && (
              <div style={{
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fb923c', fontWeight: 600, fontSize: '0.9rem' }}>
                  <AlertTriangle size={18} />
                  <span>Cloud Synchronization Conflict Detected</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  A newer configuration was uploaded by another session (Server Rev #{cloudSyncStatus.conflict?.serverRevisionNumber || '?'}).
                  Choose how you would like to resolve the difference. Local backups are automatically preserved.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                  <button
                    onClick={() => handleResolveConflict('keep_local')}
                    className="btn-primary"
                    disabled={syncLoading}
                    style={{ fontSize: '0.78rem' }}
                  >
                    Keep Local Configuration (Overwrite Cloud)
                  </button>
                  <button
                    onClick={() => handleResolveConflict('take_cloud')}
                    className="btn-secondary"
                    disabled={syncLoading}
                    style={{ fontSize: '0.78rem' }}
                  >
                    Accept Cloud Configuration (Download & Apply)
                  </button>
                </div>
              </div>
            )}

            {/* Sync Controls */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    Enable Cloud Configuration Sync
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Requires an authenticated Fern account.
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cloudSyncStatus?.isEnabled || false}
                    onChange={(e) => handleToggleSync(e.target.checked)}
                    disabled={syncLoading}
                  />
                </label>
              </div>

              {cloudSyncStatus?.isEnabled && (
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Current Remote Revision:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {cloudSyncStatus.currentRevision ? `#${cloudSyncStatus.currentRevision.revisionNumber} (${cloudSyncStatus.currentRevision.checksum.substring(0, 8)})` : 'None'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Total Revisions History:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{cloudSyncStatus.totalRevisions}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Last Synced:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {cloudSyncStatus.lastSyncedAt ? new Date(cloudSyncStatus.lastSyncedAt).toLocaleString() : 'Never'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={handlePushSync}
                      disabled={syncLoading}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem' }}
                    >
                      <UploadCloud size={14} />
                      <span>Push Local to Cloud</span>
                    </button>

                    <button
                      onClick={handlePullSync}
                      disabled={syncLoading}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem' }}
                    >
                      <DownloadCloud size={14} />
                      <span>Pull Remote to Local</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* DIAGNOSTICS & ADVANCED */}
        {(section === 'diagnostics' || section === 'advanced') && (
          <>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                Developer & Diagnostic Settings
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Logging levels, hardware acceleration, and debug modes.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Log Verbosity Level:</label>
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value as any)}
                  className="input-field"
                  style={{ maxWidth: '240px' }}
                >
                  <option value="DEBUG">DEBUG (Detailed telemetry)</option>
                  <option value="INFO">INFO (Standard)</option>
                  <option value="WARN">WARN (Only warnings & errors)</option>
                  <option value="ERROR">ERROR (Only critical faults)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hardwareAcceleration}
                    onChange={(e) => setHardwareAcceleration(e.target.checked)}
                  />
                  <span>Enable GPU Hardware Acceleration for Launcher UI</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={developerMode}
                    onChange={(e) => setDeveloperMode(e.target.checked)}
                  />
                  <span>Developer Mode (Enables extra diagnostic menus and dry runs)</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
