import React, { useState } from 'react';
import { Play, Download, Loader2, ChevronDown, Activity, Check } from 'lucide-react';
import { Installation } from '../../../../shared/models/installation';
import { Account } from '../../../../shared/models/account';
import { LaunchStatusUpdate } from '../../../../shared/models/launch';

interface PlayBarProps {
  installations: Installation[];
  activeInstallation: Installation | null;
  activeAccount: Account | null;
  onSelectInstallation: (id: string) => void;
  onLaunch: (dryRun: boolean) => Promise<void>;
  onInstallVersion: (versionId: string) => Promise<void>;
  launchStatus: LaunchStatusUpdate | null;
  isLaunching: boolean;
}

export const PlayBar: React.FC<PlayBarProps> = ({
  installations,
  activeInstallation,
  activeAccount,
  onSelectInstallation,
  onLaunch,
  onInstallVersion,
  launchStatus,
  isLaunching,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const isInstalled = activeInstallation?.status === 'INSTALLED' || activeInstallation?.status === 'RUNNING';
  const isInstalling = activeInstallation?.status === 'INSTALLING';
  const isRunning = activeInstallation?.status === 'RUNNING';

  const handleActionClick = () => {
    if (!activeInstallation) return;
    if (isInstalled) {
      onLaunch(dryRun);
    } else {
      onInstallVersion(activeInstallation.versionId || activeInstallation.minecraftVersion);
    }
  };

  return (
    <footer style={{
      height: '80px',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      position: 'relative',
      zIndex: 50,
    }}>
      {/* Installation Selector */}
      <div style={{ position: 'relative', minWidth: '260px' }}>
        <div
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            transition: 'border-color var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {activeInstallation ? activeInstallation.name : 'Select Installation'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {activeInstallation
                ? `${activeInstallation.loader.toUpperCase()} • ${activeInstallation.minecraftVersion} • ${activeInstallation.status}`
                : 'No installation'}
            </span>
          </div>
          <ChevronDown size={16} color="var(--text-dim)" />
        </div>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            width: '100%',
            marginBottom: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            zIndex: 100,
          }}>
            {installations.map((inst) => {
              const isSelected = activeInstallation?.id === inst.id;
              return (
                <div
                  key={inst.id}
                  onClick={() => {
                    onSelectInstallation(inst.id);
                    setDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.65rem 0.95rem',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-accent-subtle)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: isSelected ? 'var(--color-accent)' : 'var(--text-main)',
                  }}>
                    {inst.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {inst.loader} • {inst.minecraftVersion} • {inst.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle Progress & Status */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        maxWidth: '450px',
        margin: '0 1.5rem',
      }}>
        {isLaunching && launchStatus ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{launchStatus.message}</span>
              <span>{launchStatus.percentage}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${launchStatus.percentage}%`,
                height: '100%',
                background: 'var(--color-accent)',
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        ) : isInstalling && activeInstallation?.installProgress ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{activeInstallation.installProgress.step}</span>
              <span>{activeInstallation.installProgress.percentage}%</span>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${activeInstallation.installProgress.percentage}%`,
                height: '100%',
                background: 'var(--color-info)',
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)', width: 'auto' }}
              />
              Dry Run (Validate pipeline)
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>•</span>
            <span style={{ fontSize: '0.75rem', color: isRunning ? 'var(--color-accent)' : 'var(--text-muted)' }}>
              {isRunning
                ? 'Minecraft Running'
                : isInstalled
                ? 'Ready to launch'
                : 'Files not installed'}
            </span>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleActionClick}
          disabled={isLaunching || isRunning || isInstalling || !activeInstallation || !activeAccount}
          className="btn-primary"
          style={{
            height: '48px',
            padding: '0 2rem',
            fontSize: '0.95rem',
            letterSpacing: '0.04em',
            boxShadow: isLaunching ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.35)',
          }}
        >
          {isLaunching ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>LAUNCHING...</span>
            </>
          ) : isRunning ? (
            <>
              <Activity size={18} />
              <span>RUNNING</span>
            </>
          ) : isInstalling ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>INSTALLING...</span>
            </>
          ) : isInstalled ? (
            <>
              <Play size={18} fill="currentColor" />
              <span>PLAY</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>INSTALL & PLAY</span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
};
