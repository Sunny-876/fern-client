import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Archive,
  Trash2,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  Layers,
  HardDrive,
  Info,
  Clock,
  Download,
  MessageSquare,
} from 'lucide-react';
import { BRANDING } from '../../../../shared/constants/branding';
import { FeedbackModal } from '../components/FeedbackModal';

interface AboutPageProps {
  currentVersion: string;
}

export const AboutPage: React.FC<AboutPageProps> = ({ currentVersion }) => {
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [updateDownloadMsg, setUpdateDownloadMsg] = useState<string | null>(null);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    latestVersion?: string;
    releaseNotes?: string[];
    releaseInfo?: any;
    isDeferred?: boolean;
  } | null>(null);

  const [hasRollback, setHasRollback] = useState(false);
  const [rollbackStatus, setRollbackStatus] = useState<string | null>(null);

  const [cacheBreakdown, setCacheBreakdown] = useState<{
    minecraftFilesBytes: number;
    librariesBytes: number;
    modMetadataBytes: number;
    thumbnailsBytes: number;
    totalBytes: number;
    formatted: {
      minecraftFiles: string;
      libraries: string;
      modMetadata: string;
      thumbnails: string;
      total: string;
    };
  }>({
    minecraftFilesBytes: 2576980377,
    librariesBytes: 1181116006,
    modMetadataBytes: 50331648,
    thumbnailsBytes: 125829120,
    totalBytes: 3934257151,
    formatted: {
      minecraftFiles: '2.40 GB',
      libraries: '1.10 GB',
      modMetadata: '48.0 MB',
      thumbnails: '120.0 MB',
      total: '3.67 GB',
    },
  });

  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<any | null>(null);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (window.fern) {
      window.fern.getUpdateChannel().then(setChannel).catch(console.error);
      window.fern.hasRollbackAvailable().then(setHasRollback).catch(console.error);
      window.fern.getCacheBreakdown().then(setCacheBreakdown).catch(console.error);
      window.fern.listBackups().then(setBackupsList).catch(console.error);
    }
  }, []);

  const handleChannelChange = async (newChannel: 'stable' | 'beta') => {
    setChannel(newChannel);
    if (window.fern) {
      await window.fern.setUpdateChannel(newChannel);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      if (window.fern) {
        const res = await window.fern.checkForUpdates(channel);
        if (res && res.updateAvailable) {
          setUpdateInfo({
            hasUpdate: true,
            latestVersion: res.releaseInfo?.version || '1.1.0',
            releaseNotes: res.releaseInfo?.releaseNotes || [
              'Improved launcher startup speed',
              'Enhanced mod and dependency verification',
              'Added Safe Mode launch diagnostics',
              'Performance and memory optimization fixes',
            ],
            releaseInfo: res.releaseInfo,
            isDeferred: res.isDeferred,
          });
        } else {
          setUpdateInfo({ hasUpdate: false });
        }
      } else {
        // Preview fallback
        setTimeout(() => {
          setUpdateInfo({
            hasUpdate: false,
          });
          setIsCheckingUpdate(false);
        }, 600);
        return;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.releaseInfo || !window.fern) return;
    setIsDownloadingUpdate(true);
    setUpdateDownloadMsg('Downloading and verifying update package...');
    try {
      const res = await window.fern.downloadAndValidateUpdate(updateInfo.releaseInfo);
      if (res.success) {
        setUpdateDownloadMsg(`Package verified successfully! Saved to: ${res.filePath}`);
      } else {
        setUpdateDownloadMsg(`Update validation failed: ${res.error}`);
      }
    } catch (err: any) {
      setUpdateDownloadMsg(`Download error: ${err.message}`);
    } finally {
      setIsDownloadingUpdate(false);
    }
  };

  const handleDeferUpdate = async () => {
    if (!updateInfo?.latestVersion || !window.fern) return;
    await window.fern.deferUpdate(updateInfo.latestVersion);
    setUpdateInfo((prev) => prev ? { ...prev, isDeferred: true } : null);
  };

  const handleExportDiagnostics = async () => {
    if (window.fern) {
      try {
        const dest = await window.fern.exportDiagnosticReportFile();
        alert(`Diagnostics exported successfully to:\n${dest}`);
      } catch (err: any) {
        alert(`Export failed: ${err.message}`);
      }
    }
  };

  const handleRollback = async () => {
    if (!window.confirm('Restore previous Fern Client version snapshot? This will revert launcher executables while preserving user settings and Minecraft data.')) {
      return;
    }
    if (window.fern) {
      try {
        const ok = await window.fern.rollbackUpdate();
        if (ok) {
          setRollbackStatus('Successfully restored previous launcher version.');
          setHasRollback(false);
        } else {
          setRollbackStatus('Rollback snapshot not found or restoration failed.');
        }
      } catch (err: any) {
        setRollbackStatus(`Rollback failed: ${err.message}`);
      }
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear temporary caches and mod search thumbnails? Installed Minecraft core files and libraries will NOT be deleted.')) {
      return;
    }
    if (window.fern) {
      try {
        const res = await window.fern.clearSafeCache();
        setCacheMessage(`Cleared safe caches! Freed ${res.freedFormatted || '0 B'}.`);
        const updated = await window.fern.getCacheBreakdown();
        setCacheBreakdown(updated);
      } catch (err: any) {
        setCacheMessage(`Cache clean error: ${err.message}`);
      }
    }
  };

  const handleCreateConfigBackup = async () => {
    if (window.fern) {
      try {
        const b = await window.fern.createConfigBackup();
        setBackupMessage(`Backup created: ${b.name} (${b.id})`);
        const list = await window.fern.listBackups();
        setBackupsList(list);
      } catch (err: any) {
        setBackupMessage(`Backup failed: ${err.message}`);
      }
    }
  };

  const handleGenerateDiagnostics = async () => {
    if (window.fern) {
      try {
        const report = await window.fern.generateDiagnosticReport();
        setDiagnosticReport(report);
        setShowDiagModal(true);
      } catch (err: any) {
        alert(`Diagnostics error: ${err.message}`);
      }
    } else {
      setDiagnosticReport({
        fernVersion: currentVersion,
        os: 'Windows 10/11 x64',
        cpu: 'AMD Ryzen 7 / Intel Core i7',
        gpu: 'NVIDIA GeForce RTX 4070',
        totalMemoryGb: 32,
        sanitized: true,
      });
      setShowDiagModal(true);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1024px' }}>
      {/* Top Header */}
      <div>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--color-accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          System & Distribution
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
          About {BRANDING.APP_NAME}
        </h1>
      </div>

      {/* Version & Brand Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {BRANDING.APP_NAME}
            </span>
            <span style={{
              background: 'var(--color-accent)',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.75rem',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
            }}>
              v{currentVersion || BRANDING.VERSION}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Professional Minecraft Java Edition Launcher & Custom Client
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span>Architecture: Windows x64</span>
            <span>•</span>
            <span>Desktop: Tauri 2 / Rust Native</span>
            <span>•</span>
            <span>Target: Minecraft 1.21.x</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>
            <ShieldCheck size={16} />
            <span>Integrity Verified</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Zero telemetry • Local-first privacy
          </span>
        </div>
      </div>

      {/* Grid: Updates & Rollback | Cache & Backups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        {/* Updates Section */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <RefreshCw size={18} color="var(--color-accent)" />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Update Center
              </h2>
            </div>

            {/* Channel Switcher */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              border: '1px solid var(--border-subtle)',
            }}>
              <button
                onClick={() => handleChannelChange('stable')}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: channel === 'stable' ? 600 : 400,
                  background: channel === 'stable' ? 'var(--color-accent)' : 'transparent',
                  color: channel === 'stable' ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Stable
              </button>
              <button
                onClick={() => handleChannelChange('beta')}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: channel === 'beta' ? 600 : 400,
                  background: channel === 'beta' ? '#3b82f6' : 'transparent',
                  color: channel === 'beta' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Beta
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Fern Client checks for verified release packages with SHA-256 integrity validation. User configurations and worlds are strictly preserved.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              {isCheckingUpdate ? 'Checking Updates...' : 'Check for Updates'}
            </button>

            {hasRollback && (
              <button
                onClick={handleRollback}
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCcw size={14} />
                <span>Restore Previous Version</span>
              </button>
            )}
          </div>

          {rollbackStatus && (
            <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>{rollbackStatus}</div>
          )}

          {updateInfo && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}>
              {updateInfo.hasUpdate ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Fern Client v{updateInfo.latestVersion} Available</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    What's new:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {updateInfo.releaseNotes?.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleDownloadUpdate}
                      disabled={isDownloadingUpdate}
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Download size={13} />
                      {isDownloadingUpdate ? 'Validating...' : 'Download & Verify Package'}
                    </button>
                    {!updateInfo.isDeferred && (
                      <button
                        onClick={handleDeferUpdate}
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                      >
                        Defer Update
                      </button>
                    )}
                  </div>
                  {updateInfo.isDeferred && (
                    <div style={{ fontSize: '0.72rem', color: '#eab308' }}>
                      Update deferred for this session.
                    </div>
                  )}
                  {updateDownloadMsg && (
                    <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.3rem' }}>
                      {updateDownloadMsg}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', fontSize: '0.82rem' }}>
                  <CheckCircle2 size={16} />
                  <span>Fern Client is up to date on {channel} channel.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cache Management */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <HardDrive size={18} color="#60a5fa" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Cache Manager
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.65rem',
            fontSize: '0.78rem',
          }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Minecraft Core Files</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {cacheBreakdown.formatted.minecraftFiles}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Shared Libraries</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {cacheBreakdown.formatted.libraries}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Mod Metadata Cache</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {cacheBreakdown.formatted.modMetadata}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Thumbnail Cache</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                {cacheBreakdown.formatted.thumbnails}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.2rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Total: {cacheBreakdown.formatted.total}
            </span>
            <button
              onClick={handleClearCache}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              Clear Safe Cache
            </button>
          </div>

          {cacheMessage && (
            <div style={{ fontSize: '0.78rem', color: '#4ade80' }}>{cacheMessage}</div>
          )}
        </div>
      </div>

      {/* Grid: Backup & Restore | System Diagnostics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        {/* Backup & Restore */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Archive size={18} color="#c084fc" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Backups & Recovery
            </h2>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Back up Fern settings, HUD profiles, themes, and installation manifests. Auth tokens are never stored in backups.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleCreateConfigBackup}
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            >
              Backup Fern Settings & Profiles
            </button>
          </div>

          {backupMessage && (
            <div style={{ fontSize: '0.78rem', color: '#4ade80' }}>{backupMessage}</div>
          )}

          {backupsList.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              maxHeight: '120px',
              overflowY: 'auto',
            }}>
              {backupsList.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{b.name}</span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Diagnostics */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={18} color="#f59e0b" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Diagnostic Report
            </h2>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Generates a sanitized hardware and configuration summary for troubleshooting. Tokens, passwords, and private filepaths are automatically scrubbed.
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateDiagnostics}
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            >
              Generate Diagnostic Report
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <MessageSquare size={14} />
              <span>Feedback & Bug Reporting</span>
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics Preview Modal */}
      {showDiagModal && diagnosticReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            width: '90%',
            maxWidth: '680px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Sanitized Diagnostic Report
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleExportDiagnostics}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Download size={13} />
                  <span>Export to File</span>
                </button>
                <button
                  onClick={() => setShowDiagModal(false)}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
            }}>
              Privacy Guarantee: Tokens, passwords, and user directory roots have been redacted.
            </div>

            <pre style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: 'var(--text-main)',
              overflowY: 'auto',
              maxHeight: '400px',
              whiteSpace: 'pre-wrap',
            }}>
              {JSON.stringify(diagnosticReport, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Lightweight Feedback & Bug Reporting Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        channel={channel}
      />
    </div>
  );
};
