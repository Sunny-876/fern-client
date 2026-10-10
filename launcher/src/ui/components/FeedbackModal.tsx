import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Bug,
  AlertTriangle,
  Download,
  Cpu,
  Layers,
  Sparkles,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Layout,
  HardDrive,
} from 'lucide-react';
import { BRANDING } from '../../../../shared/constants/branding';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: 'stable' | 'beta';
}

export type FeedbackCategory =
  | 'bug'
  | 'crash'
  | 'installation'
  | 'performance'
  | 'mod_compatibility'
  | 'ui'
  | 'feature_request';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  channel = 'beta',
}) => {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minecraftVersion, setMinecraftVersion] = useState('');
  const [javaVersion, setJavaVersion] = useState('');
  const [loader, setLoader] = useState('');
  const [loaderVersion, setLoaderVersion] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');

  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [showDiagPreview, setShowDiagPreview] = useState(false);
  const [diagPreviewData, setDiagPreviewData] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    referenceId?: string;
    message?: string;
    localFilePath?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && attachDiagnostics && window.fern) {
      window.fern
        .generateDiagnosticReport()
        .then((report) => setDiagPreviewData(JSON.stringify(report, null, 2)))
        .catch(() => setDiagPreviewData(null));
    }
  }, [isOpen, attachDiagnostics]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      let diagReport: any = undefined;
      if (attachDiagnostics && window.fern) {
        try {
          diagReport = await window.fern.generateDiagnosticReport();
        } catch {}
      }

      const payload = {
        category,
        title: title.trim(),
        description: description.trim(),
        minecraftVersion: minecraftVersion.trim() || undefined,
        javaVersion: javaVersion.trim() || undefined,
        loader: loader.trim() || undefined,
        loaderVersion: loaderVersion.trim() || undefined,
        reproductionSteps: reproductionSteps.trim() || undefined,
        expectedResult: expectedResult.trim() || undefined,
        actualResult: actualResult.trim() || undefined,
        clientVersion: BRANDING.VERSION,
        channel,
        diagnosticReport: diagReport,
      };

      if (window.fern) {
        const res = await window.fern.submitFeedback(payload);
        if (res && res.success) {
          setSubmissionResult({
            success: true,
            referenceId: res.referenceId,
            message: res.message,
            localFilePath: res.localFilePath,
          });
        } else {
          setSubmissionResult({
            success: false,
            error: res?.error || 'Failed to submit feedback.',
          });
        }
      } else {
        setSubmissionResult({
          success: true,
          referenceId: 'DEV-PREVIEW-FB',
          message: 'Preview mode: feedback recorded.',
        });
      }
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        error: err.message || 'An error occurred during submission.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportLocalJson = async () => {
    if (window.fern) {
      try {
        const p = await window.fern.exportDiagnosticReportFile();
        alert(`Diagnostics exported to: ${p}`);
      } catch (err: any) {
        alert(`Export failed: ${err.message}`);
      }
    }
  };

  const categories: Array<{
    id: FeedbackCategory;
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    color: string;
  }> = [
    { id: 'bug', label: 'Bug Report', icon: Bug, color: '#ef4444' },
    { id: 'crash', label: 'Game Crash', icon: AlertTriangle, color: '#f97316' },
    { id: 'installation', label: 'Installation', icon: HardDrive, color: '#eab308' },
    { id: 'performance', label: 'Performance', icon: Cpu, color: '#3b82f6' },
    { id: 'mod_compatibility', label: 'Mod Compat', icon: Layers, color: '#8b5cf6' },
    { id: 'ui', label: 'UI / Visual', icon: Layout, color: '#06b6d4' },
    { id: 'feature_request', label: 'Feature Request', icon: Sparkles, color: '#10b981' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: 'var(--bg-card, #121820)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MessageSquare size={18} color="#22c55e" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                Beta Feedback & Bug Reporting
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Channel: <strong style={{ color: channel === 'beta' ? '#eab308' : '#22c55e' }}>{channel.toUpperCase()}</strong> | Fern Client {BRANDING.VERSION}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {submissionResult ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              {submissionResult.success ? (
                <>
                  <CheckCircle2 size={46} color="#22c55e" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                    Report Accepted
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                    {submissionResult.message}
                  </p>
                  {submissionResult.referenceId && (
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '0.4rem 0.9rem',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '6px',
                        color: '#22c55e',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        marginBottom: '1.25rem',
                      }}
                    >
                      Reference ID: {submissionResult.referenceId}
                    </div>
                  )}
                  {submissionResult.localFilePath && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.5rem' }}>
                      Diagnostic snapshot stored locally at: <br />
                      <code style={{ color: '#94a3b8' }}>{submissionResult.localFilePath}</code>
                    </p>
                  )}
                  <div>
                    <button
                      onClick={onClose}
                      style={{
                        padding: '0.55rem 1.5rem',
                        borderRadius: '8px',
                        background: '#22c55e',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={46} color="#ef4444" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
                    Submission Failed
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '1.5rem' }}>
                    {submissionResult.error}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => setSubmissionResult(null)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleExportLocalJson}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        background: '#3b82f6',
                        border: 'none',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={14} /> Export Report Locally
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Category picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Issue Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {categories.map((item) => {
                    const Icon = item.icon;
                    const isSelected = category === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCategory(item.id)}
                        style={{
                          padding: '0.55rem 0.4rem',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? item.color : 'rgba(255,255,255,0.08)'}`,
                          color: isSelected ? '#fff' : '#94a3b8',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon size={15} color={isSelected ? item.color : '#94a3b8'} />
                        <span style={{ fontSize: '0.7rem', fontWeight: isSelected ? 600 : 400 }}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 500 }}>
                  Summary / Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. FPS counter drifts 2px on window resize"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 500 }}>
                  Detailed Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what occurred, circumstances, and impact..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Technical Context (Optional) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    Minecraft Version (Optional)
                  </label>
                  <input
                    type="text"
                    value={minecraftVersion}
                    onChange={(e) => setMinecraftVersion(e.target.value)}
                    placeholder="e.g. 1.21.4"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    Java Runtime (Optional)
                  </label>
                  <input
                    type="text"
                    value={javaVersion}
                    onChange={(e) => setJavaVersion(e.target.value)}
                    placeholder="e.g. Temurin 21.0.3"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    Mod Loader (Optional)
                  </label>
                  <input
                    type="text"
                    value={loader}
                    onChange={(e) => setLoader(e.target.value)}
                    placeholder="e.g. Fabric, NeoForge"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    Loader Version (Optional)
                  </label>
                  <input
                    type="text"
                    value={loaderVersion}
                    onChange={(e) => setLoaderVersion(e.target.value)}
                    placeholder="e.g. 0.16.9"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              {/* Reproduction Steps */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Reproduction Steps (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reproductionSteps}
                  onChange={(e) => setReproductionSteps(e.target.value)}
                  placeholder="1. Launch game&#10;2. Navigate to Settings -> HUD&#10;3. Toggle Armor HUD"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Expected vs Actual Result */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    Expected Result (Optional)
                  </label>
                  <input
                    type="text"
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    placeholder="What should have happened"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    Actual Result (Optional)
                  </label>
                  <input
                    type="text"
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    placeholder="What actually occurred"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
              </div>

              {/* Diagnostic Consent & Preview Accordion */}
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="#22c55e" />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>
                        Attach Sanitized Diagnostic Report
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        Hardware, OS, Java & Minecraft version. Passwords and tokens are strictly stripped.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={attachDiagnostics}
                    onChange={(e) => setAttachDiagnostics(e.target.checked)}
                    style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
                  />
                </div>

                {attachDiagnostics && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowDiagPreview(!showDiagPreview)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {showDiagPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {showDiagPreview ? 'Hide Diagnostic Data Preview' : 'Review What Will Be Sent'}
                    </button>

                    {showDiagPreview && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <pre
                          style={{
                            background: '#0a0e14',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            color: '#94a3b8',
                            overflowX: 'auto',
                            maxHeight: '120px',
                            margin: 0,
                          }}
                        >
                          {diagPreviewData || 'Hardware metrics: OS, CPU, RAM, Java runtimes, Minecraft version.'}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.5rem',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={handleExportLocalJson}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Download size={13} /> Export Report Locally
                </button>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !description.trim()}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '6px',
                      background: '#22c55e',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      opacity: isSubmitting || !title.trim() || !description.trim() ? 0.6 : 1,
                    }}
                  >
                    <Send size={14} /> {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
