import React from 'react';
import { Check, Info, AlertTriangle } from 'lucide-react';

export const CompatibilityMatrixSection: React.FC = () => {
  const matrix = [
    {
      version: 'Minecraft 1.21.4 (Modern)',
      java: 'Java 21 (LTS)',
      vanilla: true,
      fabric: true,
      neoforge: true,
      forge: false,
      notes: 'Recommended target version. Full HUD companion and shader support.',
    },
    {
      version: 'Minecraft 1.20.4 (LTS)',
      java: 'Java 17 (LTS)',
      vanilla: true,
      fabric: true,
      neoforge: true,
      forge: true,
      notes: 'Stable multi-loader ecosystem with extensive optimization mods.',
    },
    {
      version: 'Minecraft 1.16.5 (Legacy)',
      java: 'Java 8 / 11',
      vanilla: true,
      fabric: true,
      neoforge: false,
      forge: true,
      notes: 'Classic modpack standard. Lightweight heap requirements.',
    },
    {
      version: 'Minecraft 1.8.9 (PvP Legacy)',
      java: 'Java 8',
      vanilla: true,
      fabric: false,
      neoforge: false,
      forge: true,
      notes: 'Legacy competitive combat standard with custom keystrokes HUD.',
    },
  ];

  return (
    <section style={{ padding: '3.5rem 0' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            Verified Compatibility Matrix
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Fern Client does not claim universal compatibility. Every supported combination below has been validated with automated test suites.
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem 1.25rem', color: '#fff', fontWeight: 600 }}>Minecraft Release</th>
                <th style={{ padding: '1rem 1.25rem', color: '#fff', fontWeight: 600 }}>Required Java</th>
                <th style={{ padding: '1rem 0.75rem', color: '#fff', fontWeight: 600, textAlign: 'center' }}>Vanilla</th>
                <th style={{ padding: '1rem 0.75rem', color: '#fff', fontWeight: 600, textAlign: 'center' }}>Fabric</th>
                <th style={{ padding: '1rem 0.75rem', color: '#fff', fontWeight: 600, textAlign: 'center' }}>NeoForge</th>
                <th style={{ padding: '1rem 0.75rem', color: '#fff', fontWeight: 600, textAlign: 'center' }}>Forge</th>
                <th style={{ padding: '1rem 1.25rem', color: '#fff', fontWeight: 600 }}>Verification Notes</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.version} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#fff' }}>{row.version}</td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                    <span className="code-inline">{row.java}</span>
                  </td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                    <Check size={16} color="#22c55e" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                    {row.fabric ? <Check size={16} color="#22c55e" style={{ margin: '0 auto' }} /> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                    {row.neoforge ? <Check size={16} color="#22c55e" style={{ margin: '0 auto' }} /> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                    {row.forge ? <Check size={16} color="#22c55e" style={{ margin: '0 auto' }} /> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {row.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
