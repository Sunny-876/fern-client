import React, { useState, useEffect } from 'react';
import { UserPlus, Check, Trash2, ShieldCheck, Info, Sparkles, UserCheck, Cloud, LogIn, LogOut, KeyRound, Mail, RefreshCw } from 'lucide-react';
import { Account, CreateLocalAccountDTO } from '../../../../shared/models/account';
import { FernAuthSession, FernAuthUser } from '../../../../shared/models/auth';
import { Modal } from '../components/Modal';

interface AccountsPageProps {
  accounts: Account[];
  activeAccount: Account | null;
  onSelectAccount: (id: string) => Promise<void>;
  onCreateLocalAccount: (dto: CreateLocalAccountDTO) => Promise<void>;
  onRemoveAccount: (id: string) => Promise<void>;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
  accounts,
  activeAccount,
  onSelectAccount,
  onCreateLocalAccount,
  onRemoveAccount,
}) => {
  // Local Minecraft Profile Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fern Online Account State
  const [fernSession, setFernSession] = useState<FernAuthSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  useEffect(() => {
    loadFernSession();
  }, []);

  const loadFernSession = async () => {
    if (window.fern?.getFernSession) {
      try {
        const s = await window.fern.getFernSession();
        setFernSession(s);
      } catch {
        // ignore
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = username.trim();
    if (clean.length < 3 || clean.length > 16 || !/^[a-zA-Z0-9_]+$/.test(clean)) {
      setError('Username must be 3-16 characters and contain only letters, numbers, and underscores.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateLocalAccount({ displayName: clean });
      setUsername('');
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFernAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (authMode === 'register') {
        await window.fern?.fernRegister({
          email: authEmail.trim(),
          username: authUsername.trim(),
          password: authPassword,
          displayName: authDisplayName.trim() || undefined,
        });
        // Switch to login with credentials prefilled
        const s = await window.fern?.fernLogin({
          loginIdentifier: authUsername.trim() || authEmail.trim(),
          password: authPassword,
        });
        if (s) setFernSession(s);
        setAuthModalOpen(false);
      } else {
        const s = await window.fern?.fernLogin({
          loginIdentifier: authUsername.trim() || authEmail.trim(),
          password: authPassword,
        });
        if (s) setFernSession(s);
        setAuthModalOpen(false);
      }
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication operation failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleFernLogout = async () => {
    if (window.fern?.fernLogout) {
      await window.fern.fernLogout();
      setFernSession(null);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyTokenInput.trim() || !window.fern?.verifyFernEmail) return;
    try {
      await window.fern.verifyFernEmail(verifyTokenInput.trim());
      setVerifyMessage('Email address verified successfully!');
      await loadFernSession();
    } catch (err: any) {
      setVerifyMessage(`Verification error: ${err.message}`);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>Accounts & Online Identity</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Manage player profiles for legitimate offline gameplay and official Fern Client online infrastructure.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            onClick={() => {
              setUsername('');
              setError(null);
              setModalOpen(true);
            }}
            className="btn-primary"
            style={{ fontSize: '0.82rem' }}
          >
            <UserPlus size={16} />
            <span>Add Local Profile</span>
          </button>
        </div>
      </div>

      {/* Fern Online Account Card (Phase 10) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
            }}>
              <Cloud size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  Fern Client Online Account
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: fernSession ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: fernSession ? '#4ade80' : 'var(--text-muted)',
                }}>
                  {fernSession ? 'Authenticated' : 'Optional / Sign In'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Enables cloud configuration synchronization, real-time presence across friends, and verified cosmetic ownership.
              </p>
            </div>
          </div>

          <div>
            {fernSession ? (
              <button
                onClick={handleFernLogout}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', color: '#f87171' }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthError(null);
                  setAuthMode('login');
                  setAuthModalOpen(true);
                }}
                className="btn-primary"
                style={{ fontSize: '0.78rem' }}
              >
                <LogIn size={14} />
                <span>Sign In to Fern</span>
              </button>
            )}
          </div>
        </div>

        {fernSession && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--color-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                fontWeight: 700,
              }}>
                {fernSession.user.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {fernSession.user.displayName} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>@{fernSession.user.username}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{fernSession.user.email}</span>
                  {fernSession.user.isEmailVerified ? (
                    <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={12} /> Verified
                    </span>
                  ) : (
                    <span style={{ color: '#facc15' }}>Email Unverified</span>
                  )}
                </div>
              </div>
            </div>

            {!fernSession.user.isEmailVerified && (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Paste verify token"
                  value={verifyTokenInput}
                  onChange={(e) => setVerifyTokenInput(e.target.value)}
                  style={{ fontSize: '0.75rem', padding: '4px 8px', width: '140px' }}
                />
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Verify
                </button>
              </div>
            )}
          </div>
        )}

        {verifyMessage && (
          <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>{verifyMessage}</div>
        )}
      </div>

      {/* Security & Architecture Notice */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '0.9rem 1.1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}>
        <ShieldCheck size={18} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-main)' }}>Security & Authentication Architecture:</strong>
          {' '}Local profiles generate deterministic RFC 4122 v3 UUIDs for local environments and LAN servers.
          Official Microsoft OAuth 2.0 & Xbox Live authentication operates with zero password storage. Fern accounts are completely isolated from Microsoft Minecraft authentication.
        </div>
      </div>

      {/* Minecraft Local / Microsoft Accounts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>Minecraft Game Accounts</h3>

        {accounts.map((acc) => {
          const isActive = activeAccount?.id === acc.id;

          return (
            <div
              key={acc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                background: isActive ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                border: isActive ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}>
                  {acc.skinUrl ? (
                    <img src={acc.skinUrl} alt={acc.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {acc.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      {acc.displayName}
                    </span>
                    {isActive && (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        background: 'rgba(34, 197, 94, 0.15)',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                      }}>
                        <Check size={10} /> Active
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Type: <span style={{ textTransform: 'capitalize', color: 'var(--text-main)' }}>{acc.type}</span> &bull; UUID: {acc.uuid.substring(0, 8)}...
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!isActive && (
                  <button
                    onClick={() => onSelectAccount(acc.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                  >
                    Select
                  </button>
                )}
                {accounts.length > 1 && (
                  <button
                    onClick={() => onRemoveAccount(acc.id)}
                    className="btn-secondary"
                    title="Remove Account"
                    style={{ padding: '0.35rem', color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Local Profile Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Local Profile">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && (
            <div style={{
              background: 'var(--color-danger-subtle)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger)',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Minecraft Username
            </label>
            <input
              type="text"
              placeholder="e.g. FernPlayer"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
              3 to 16 alphanumeric characters. A deterministic offline UUID will be generated.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Fern Online Account Modal (Sign In / Register) */}
      <Modal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={authMode === 'login' ? 'Sign In to Fern Client' : 'Create Free Fern Account'}
      >
        <form onSubmit={handleFernAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {authError && (
            <div style={{
              background: 'var(--color-danger-subtle)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger)',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
            }}>
              {authError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <button
              type="button"
              className={authMode === 'login' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', flex: 1 }}
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', flex: 1 }}
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
            >
              Register
            </button>
          </div>

          {authMode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="player@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Fern Enthusiast"
                  value={authDisplayName}
                  onChange={(e) => setAuthDisplayName(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              {authMode === 'register' ? 'Desired Username' : 'Username or Email'}
            </label>
            <input
              type="text"
              placeholder="e.g. FernPlayer"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={authSubmitting}
              className="btn-primary"
            >
              {authSubmitting ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
