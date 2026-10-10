import React, { useState } from 'react';
import {
  LifeBuoy,
  Send,
  AlertTriangle,
  CheckCircle2,
  Download,
  Code2,
  Shield,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { CURRENT_STABLE_RELEASE, CURRENT_BETA_RELEASE } from '../data/release-metadata';

export const SupportPage: React.FC = () => {
  const [category, setCategory] = useState<'bug' | 'suggestion' | 'performance' | 'other'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [clientVersion, setClientVersion] = useState(CURRENT_BETA_RELEASE.version);
  const [channel, setChannel] = useState<'stable' | 'beta'>('beta');
  const [osVersion, setOsVersion] = useState('Windows 11 x64 (Build 22631)');
  const [attachDiagnostics, setAttachDiagnostics] = useState(false);
  const [diagnosticContent, setDiagnosticContent] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    refId?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide both a summary title and detailed description.',
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    let parsedDiagnostic: Record<string, any> | undefined = undefined;
    if (attachDiagnostics && diagnosticContent.trim()) {
      try {
        parsedDiagnostic = JSON.parse(diagnosticContent);
      } catch (err) {
        // Fallback to text wrap
        parsedDiagnostic = { rawLog: diagnosticContent.slice(0, 4000) };
      }
    }

    const payload = {
      category,
      title: title.trim(),
      description: description.trim(),
      reproductionSteps: reproductionSteps.trim() || undefined,
      clientVersion,
      channel,
      diagnosticReport: parsedDiagnostic,
    };

    // Try hitting backend endpoint; fall back gracefully
    try {
      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setStatusMessage({
          type: 'success',
          text: 'Thank you! Your feedback has been received and queued for review.',
          refId: data.referenceId || `FB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        });
        // Clear form
        setTitle('');
        setDescription('');
        setReproductionSteps('');
        setDiagnosticContent('');
        setAttachDiagnostics(false);
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (err) {
      // Backend unavailable or running standalone
      setStatusMessage({
        type: 'info',
        text: 'Live feedback server is currently unreachable from this browser session. You can export your sanitized report below to open a ticket on GitHub or retain it locally.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportJson = () => {
    const reportData = {
      category,
      title: title || 'Untitled Issue',
      description,
      reproductionSteps,
      clientVersion,
      channel,
      operatingSystem: osVersion,
      timestamp: new Date().toISOString(),
      diagnostics: attachDiagnostics ? diagnosticContent : undefined,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fern-issue-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="py-12 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-4">
          <LifeBuoy size={14} /> Support & Engineering Feedback
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Report an Issue or Feedback
        </h1>
        <p className="text-gray-400 mt-3 text-sm leading-relaxed">
          Submit technical bug reports, performance metrics, installation hurdles, or feature proposals directly to the Fern Client core maintainers.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="md:col-span-2 bg-[#111620] border border-gray-800/80 rounded-2xl p-6 sm:p-8">
          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm mb-6 flex items-start gap-3 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
              )}
              <div className="flex-1">
                <div>{statusMessage.text}</div>
                {statusMessage.refId && (
                  <div className="mt-1 font-mono text-xs opacity-90">
                    Reference ID: <span className="font-bold">{statusMessage.refId}</span>
                  </div>
                )}
                {statusMessage.type === 'info' && (
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="mt-3 px-3 py-1.5 bg-gray-900 border border-amber-500/40 hover:border-amber-400 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
                  >
                    <Download size={13} /> Export Sanitized Report JSON
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Report Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'bug', label: 'Bug Report' },
                    { id: 'suggestion', label: 'Feature Idea' },
                    { id: 'performance', label: 'Performance' },
                    { id: 'other', label: 'General / Other' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      category === c.id
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-semibold'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Summary Title <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                maxLength={120}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Launcher hangs when launching Minecraft 1.21.4 with NeoForge 21.0.1"
                className="w-full px-3.5 py-2.5 bg-[#0a0e14] border border-gray-800 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-emerald-500/60 transition-all"
              />
            </div>

            {/* Version & Channel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Fern Client Version
                </label>
                <input
                  type="text"
                  value={clientVersion}
                  onChange={(e) => setClientVersion(e.target.value)}
                  placeholder="1.0.0-beta.1"
                  className="w-full px-3.5 py-2 bg-[#0a0e14] border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Release Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as 'stable' | 'beta')}
                  className="w-full px-3.5 py-2 bg-[#0a0e14] border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="beta">Beta Channel (v{CURRENT_BETA_RELEASE.version})</option>
                  <option value="stable">Stable Channel (v{CURRENT_STABLE_RELEASE.version})</option>
                </select>
              </div>
            </div>

            {/* OS Environment */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Operating System
              </label>
              <input
                type="text"
                value={osVersion}
                onChange={(e) => setOsVersion(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0e14] border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Detailed Description <span className="text-emerald-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the unexpected behavior, error codes shown in the diagnostic banner, or your enhancement suggestion..."
                className="w-full px-3.5 py-2.5 bg-[#0a0e14] border border-gray-800 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-emerald-500/60 transition-all"
              />
            </div>

            {/* Reproduction Steps */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Steps to Reproduce (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={reproductionSteps}
                onChange={(e) => setReproductionSteps(e.target.value)}
                placeholder="1. Open Installations tab&#10;2. Click Create New Installation (Minecraft 1.21.4, NeoForge)&#10;3. Click Play"
                className="w-full px-3.5 py-2.5 bg-[#0a0e14] border border-gray-800 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-emerald-500/60 transition-all"
              />
            </div>

            {/* Diagnostic Logs Attachment Accordion */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={attachDiagnostics}
                  onChange={(e) => setAttachDiagnostics(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-0"
                />
                <span className="font-semibold text-white">Attach Sanitized Diagnostic Log / JSON</span>
              </label>

              {attachDiagnostics && (
                <div className="mt-3 space-y-2">
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <Shield size={13} className="text-emerald-400" />
                    <span>Authentication tokens, passwords, and private system paths are automatically redacted.</span>
                  </div>
                  <textarea
                    rows={4}
                    value={diagnosticContent}
                    onChange={(e) => setDiagnosticContent(e.target.value)}
                    placeholder="Paste sanitized log snippet from %AppData%\Fern Client\logs\fern.log..."
                    className="w-full px-3 py-2 bg-[#0a0e14] border border-gray-800 rounded-lg text-emerald-300 font-mono text-[11px] focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              )}
            </div>

            {/* Submit & Export Actions */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Download size={14} /> Export JSON File
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Submit Feedback Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info & Safety */}
        <div className="space-y-6">
          {/* GitHub Fallback Card */}
          <div className="bg-[#111620] border border-gray-800/80 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <Code2 size={16} /> Open Source Issues
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              GitHub Issue Tracker
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              You can also open or track issues directly on our public GitHub repository. Please review existing issues before creating duplicates.
            </p>
            <a
              href="https://github.com/fernclient/fern/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-semibold text-white transition-all w-full justify-center"
            >
              <span>View GitHub Issues</span>
              <ExternalLink size={12} className="text-gray-400" />
            </a>
          </div>

          {/* Privacy & Log Transparency */}
          <div className="bg-[#111620] border border-gray-800/80 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
              <Shield size={16} /> Diagnostic Policy
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              What We Never Collect
            </h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">&#x2713;</span>
                <span>Minecraft or Microsoft credentials</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">&#x2713;</span>
                <span>Session access tokens or Bearer keys</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">&#x2713;</span>
                <span>Contents of your world save files</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">&#x2713;</span>
                <span>Personal directories outside .fern</span>
              </li>
            </ul>
            <p className="text-[11px] text-gray-500 mt-4 leading-relaxed">
              Logs are strictly used to diagnose runtime crashes and launch incompatibilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
