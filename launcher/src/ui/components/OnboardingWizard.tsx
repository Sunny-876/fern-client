import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  Layers,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  HardDrive,
  Coffee,
} from 'lucide-react';
import { JavaRuntime } from '../../../../shared/models/java';
import { Installation } from '../../../../shared/models/installation';
import { Account } from '../../../../shared/models/account';

interface OnboardingWizardProps {
  javaRuntimes: JavaRuntime[];
  installations: Installation[];
  onComplete: () => Promise<void>;
  onCreateLocalAccount: (name: string) => Promise<Account>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  javaRuntimes,
  installations,
  onComplete,
  onCreateLocalAccount,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedJava, setSelectedJava] = useState<string>(
    javaRuntimes[0]?.path || ''
  );
  const [allocatedRamMb, setAllocatedRamMb] = useState<number>(4096);
  const [localAccountName, setLocalAccountName] = useState<string>('FernPlayer');
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
  const [accountCreated, setAccountCreated] = useState<boolean>(false);

  const bestJava = javaRuntimes.find((j) => j.majorVersion === 21) || javaRuntimes[0];

  const handleCreateAccount = async () => {
    if (!localAccountName.trim()) return;
    setIsCreatingAccount(true);
    try {
      await onCreateLocalAccount(localAccountName.trim());
      setAccountCreated(true);
    } catch (err) {
      console.error('Account creation error:', err);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const totalSteps = 4;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--bg-card, #121820)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main, #fff)' }}>
                Welcome to Fern Client
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)' }}>
                Step {step} of {totalSteps}: Setup & First-Run Wizard
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: s === step ? '#22c55e' : s < step ? '#16a34a' : 'rgba(255,255,255,0.2)',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '2rem', minHeight: '320px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                Next-Generation Minecraft Client & Launcher
              </h3>
              <p style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Fern Client brings high-performance rendering, a zero-garbage-collection HUD editor, native Fabric & Forge support, and offline-first launcher reliability.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    borderRadius: '10px',
                  }}
                >
                  <Cpu size={20} color="#22c55e" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Optimized Performance</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Engineered JVM tuning and memory allocation guidance.
                  </div>
                </div>

                <div
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    borderRadius: '10px',
                  }}
                >
                  <Shield size={20} color="#3b82f6" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Offline-First & Safe</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Runs locally without compulsory cloud dependencies.
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>
                Java Runtime Configuration
              </h3>
              <p style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Modern Minecraft (1.20.5+) requires Java 21. Fern Client automatically checks your local system runtimes.
              </p>

              {javaRuntimes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {javaRuntimes.map((runtime) => {
                    const isRecommended = runtime.majorVersion === 21;
                    return (
                      <div
                        key={runtime.path}
                        onClick={() => setSelectedJava(runtime.path)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '8px',
                          border: `1px solid ${selectedJava === runtime.path ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                          background: selectedJava === runtime.path ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Coffee size={18} color={isRecommended ? '#22c55e' : '#94a3b8'} />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                              {runtime.name} (Java {runtime.majorVersion})
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{runtime.path}</div>
                          </div>
                        </div>
                        {isRecommended && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(34, 197, 94, 0.2)',
                              color: '#22c55e',
                              fontWeight: 600,
                            }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    color: '#f59e0b',
                    fontSize: '0.85rem',
                  }}
                >
                  No Java runtime automatically detected on your PATH. You can configure custom Java paths anytime in Java Settings.
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>
                Memory & Installation Defaults
              </h3>
              <p style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Choose default memory allocation. For standard Minecraft 4 GB is ideal; for heavy modpacks 6 GB is recommended.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Allocated RAM</span>
                  <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 700 }}>
                    {(allocatedRamMb / 1024).toFixed(1)} GB ({allocatedRamMb} MB)
                  </span>
                </div>
                <input
                  type="range"
                  min="2048"
                  max="12288"
                  step="512"
                  value={allocatedRamMb}
                  onChange={(e) => setAllocatedRamMb(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#22c55e' }}
                />
              </div>

              <div
                style={{
                  padding: '0.85rem',
                  background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <Layers size={18} color="#3b82f6" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Default Installation</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {installations[0]?.name || 'Minecraft 1.21.4 (Latest Release)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>
                Player Profile & Authentication
              </h3>
              <p style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Start playing right away with a local profile, or connect your Microsoft or Fern online account later.
              </p>

              <div
                style={{
                  padding: '1.25rem',
                  background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <User size={18} color="#22c55e" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                    Create Quick Local Profile
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={localAccountName}
                    onChange={(e) => setLocalAccountName(e.target.value)}
                    placeholder="Enter player name"
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                  <button
                    onClick={handleCreateAccount}
                    disabled={isCreatingAccount || accountCreated || !localAccountName.trim()}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: accountCreated ? '#16a34a' : '#22c55e',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    {accountCreated ? <CheckCircle2 size={16} /> : null}
                    {accountCreated ? 'Created' : 'Create Profile'}
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                * Microsoft and Fern online authentication accounts can be added anytime in the Accounts tab.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div
          style={{
            padding: '1.25rem 2rem',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                background: '#22c55e',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={onComplete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
              }}
            >
              Launch Fern Client <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
