import React, { useState } from 'react';
import { Coffee, Plus, Check, Trash2, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { JavaRuntime } from '../../../../shared/models/java';

interface JavaPageProps {
  javaRuntimes: JavaRuntime[];
  onRefreshRuntimes?: () => Promise<void>;
  onRescan?: () => Promise<void>;
}

export const JavaPage: React.FC<JavaPageProps> = ({ javaRuntimes, onRefreshRuntimes, onRescan }) => {
  const triggerRefresh = onRefreshRuntimes || onRescan || (async () => {});
  const [manualPath, setManualPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAddManual = async () => {
    if (!manualPath.trim() || !window.fern) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const added = await window.fern.addJavaRuntimeManually(manualPath.trim());
      if (added && added.isValid) {
        setMessage({ text: `Successfully registered ${added.name}!`, type: 'success' });
        setManualPath('');
        await triggerRefresh();
      } else {
        setMessage({ text: 'Invalid Java executable path or execution failed.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to add Java runtime.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (idOrPath: string) => {
    if (!window.fern) return;
    await window.fern.setDefaultJavaRuntime(idOrPath);
    await triggerRefresh();
  };

  const handleRemove = async (idOrPath: string) => {
    if (!window.fern) return;
    await window.fern.removeJavaRuntime(idOrPath);
    await triggerRefresh();
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Java Runtimes</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage Java environments. Minecraft 1.21+ requires Java 21, while legacy versions use Java 8 or 17.
          </p>
        </div>

        <button
          onClick={async () => {
            setIsLoading(true);
            await triggerRefresh();
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Rescan System</span>
        </button>
      </div>

      {message && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${message.type === 'success' ? 'var(--color-accent)' : '#ef4444'}`,
          color: message.type === 'success' ? 'var(--color-accent)' : '#ef4444',
          fontSize: '0.85rem',
        }}>
          {message.text}
        </div>
      )}

      {/* Manual Java Path Input */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} color="var(--color-accent)" />
          <span>Add Custom Java Runtime</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            placeholder="e.g. C:\Program Files\Eclipse Adoptium\jdk-21.0.3.9-hotspot\bin\java.exe"
            style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
            }}
          />
          <button onClick={handleAddManual} disabled={isLoading || !manualPath.trim()} className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            <span>Register</span>
          </button>
        </div>
      </div>

      {/* Runtimes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {javaRuntimes.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '2.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            <AlertCircle size={32} style={{ margin: '0 auto 0.75rem auto', color: '#f59e0b' }} />
            <p>No Java runtimes detected on system.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>Click "Rescan System" or provide path manually.</p>
          </div>
        ) : (
          javaRuntimes.map((rt) => (
            <div
              key={rt.id}
              style={{
                background: 'var(--bg-card)',
                border: rt.isDefault ? '1px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: rt.majorVersion >= 21 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: rt.majorVersion >= 21 ? 'var(--color-accent)' : '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}>
                  {rt.majorVersion}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>{rt.name}</span>
                    {rt.isDefault && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: 'var(--color-accent)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                      }}>
                        Default
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{rt.architecture}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {rt.path}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!rt.isDefault && (
                  <button
                    onClick={() => handleSetDefault(rt.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleRemove(rt.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '0.4rem',
                  }}
                  title="Remove from Fern"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
