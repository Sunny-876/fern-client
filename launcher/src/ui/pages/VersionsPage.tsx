import React, { useState, useEffect } from 'react';
import { Search, Download, Check, Play, Plus, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { MinecraftVersionSummary } from '../../../../shared/models/version';
import { Installation } from '../../../../shared/models/installation';
import { VersionInstallProgress } from '../../preload';

interface VersionsPageProps {
  installations: Installation[];
  activeInstallation: Installation | null;
  onSelectInstallation: (id: string) => void;
  onInstallVersion: (versionId: string) => Promise<void>;
  onCreateInstallationFromVersion: (versionId: string) => void;
  onLaunch: (dryRun: boolean) => Promise<void>;
}

export const VersionsPage: React.FC<VersionsPageProps> = ({
  installations,
  activeInstallation,
  onSelectInstallation,
  onInstallVersion,
  onCreateInstallationFromVersion,
  onLaunch,
}) => {
  const [versions, setVersions] = useState<MinecraftVersionSummary[]>([]);
  const [filterType, setFilterType] = useState<'release' | 'all' | 'installed' | 'snapshot'>('release');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [installingVersionId, setInstallingVersionId] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<VersionInstallProgress | null>(null);

  const loadVersions = async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (window.fern) {
        const list = await window.fern.getVersionsList({
          type: filterType,
          search: search.trim() || undefined,
        });
        setVersions(list);
      } else {
        // Mock fallback for browser dev mode
        setVersions([
          { id: '1.21.4', type: 'release', url: '', time: '', releaseTime: '2024-12-03T00:00:00Z', sha1: '', complianceLevel: 1, isInstalled: true },
          { id: '1.21.3', type: 'release', url: '', time: '', releaseTime: '2024-10-23T00:00:00Z', sha1: '', complianceLevel: 1, isInstalled: false },
          { id: '1.21.1', type: 'release', url: '', time: '', releaseTime: '2024-08-08T00:00:00Z', sha1: '', complianceLevel: 1, isInstalled: false },
          { id: '1.20.4', type: 'release', url: '', time: '', releaseTime: '2023-12-07T00:00:00Z', sha1: '', complianceLevel: 1, isInstalled: false },
          { id: '1.16.5', type: 'release', url: '', time: '', releaseTime: '2021-01-15T00:00:00Z', sha1: '', complianceLevel: 1, isInstalled: false },
          { id: '1.8.9', type: 'release', url: '', time: '', releaseTime: '2015-12-09T00:00:00Z', sha1: '', complianceLevel: 1, isInstalled: false },
        ]);
      }
    } catch (err) {
      console.error('Failed to load version manifest:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [filterType, search]);

  useEffect(() => {
    if (window.fern) {
      const unsub = window.fern.onInstallProgress((update) => {
        setInstallProgress(update);
        if (update.stage === 'complete') {
          setTimeout(() => {
            setInstallingVersionId(null);
            setInstallProgress(null);
            loadVersions();
          }, 1000);
        }
      });
      return () => unsub();
    }
  }, []);

  const handleInstall = async (versionId: string) => {
    setInstallingVersionId(versionId);
    setInstallProgress({
      versionId,
      stage: 'manifest',
      percentage: 2,
      message: 'Starting installation...',
    });
    try {
      await onInstallVersion(versionId);
    } catch (err) {
      console.error('Installation failed:', err);
      setInstallingVersionId(null);
      setInstallProgress(null);
    }
  };

  const handlePlayVersion = async (versionId: string) => {
    // Find installation matching this version
    const match = installations.find((i) => (i.versionId || i.minecraftVersion) === versionId);
    if (match) {
      await onSelectInstallation(match.id);
      await onLaunch(false);
    } else {
      onCreateInstallationFromVersion(versionId);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>Minecraft Versions</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Official Java Edition releases and snapshots. Download directly to shared storage.
          </p>
        </div>

        <button
          onClick={() => loadVersions(true)}
          disabled={loading}
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Manifest</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search versions (e.g. 1.21.4)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[
            { id: 'release', label: 'Releases' },
            { id: 'installed', label: 'Installed' },
            { id: 'all', label: 'All Versions' },
            { id: 'snapshot', label: 'Snapshots' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              style={{
                background: filterType === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                color: filterType === tab.id ? 'var(--text-main)' : 'var(--text-dim)',
                border: filterType === tab.id ? '1px solid var(--border-subtle)' : '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Installation Download Progress Banner */}
      {installingVersionId && installProgress && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Installing Minecraft {installProgress.versionId} — {installProgress.percentage}%
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.85rem' }}>
              {installProgress.speed && <span>Speed: <strong style={{ color: 'var(--color-accent)' }}>{installProgress.speed}</strong></span>}
              {installProgress.eta && <span>ETA: <strong style={{ color: 'var(--text-main)' }}>{installProgress.eta}</strong></span>}
            </div>
          </div>

          <div style={{
            width: '100%',
            height: '6px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            marginBottom: '0.5rem',
          }}>
            <div style={{
              width: `${installProgress.percentage}%`,
              height: '100%',
              background: 'var(--color-accent)',
              transition: 'width 0.2s ease',
            }} />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {installProgress.message}
          </div>
        </div>
      )}

      {/* Version Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {versions.map((ver) => {
          const isCurrentInstalling = installingVersionId === ver.id;
          const matchingInst = installations.find((i) => (i.versionId || i.minecraftVersion) === ver.id);

          return (
            <div
              key={ver.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: ver.isInstalled ? 'var(--color-accent-subtle)' : 'var(--bg-tertiary)',
                  border: `1px solid ${ver.isInstalled ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ver.isInstalled ? 'var(--color-accent)' : 'var(--text-muted)',
                }}>
                  {ver.isInstalled ? <Check size={18} /> : <Download size={18} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Minecraft {ver.id}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-full)',
                      background: ver.type === 'release' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: ver.type === 'release' ? 'var(--color-accent)' : 'var(--color-warning)',
                    }}>
                      {ver.type.replace('_', ' ')}
                    </span>
                    {ver.isInstalled && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: 'var(--text-dim)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        Installed
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    Released: {ver.releaseTime ? new Date(ver.releaseTime).toLocaleDateString() : 'N/A'}
                    {matchingInst && (
                      <span> • Linked installation: <strong style={{ color: 'var(--text-main)' }}>{matchingInst.name}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {ver.isInstalled ? (
                  <>
                    <button
                      onClick={() => handlePlayVersion(ver.id)}
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Play</span>
                    </button>
                    <button
                      onClick={() => onCreateInstallationFromVersion(ver.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                      title="Create installation profile with this version"
                    >
                      <Plus size={14} />
                      <span>New Profile</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleInstall(ver.id)}
                      disabled={isCurrentInstalling || !!installingVersionId}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
                    >
                      <Download size={14} />
                      <span>{isCurrentInstalling ? 'Installing...' : 'Install'}</span>
                    </button>
                    <button
                      onClick={() => onCreateInstallationFromVersion(ver.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                      title="Create installation profile with this version"
                    >
                      <Plus size={14} />
                      <span>New Profile</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {versions.length === 0 && !loading && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}>
            No Minecraft versions found matching the search or filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
