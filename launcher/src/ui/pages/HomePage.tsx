import React, { useState, useEffect } from 'react';
import {
  Play,
  Download,
  Layers,
  Cpu,
  Shield,
  Sparkles,
  Folder,
  ExternalLink,
  Activity,
  Loader2,
  ChevronDown,
  ShieldAlert,
  Clock,
  Coffee,
  HardDrive,
  Box,
} from 'lucide-react';
import { BRANDING } from '../../../../shared/constants/branding';
import { Installation } from '../../../../shared/models/installation';
import { Account } from '../../../../shared/models/account';
import { JavaRuntime } from '../../../../shared/models/java';
import { LaunchStatusUpdate } from '../../../../shared/models/launch';

interface HomePageProps {
  installations?: Installation[];
  activeInstallation: Installation | null;
  onSelectInstallation?: (id: string) => void;
  activeAccount: Account | null;
  javaRuntimes: JavaRuntime[];
  basePath: string;
  launchStatus: LaunchStatusUpdate | null;
  isLaunching: boolean;
  onNavigate: (tab: any) => void;
  onLaunch: (dryRun: boolean, safeMode?: boolean) => Promise<void>;
  onInstallVersion: (versionId: string) => Promise<void>;
}

export const HomePage: React.FC<HomePageProps> = ({
  installations = [],
  activeInstallation,
  onSelectInstallation,
  activeAccount,
  javaRuntimes,
  basePath,
  launchStatus,
  isLaunching,
  onNavigate,
  onLaunch,
  onInstallVersion,
}) => {
  const isInstalled = activeInstallation?.status === 'INSTALLED' || activeInstallation?.status === 'RUNNING';
  const isInstalling = activeInstallation?.status === 'INSTALLING';
  const isRunning = activeInstallation?.status === 'RUNNING';

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [modCount, setModCount] = useState<number | null>(null);

  const selectedJava = javaRuntimes.find((r) => r.isValid);
  const javaDisplay = activeInstallation?.javaPath
    ? (javaRuntimes.find((r) => r.path === activeInstallation.javaPath)?.name || 'Custom Java')
    : (selectedJava ? selectedJava.name : 'System Default (Java 21)');

  const ramDisplay = `${(
    (activeInstallation?.maxMemory || activeInstallation?.memoryAllocation?.maxMb || 4096) / 1024
  ).toFixed(0)} GB RAM`;

  useEffect(() => {
    if (activeInstallation && activeInstallation.loader !== 'vanilla' && window.fern) {
      window.fern.getInstalledMods(activeInstallation.id)
        .then((mods) => {
          setModCount(mods.length);
        })
        .catch(() => setModCount(null));
    } else {
      setModCount(null);
    }
  }, [activeInstallation?.id, activeInstallation?.loader]);

  const formatLastPlayed = (timestamp?: number) => {
    if (!timestamp) return 'Never played';
    const diffMs = Date.now() - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just recently';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '960px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--color-accent)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.2rem',
          }}>
            {BRANDING.APP_NAME}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Welcome back, <span style={{ color: 'var(--text-main)' }}>{activeAccount ? activeAccount.displayName : 'Guest'}</span>
          </h1>
        </div>

        <button
          onClick={() => onNavigate('versions')}
          className="btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
        >
          <span>Browse Versions</span>
        </button>
      </div>

      {/* Main Launch Center Card */}
      <div style={{
        background: 'linear-gradient(180deg, #131c2c 0%, #0c121e 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'visible',
      }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          width: '320px',
          height: '100px',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }} />

        {activeInstallation ? (
          <>
            {/* Installation Switcher Dropdown */}
            <div style={{ position: 'relative', marginBottom: '1.25rem', zIndex: 30 }}>
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'border-color var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Current Installation:
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                  {activeInstallation.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({activeInstallation.minecraftVersion} • {activeInstallation.loader})
                </span>
                <ChevronDown size={14} color="var(--text-dim)" />
              </button>

              {switcherOpen && installations.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '320px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-focus)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.4rem',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  maxHeight: '240px',
                  overflowY: 'auto',
                }}>
                  {installations.map((inst) => {
                    const isCurrent = inst.id === activeInstallation.id;
                    return (
                      <button
                        key={inst.id}
                        onClick={() => {
                          if (onSelectInstallation) onSelectInstallation(inst.id);
                          setSwitcherOpen(false);
                        }}
                        style={{
                          background: isCurrent ? 'var(--color-accent-subtle)' : 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.55rem 0.75rem',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: isCurrent ? 'var(--color-accent)' : 'var(--text-main)',
                        }}>
                          {inst.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Minecraft {inst.minecraftVersion} • {inst.loader}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Installation Specs Grid */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              marginBottom: '1.75rem',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Box size={14} color="var(--color-accent)" />
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{activeInstallation.minecraftVersion}</span>
              </span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize', color: 'var(--text-main)', fontWeight: 600 }}>
                {activeInstallation.loader}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Coffee size={14} color="#f59e0b" />
                <span>{javaDisplay}</span>
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={14} color="#60a5fa" />
                <span>{ramDisplay}</span>
              </span>
              {modCount !== null && (
                <>
                  <span>•</span>
                  <span>{modCount} Mod{modCount === 1 ? '' : 's'}</span>
                </>
              )}
            </div>

            {/* Launch Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '340px' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                {isInstalled ? (
                  <button
                    onClick={() => onLaunch(false, false)}
                    disabled={isLaunching || isRunning || !activeAccount}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      height: '52px',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      boxShadow: '0 6px 20px rgba(34, 197, 94, 0.35)',
                    }}
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>LAUNCHING...</span>
                      </>
                    ) : isRunning ? (
                      <>
                        <Activity size={20} />
                        <span>RUNNING</span>
                      </>
                    ) : (
                      <>
                        <Play size={20} fill="currentColor" />
                        <span>PLAY</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => onInstallVersion(activeInstallation.versionId || activeInstallation.minecraftVersion)}
                    disabled={isInstalling}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      height: '52px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      boxShadow: '0 6px 20px rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>INSTALLING...</span>
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        <span>INSTALL & PLAY</span>
                      </>
                    )}
                  </button>
                )}

                {/* Safe Mode Button (Section 29) */}
                {isInstalled && !isLaunching && !isRunning && (
                  <button
                    onClick={() => onLaunch(false, true)}
                    disabled={!activeAccount}
                    className="btn-secondary"
                    style={{
                      padding: '0 0.85rem',
                      height: '52px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      borderColor: 'rgba(234, 179, 8, 0.3)',
                      color: '#facc15',
                    }}
                    title="Launch with Safe Mode (Fern Core only, optional modules/shaders disabled)"
                  >
                    <ShieldAlert size={16} />
                    <span>SAFE MODE</span>
                  </button>
                )}
              </div>

              {/* Last Played Readout */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                marginTop: '0.35rem',
              }}>
                <Clock size={12} />
                <span>Last played:</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                  {activeInstallation.name} • {formatLastPlayed(activeInstallation.lastPlayedAt ?? activeInstallation.lastPlayed)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No installation selected</span>
            <button onClick={() => onNavigate('installations')} className="btn-primary">
              Create an Installation
            </button>
          </div>
        )}
      </div>

      {/* Quick Overview Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Active Profile</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {activeAccount ? activeAccount.displayName : 'None'}
            </div>
          </div>
          <button onClick={() => onNavigate('accounts')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
            Switch
          </button>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Installed Instances</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {activeInstallation ? activeInstallation.name : 'Select or create'}
            </div>
          </div>
          <button onClick={() => onNavigate('installations')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
            Manage
          </button>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>System Storage</div>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Fern Client/installations
            </div>
          </div>
          <button onClick={() => onNavigate('about')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
            Storage
          </button>
        </div>
      </div>
    </div>
  );
};
