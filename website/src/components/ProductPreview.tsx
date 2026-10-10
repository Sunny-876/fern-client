import React, { useState } from 'react';
import { Play, Sparkles, Cpu, Layers, Sliders, CheckCircle2, Shield, Folder, RefreshCw } from 'lucide-react';

export const ProductPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'launcher' | 'hud' | 'performance' | 'modding'>('launcher');

  return (
    <div style={{ margin: '3.5rem 0' }}>
      <div className="container">
        {/* Preview Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {[
            { id: 'launcher', label: 'Desktop Launcher' },
            { id: 'hud', label: 'In-Game HUD Editor' },
            { id: 'performance', label: 'Memory & JVM Advisor' },
            { id: 'modding', label: 'Mod Loader Management' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: activeTab === tab.id ? 600 : 500,
                background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                border: `1px solid ${activeTab === tab.id ? 'var(--border-hover)' : 'transparent'}`,
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mock Window Frame */}
        <div
          style={{
            background: '#0d121a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          }}
        >
          {/* Window Header */}
          <div
            style={{
              padding: '0.65rem 1rem',
              background: '#090d14',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <span style={{ marginLeft: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Fern Client — v1.0.0
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                <CheckCircle2 size={12} /> Online
              </span>
              <span>Java 21.0.4 Detected</span>
            </div>
          </div>

          {/* Window Content */}
          <div style={{ padding: '2rem', minHeight: '380px' }}>
            {activeTab === 'launcher' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: '#131a24', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#22c55e', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>
                    Active Installation
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                    Fabric 1.21.4 (Latest Release)
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    Configured with Sodium, Lithium, and Fern HUD companion. 4096 MB RAM allocated with G1GC optimization.
                  </p>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <div className="badge badge-blue">Fabric 0.16.5</div>
                    <div className="badge">Java 21</div>
                    <div className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>60 FPS Cap: Unlimited</div>
                  </div>
                </div>

                <div style={{ background: '#131a24', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>
                      Ready to Launch
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '1rem' }}>
                      Player: <span style={{ color: '#22c55e', fontWeight: 600 }}>FernPlayer</span> (Offline Profile)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#22c55e',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: '#052e16',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }}
                    >
                      <Play size={18} fill="#052e16" /> Play Minecraft
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hud' && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <Sparkles size={32} color="#22c55e" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                    Modular Snap-Grid HUD Editor
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Real-time draggable in-game widgets engineered with zero garbage-collection overhead. Position FPS counters, CPS metrics, Keystrokes, Armor status, and Coordinates anywhere on your screen.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ background: '#131a24', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#22c55e' }}>
                      FPS: 240
                    </div>
                    <div style={{ background: '#131a24', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#60a5fa' }}>
                      XYZ: 142 68 -290
                    </div>
                    <div style={{ background: '#131a24', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#eab308' }}>
                      CPS: 12 | 8
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#131a24', padding: '1.25rem', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Automated RAM Recommendation
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    System RAM: 16 GB • Recommended: 4096 MB (25% capacity limit protection)
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '25%', height: '100%', background: '#22c55e' }} />
                  </div>
                </div>

                <div style={{ background: '#131a24', padding: '1.25rem', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>
                    Garbage Collector Tuning
                  </h4>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#94a3b8', background: '#090d14', padding: '0.65rem', borderRadius: '6px' }}>
                    -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'modding' && (
              <div style={{ padding: '1rem 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: '#131a24', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>Fabric Loader</div>
                    <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.2rem' }}>Verified 0.16.x</div>
                  </div>
                  <div style={{ background: '#131a24', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>NeoForge</div>
                    <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '0.2rem' }}>Verified 21.4.x</div>
                  </div>
                  <div style={{ background: '#131a24', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>Modrinth Modpacks</div>
                    <div style={{ fontSize: '0.75rem', color: '#eab308', marginTop: '0.2rem' }}>.mrpack import/export</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
