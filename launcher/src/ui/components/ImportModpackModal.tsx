import React, { useState, useEffect } from 'react';
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Installation } from '../../../../shared/models/installation';
import { ModpackImportProgress } from '../../../../shared/models/modpack';
import { Modal } from './Modal';

interface ImportModpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (installation: Installation) => void;
}

export const ImportModpackModal: React.FC<ImportModpackModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ModpackImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !window.fern) return;
    const unsub = window.fern.onModpackImportProgress((update) => {
      setProgress(update);
    });
    return unsub;
  }, [isOpen]);

  const handleSelectFile = async () => {
    if (!window.fern) return;
    try {
      const selected = await window.fern.selectArchiveFile();
      if (selected) {
        setArchivePath(selected);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select file');
    }
  };

  const handleStartImport = async () => {
    if (!archivePath || !window.fern) return;
    setIsImporting(true);
    setError(null);

    try {
      const inst = await window.fern.importModpack(archivePath);
      setIsImporting(false);
      onImportComplete(inst);
      onClose();
    } catch (err: any) {
      setIsImporting(false);
      setError(err.message || 'Modpack installation failed.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isImporting ? () => {} : onClose} title="Import Modpack" maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Import standard <strong>.mrpack</strong> (Modrinth) or generic modpack <strong>.zip</strong> archives into Fern Client.
        </p>

        {/* File Picker Zone */}
        {!isImporting && (
          <div
            onClick={handleSelectFile}
            style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              background: archivePath ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-tertiary)',
              borderColor: archivePath ? 'var(--color-accent)' : 'var(--border-subtle)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {archivePath ? (
              <>
                <FileArchive size={36} color="var(--color-accent)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {archivePath.split(/[\\/]/).pop()}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Click to change file</span>
              </>
            ) : (
              <>
                <UploadCloud size={36} color="var(--text-dim)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Choose Modpack Archive
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Supports .mrpack and .zip archives
                </span>
              </>
            )}
          </div>
        )}

        {/* Progress State */}
        {isImporting && progress && (
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                Stage: {progress.stage}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                {progress.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress.percentage}%`,
                height: '100%',
                background: 'var(--color-accent)',
                transition: 'width 0.2s ease',
              }} />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {progress.message}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#f87171',
            fontSize: '0.85rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            onClick={onClose}
            disabled={isImporting}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              cursor: isImporting ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleStartImport}
            disabled={!archivePath || isImporting}
            style={{
              background: !archivePath || isImporting ? 'var(--bg-tertiary)' : 'var(--color-accent)',
              color: !archivePath || isImporting ? 'var(--text-dim)' : '#000000',
              border: 'none',
              padding: '0.5rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: !archivePath || isImporting ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {isImporting ? (
              <>
                <Loader2 className="spinner" size={15} />
                <span>Installing...</span>
              </>
            ) : (
              <span>Install Modpack</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
