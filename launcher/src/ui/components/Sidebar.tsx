import React from 'react';
import {
  Home,
  Layers,
  Package,
  DownloadCloud,
  Users,
  Coffee,
  ArrowDownCircle,
  Gauge,
  Settings,
  Info,
  Terminal,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Account } from '../../../../shared/models/account';

export type TabId =
  | 'home'
  | 'installations'
  | 'cosmetics'
  | 'social'
  | 'mods'
  | 'versions'
  | 'accounts'
  | 'java'
  | 'downloads'
  | 'performance'
  | 'settings'
  | 'about'
  | 'logs';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeAccount: Account | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, activeAccount }) => {
  const tabs = [
    { id: 'home' as TabId, label: 'Home', icon: Home },
    { id: 'installations' as TabId, label: 'Installations', icon: Layers },
    { id: 'cosmetics' as TabId, label: 'Cosmetics', icon: Sparkles },
    { id: 'social' as TabId, label: 'Social', icon: UserCheck },
    { id: 'mods' as TabId, label: 'Mods / Modpacks', icon: Package },
    { id: 'versions' as TabId, label: 'Versions', icon: DownloadCloud },
    { id: 'accounts' as TabId, label: 'Accounts', icon: Users },
    { id: 'java' as TabId, label: 'Java', icon: Coffee },
    { id: 'downloads' as TabId, label: 'Downloads', icon: ArrowDownCircle },
    { id: 'performance' as TabId, label: 'Performance', icon: Gauge },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings },
    { id: 'about' as TabId, label: 'About', icon: Info },
    { id: 'logs' as TabId, label: 'Logs', icon: Terminal },
  ];

  return (
    <aside style={{
      width: '210px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.25rem 0.75rem',
      userSelect: 'none',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 0.75rem 0.5rem 0.75rem',
        }}>
          Navigation
        </div>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                border: isActive ? '1px solid var(--border-focus)' : '1px solid transparent',
                textAlign: 'left',
                justifyContent: 'flex-start',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={17} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
              <span style={{ fontSize: '0.82rem' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Account Mini-Chip */}
      <div
        onClick={() => onSelectTab('accounts')}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          marginTop: '1rem',
          transition: 'border-color var(--transition-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: activeAccount ? '#166534' : 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: '#ffffff',
        }}>
          {activeAccount ? activeAccount.displayName.charAt(0).toUpperCase() : '?'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {activeAccount ? activeAccount.displayName : 'No Profile'}
          </span>
          <span style={{
            fontSize: '0.7rem',
            color: activeAccount?.type === 'microsoft' ? '#60a5fa' : 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            {activeAccount ? (activeAccount.type === 'local' ? 'Local Profile' : 'Microsoft Account') : 'Click to select'}
          </span>
        </div>
      </div>
    </aside>
  );
};
