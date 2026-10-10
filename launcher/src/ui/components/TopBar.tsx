import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Compass, Wifi, WifiOff, Cloud, AlertCircle, RefreshCw, UserCheck, Search } from 'lucide-react';
import { BRANDING } from '../../../../shared/constants/branding';
import { NetworkStatus } from '../../../../shared/models/auth';

interface TopBarProps {
  version: string;
  onOpenSearch?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ version, onOpenSearch }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);

  useEffect(() => {
    if (window.fern?.getNetworkStatus) {
      window.fern.getNetworkStatus().then((s) => setNetworkStatus(s)).catch(() => {});
    }

    if (window.fern?.onNetworkStatusChanged) {
      const cleanup = window.fern.onNetworkStatusChanged((status) => {
        setNetworkStatus(status);
      });
      return cleanup;
    }
  }, []);

  const handleMinimize = () => window.fern?.minimizeWindow();
  const handleMaximize = () => window.fern?.maximizeWindow();
  const handleClose = () => window.fern?.closeWindow();

  const handleRetryConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.fern?.checkNetworkStatus) {
      const s = await window.fern.checkNetworkStatus();
      setNetworkStatus(s);
    }
  };

  const renderStatusBadge = () => {
    if (!networkStatus) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.68rem',
          color: 'var(--text-dim)',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '2px 8px',
          borderRadius: '9999px',
          cursor: 'pointer',
        }} onClick={handleRetryConnection} title="Connecting to Fern backend...">
          <RefreshCw size={10} className="animate-spin" />
          <span>Connecting...</span>
        </div>
      );
    }

    switch (networkStatus.state) {
      case 'connected':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.68rem',
            color: '#4ade80',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 500,
          }} title={`Connected as @${networkStatus.currentUser?.username || 'User'}`}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
            <Cloud size={11} />
            <span>Cloud Online</span>
          </div>
        );
      case 'auth_required':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.68rem',
            color: '#facc15',
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 500,
          }} title="Backend reachable. Sign in to Fern Account for cloud sync & real-time presence.">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
            <Wifi size={11} />
            <span>Sign In to Sync</span>
          </div>
        );
      case 'sync_conflict':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.68rem',
            color: '#fb923c',
            background: 'rgba(249, 115, 22, 0.15)',
            border: '1px solid rgba(249, 115, 22, 0.35)',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 600,
          }} title="Cloud configuration conflict detected. Visit Settings > Cloud Sync to resolve.">
            <AlertCircle size={11} />
            <span>Sync Conflict</span>
          </div>
        );
      case 'service_unavailable':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.68rem',
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '2px 8px',
            borderRadius: '9999px',
            cursor: 'pointer',
          }} onClick={handleRetryConnection} title="Cloud service degraded. Click to retry.">
            <AlertCircle size={11} />
            <span>Cloud Offline</span>
          </div>
        );
      case 'offline':
      default:
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '2px 8px',
            borderRadius: '9999px',
            cursor: 'pointer',
          }} onClick={handleRetryConnection} title="Offline Mode: Local features and Minecraft launching fully available. Click to recheck backend.">
            <WifiOff size={11} />
            <span>Offline Mode</span>
          </div>
        );
    }
  };

  return (
    <header style={{
      height: '38px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 0.75rem',
      userSelect: 'none',
      WebkitAppRegion: 'drag',
      zIndex: 100,
    } as any}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '5px',
          background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(34, 197, 94, 0.3)',
        }}>
          <Compass size={13} color="#ffffff" />
        </div>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.02em', color: 'var(--text-main)' }}>
          {BRANDING.APP_NAME}
        </span>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 500,
        }}>
          v{version}
        </span>

        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            title="Search client or jump to settings (Ctrl+K)"
            aria-label="Search client"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-dim)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              marginLeft: '8px',
              WebkitAppRegion: 'no-drag',
            } as any}
          >
            <Search size={11} />
            <span>Search</span>
            <kbd style={{ fontSize: '0.62rem', padding: '1px 3px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px' }}>Ctrl K</kbd>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', WebkitAppRegion: 'no-drag' } as any}>
        {renderStatusBadge()}

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={handleMinimize}
            title="Minimize"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              width: '36px',
              height: '32px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleMaximize}
            title="Maximize"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              width: '36px',
              height: '32px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Square size={12} />
          </button>
          <button
            onClick={handleClose}
            title="Close"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              width: '36px',
              height: '32px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
