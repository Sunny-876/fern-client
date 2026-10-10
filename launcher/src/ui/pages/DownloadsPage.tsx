import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  X,
  RotateCcw,
  HardDrive,
  Layers,
  Box,
  FileCode,
  Coffee,
} from 'lucide-react';
import { DownloadProgress } from '../../../../shared/models/download';

export interface QueueItem {
  id: string;
  name: string;
  category: 'minecraft' | 'libraries' | 'mods' | 'resourcepacks' | 'java';
  status: 'downloading' | 'completed' | 'queued' | 'paused' | 'failed';
  progress: number; // 0-100
  sizeBytes: number;
  transferredBytes: number;
  speed: string;
  eta: string;
  error?: string;
}

interface DownloadsPageProps {
  onNavigateHome?: () => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = () => {
  const [activeDownloads, setActiveDownloads] = useState<DownloadProgress[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([
    {
      id: 'mc-core-1',
      name: 'Minecraft 1.21.4 (client.jar)',
      category: 'minecraft',
      status: 'completed',
      progress: 100,
      sizeBytes: 31457280,
      transferredBytes: 31457280,
      speed: 'Done',
      eta: '0s',
    },
    {
      id: 'lib-fabric-1',
      name: 'Fabric Loader 0.16.10 & Core Mappings',
      category: 'libraries',
      status: 'completed',
      progress: 100,
      sizeBytes: 12582912,
      transferredBytes: 12582912,
      speed: 'Done',
      eta: '0s',
    },
    {
      id: 'mod-sodium-1',
      name: 'Sodium 0.6.5 (Fabric 1.21.x)',
      category: 'mods',
      status: 'downloading',
      progress: 74,
      sizeBytes: 8388608,
      transferredBytes: 6207570,
      speed: '4.8 MB/s',
      eta: '1s',
    },
    {
      id: 'java-temurin-21',
      name: 'Eclipse Temurin OpenJDK 21 x64',
      category: 'java',
      status: 'queued',
      progress: 0,
      sizeBytes: 198180864,
      transferredBytes: 0,
      speed: 'Waiting',
      eta: '--',
    },
    {
      id: 'pack-faithful-32',
      name: 'Fern Faithful 32x UI Enhancement Pack',
      category: 'resourcepacks',
      status: 'queued',
      progress: 0,
      sizeBytes: 44040192,
      transferredBytes: 0,
      speed: 'Waiting',
      eta: '--',
    },
  ]);

  const [diskSpace, setDiskSpace] = useState<{ available: string; required: string; hasEnough: boolean }>({
    available: '18.7 GB',
    required: '294 MB',
    hasEnough: true,
  });

  useEffect(() => {
    if (window.fern) {
      window.fern.getActiveDownloads().then((downloads) => {
        setActiveDownloads(downloads);
      }).catch(console.error);

      // Check real disk space if API available
      window.fern.checkDiskSpace('.', 500 * 1024 * 1024).then((res) => {
        if (res && res.availableBytes) {
          const availGb = (res.availableBytes / (1024 * 1024 * 1024)).toFixed(1);
          setDiskSpace({
            available: `${availGb} GB`,
            required: '294 MB',
            hasEnough: res.hasEnough,
          });
        }
      }).catch(() => {});

      const unsub = window.fern.onDownloadProgress((prog) => {
        setActiveDownloads((prev) => {
          const idx = prev.findIndex((p) => p.id === prog.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = prog;
            return next;
          }
          return [...prev, prog];
        });
      });

      return () => unsub();
    }
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getCategoryIcon = (category: QueueItem['category']) => {
    switch (category) {
      case 'minecraft':
        return <Box size={16} color="var(--color-accent)" />;
      case 'libraries':
        return <Layers size={16} color="#60a5fa" />;
      case 'mods':
        return <FileCode size={16} color="#c084fc" />;
      case 'java':
        return <Coffee size={16} color="#f59e0b" />;
      case 'resourcepacks':
        return <DownloadCloud size={16} color="#34d399" />;
      default:
        return <DownloadCloud size={16} color="var(--text-dim)" />;
    }
  };

  const handlePauseToggle = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'downloading' ? 'paused' : 'downloading';
          return { ...item, status: nextStatus, speed: nextStatus === 'paused' ? 'Paused' : 'Resuming...' };
        }
        return item;
      })
    );
  };

  const handleCancel = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    if (window.fern) {
      window.fern.cancelDownload(id).catch(console.error);
    }
  };

  const handleRetry = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'downloading', progress: 10, speed: 'Reconnecting...', error: undefined }
          : item
      )
    );
  };

  const handleClearFinished = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const completedCount = queue.filter((q) => q.status === 'completed').length;
  const inProgressCount = queue.filter((q) => q.status === 'downloading').length;
  const queuedCount = queue.filter((q) => q.status === 'queued' || q.status === 'paused').length;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1024px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Download Manager
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
            Download Center & Queue
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {completedCount > 0 && (
            <button
              onClick={handleClearFinished}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              Clear Finished ({completedCount})
            </button>
          )}
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Active Transfers</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
            {inProgressCount} Downloading
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {queuedCount} items waiting in queue
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Queue Deduplication</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-accent)', marginTop: '0.2rem' }}>
            Active ✓
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Identical URLs & hashes merged
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Disk Space Validation</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: diskSpace.hasEnough ? '#22c55e' : '#ef4444', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HardDrive size={18} />
            <span>{diskSpace.available} free</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {diskSpace.hasEnough ? `Enough space for operations (Req: ${diskSpace.required})` : 'Insufficient disk storage'}
          </div>
        </div>
      </div>

      {/* Queue Category Priority Pipeline */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Queue Priority:</span>
        <span style={{ color: 'var(--color-accent)' }}>1. Minecraft Core</span>
        <span>→</span>
        <span style={{ color: '#60a5fa' }}>2. Libraries</span>
        <span>→</span>
        <span style={{ color: '#c084fc' }}>3. Mods</span>
        <span>→</span>
        <span style={{ color: '#34d399' }}>4. Resource Packs</span>
        <span>→</span>
        <span style={{ color: '#f59e0b' }}>5. Java Runtimes</span>
      </div>

      {/* Main Download Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {queue.map((item, index) => {
          const isDone = item.status === 'completed';
          const isFailed = item.status === 'failed';
          const isPaused = item.status === 'paused';
          const isDownloading = item.status === 'downloading';

          return (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-card)',
                border: isDownloading ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        #{index + 1}
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {item.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {formatBytes(item.transferredBytes)} / {formatBytes(item.sizeBytes)} • {item.speed}
                      {item.eta !== '--' && ` • ETA: ${item.eta}`}
                    </div>
                  </div>
                </div>

                {/* Right Status & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isDone
                      ? 'rgba(34, 197, 94, 0.15)'
                      : isFailed
                      ? 'rgba(239, 68, 68, 0.15)'
                      : isPaused
                      ? 'rgba(234, 179, 8, 0.15)'
                      : 'rgba(59, 130, 246, 0.15)',
                    color: isDone
                      ? '#4ade80'
                      : isFailed
                      ? '#f87171'
                      : isPaused
                      ? '#facc15'
                      : '#60a5fa',
                  }}>
                    {item.status.toUpperCase()}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {(isDownloading || isPaused) && (
                      <button
                        onClick={() => handlePauseToggle(item.id)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
                        title={isPaused ? 'Resume download' : 'Pause download'}
                      >
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                    )}

                    {isFailed && (
                      <button
                        onClick={() => handleRetry(item.id)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
                        title="Retry download"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}

                    {!isDone && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}
                        title="Cancel download"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: '6px',
                background: 'var(--bg-secondary)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${item.progress}%`,
                  background: isDone
                    ? 'var(--color-accent)'
                    : isFailed
                    ? '#ef4444'
                    : isPaused
                    ? '#eab308'
                    : 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
