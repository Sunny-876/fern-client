import React from 'react';
import {
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Cloud,
  Terminal,
  Lock,
} from 'lucide-react';

export const FeatureSection: React.FC = () => {
  const features = [
    {
      icon: Sparkles,
      color: '#22c55e',
      title: 'Zero-GC HUD Engine',
      description: 'In-game HUD widgets crafted to avoid creating temporary runtime objects during frame renders, minimizing garbage-collection latency spikes.',
      status: 'Implemented',
    },
    {
      icon: Layers,
      color: '#3b82f6',
      title: 'Multi-Loader Support',
      description: 'Seamless integration for Fabric, NeoForge, and Forge. Automatically resolves launch manifests, libraries, and loader arguments.',
      status: 'Implemented',
    },
    {
      icon: Cpu,
      color: '#eab308',
      title: 'RAM Advisor & JVM Synthesis',
      description: 'System-aware memory advisor that detects hardware boundaries and synthesizes tested G1GC/ZGC arguments tailored to your runtime version.',
      status: 'Implemented',
    },
    {
      icon: ShieldCheck,
      color: '#10b981',
      title: 'Offline-First Resilience',
      description: 'Core launcher, instance switching, and local Minecraft gameplay function 100% offline without mandatory cloud dependencies.',
      status: 'Implemented',
    },
    {
      icon: RotateCcw,
      color: '#8b5cf6',
      title: 'Safe Mode & Rollback',
      description: 'Automatic diagnosis of launch crashes (Java mismatch, OOM, Mixin conflicts) with 1-click Safe Mode and binary update rollback snapshots.',
      status: 'Implemented',
    },
    {
      icon: Cloud,
      color: '#06b6d4',
      title: 'Opt-In Cloud Sync',
      description: 'Synchronize HUD presets, themes, and keybinds between devices with SHA-256 conflict detection (409 Conflict) and zero token leakage.',
      status: 'Implemented',
    },
    {
      icon: Lock,
      color: '#f97316',
      title: 'Encrypted Credential Vault',
      description: 'Microsoft OAuth authentication tokens are stored using AES-256-GCM encryption with local Windows machine keys. Passwords are never stored.',
      status: 'Implemented',
    },
    {
      icon: Terminal,
      color: '#ec4899',
      title: 'Native Fabric/NeoForge Companion',
      description: 'Java companion mod reading server-validated cosmetics and HUD elements directly inside the Minecraft 3D world view.',
      status: 'In Development',
    },
  ];

  return (
    <section id="features" style={{ padding: '4rem 0' }}>
      <div className="container">
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem' }}>
          <div className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>
            Core Architecture
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            Engineered for stability, speed, and privacy
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Fern Client focuses on transparent, reproducible engineering instead of bloated marketing promises. Here is what is genuinely built and available today.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            const isImplemented = feat.status === 'Implemented';
            return (
              <div
                key={feat.title}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: `${feat.color}15`,
                        border: `1px solid ${feat.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: feat.color,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: isImplemented ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color: isImplemented ? '#22c55e' : '#eab308',
                        border: `1px solid ${isImplemented ? 'rgba(34, 197, 94, 0.25)' : 'rgba(234, 179, 8, 0.25)'}`,
                      }}
                    >
                      {feat.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
