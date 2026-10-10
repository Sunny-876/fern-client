import React from 'react';
import { AlertTriangle, Terminal, Settings as SettingsIcon, X } from 'lucide-react';
import { Modal } from './Modal';

export interface LaunchErrorInfo {
  title: string;
  message: string;
  possibleCause?: string;
  selectedJava?: number | string;
  requiredJava?: number | string;
  details?: unknown;
}

interface ErrorModalProps {
  error: LaunchErrorInfo | null;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
  onLaunchSafeMode?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  error,
  onClose,
  onOpenSettings,
  onOpenLogs,
  onLaunchSafeMode,
}) => {
  if (!error) return null;

  return (
    <Modal isOpen={!!error} onClose={onClose} title={error.title || 'Launch Diagnostics'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.9rem',
          background: 'var(--color-danger-subtle)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
        }}>
          <AlertTriangle size={24} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              {error.message}
            </div>
            {error.possibleCause && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--color-danger)' }}>Diagnosis:</strong> {error.possibleCause}
              </div>
            )}
          </div>
        </div>

        {(error.selectedJava !== undefined || error.requiredJava !== undefined) && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            fontSize: '0.8rem',
          }}>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Selected Java</div>
              <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.92rem', marginTop: '0.2rem' }}>
                {error.selectedJava ? `Java ${error.selectedJava}` : 'Unknown'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Required Java</div>
              <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.92rem', marginTop: '0.2rem' }}>
                {error.requiredJava ? `Java ${error.requiredJava}+` : 'Compatible Java'}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              onClose();
              onOpenLogs();
            }}
            className="btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <Terminal size={14} />
            <span>View Logs</span>
          </button>
          {onLaunchSafeMode && (
            <button
              onClick={() => {
                onClose();
                onLaunchSafeMode();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                color: '#eab308',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Launch in Safe Mode</span>
            </button>
          )}
          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            <SettingsIcon size={14} />
            <span>Change Settings</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
