import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Folder, Copy, Check } from 'lucide-react';
import { LogEntry, LogLevel } from '../../core/logger';

interface LogsPageProps {
  logs: LogEntry[];
  logFilePath: string | null;
  onClearView: () => void;
  onOpenLogFolder: () => void;
}

export const LogsPage: React.FC<LogsPageProps> = ({
  logs,
  logFilePath,
  onClearView,
  onOpenLogFolder,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.tag.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.tag}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return 'var(--color-danger)';
      case 'WARN': return 'var(--color-warning)';
      case 'INFO': return '#38bdf8';
      case 'DEBUG': return 'var(--text-dim)';
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>System Logs</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Live structured runtime logs. File: <span style={{ fontFamily: 'monospace', color: 'var(--text-dim)' }}>{logFilePath || 'logs/fern-launcher.log'}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button onClick={onOpenLogFolder} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}>
            <Folder size={14} />
            <span>Open Log Folder</span>
          </button>
          <button onClick={handleCopyLogs} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}>
            {copied ? <Check size={14} color="var(--color-accent)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button onClick={onClearView} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}>
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filter messages or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '350px' }}
        />

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              style={{
                background: filterLevel === lvl ? 'var(--bg-tertiary)' : 'transparent',
                color: filterLevel === lvl ? 'var(--text-main)' : 'var(--text-dim)',
                border: filterLevel === lvl ? '1px solid var(--border-subtle)' : '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Output Window */}
      <div
        ref={logContainerRef}
        style={{
          flex: 1,
          minHeight: '400px',
          background: '#070a0f',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          fontFamily: 'Consolas, "Fira Code", monospace',
          fontSize: '0.78rem',
          lineHeight: 1.5,
          overflowY: 'auto',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
        }}
      >
        {filteredLogs.map((log) => (
          <div key={log.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              {log.timestamp.split('T')[1].replace('Z', '')}
            </span>
            <span style={{ color: getLevelColor(log.level), fontWeight: 700, width: '45px', flexShrink: 0 }}>
              [{log.level}]
            </span>
            <span style={{ color: '#a78bfa', flexShrink: 0 }}>
              [{log.tag}]
            </span>
            <span style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>
              {log.message}
            </span>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', paddingTop: '4rem' }}>
            No logs match the current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
