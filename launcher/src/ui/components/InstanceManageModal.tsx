import React, { useState, useEffect } from 'react';
import {
  Layers,
  Box,
  Image,
  Sun,
  Settings,
  Plus,
  Play,
  Folder,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  RefreshCw,
  Share2,
  Search,
  Check,
  CheckCheck,
  PowerOff,
  Power,
  Zap,
  Cpu,
} from 'lucide-react';
import { Installation } from '../../../../shared/models/installation';
import { Mod, ConflictValidationResult } from '../../../../shared/models/mod';
import { ResourcePack, ShaderPack } from '../../../../shared/models/packs';
import { Modal } from './Modal';
import { AddModsModal } from './AddModsModal';

interface InstanceManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  installation: Installation;
  onLaunch: () => void;
  onOpenFolder: () => void;
  onExportModpack: () => void;
  onUpdateInstallation?: (id: string, dto: any) => Promise<void>;
}

type ManageTab = 'overview' | 'mods' | 'resourcepacks' | 'shaders' | 'performance';

export const InstanceManageModal: React.FC<InstanceManageModalProps> = ({
  isOpen,
  onClose,
  installation,
  onLaunch,
  onOpenFolder,
  onExportModpack,
  onUpdateInstallation,
}) => {
  const [activeTab, setActiveTab] = useState<ManageTab>('mods');

  // Mods State
  const [mods, setMods] = useState<Mod[]>([]);
  const [modFilter, setModFilter] = useState('');
  const [modsLoading, setModsLoading] = useState(false);
  const [addModsOpen, setAddModsOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictValidationResult | null>(null);

  // Packs State
  const [resourcePacks, setResourcePacks] = useState<ResourcePack[]>([]);
  const [shaderPacks, setShaderPacks] = useState<ShaderPack[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen, installation.id]);

  const loadAllData = async () => {
    await Promise.all([loadMods(), loadResourcePacks(), loadShaderPacks()]);
  };

  const loadMods = async () => {
    if (!window.fern) return;
    setModsLoading(true);
    try {
      const list = await window.fern.getInstalledMods(installation.id);
      setMods(list);
      const conflictRes = await window.fern.validateModConflicts(installation.id);
      setConflicts(conflictRes);
    } catch {
      // Ignored
    } finally {
      setModsLoading(false);
    }
  };

  const loadResourcePacks = async () => {
    if (!window.fern) return;
    try {
      const list = await window.fern.getResourcePacks(installation.id);
      setResourcePacks(list);
    } catch {
      // Ignored
    }
  };

  const loadShaderPacks = async () => {
    if (!window.fern) return;
    try {
      const list = await window.fern.getShaderPacks(installation.id);
      setShaderPacks(list);
    } catch {
      // Ignored
    }
  };

  const handleToggleMod = async (mod: Mod) => {
    if (!window.fern) return;
    await window.fern.toggleMod(installation.id, mod.filePath);
    await loadMods();
  };

  const handleRemoveMod = async (mod: Mod) => {
    if (!window.fern) return;
    await window.fern.removeMod(installation.id, mod.filePath);
    await loadMods();
  };

  const handleEnableAllMods = async () => {
    if (!window.fern) return;
    await window.fern.toggleAllMods(installation.id, true);
    await loadMods();
  };

  const handleDisableAllMods = async () => {
    if (!window.fern) return;
    await window.fern.toggleAllMods(installation.id, false);
    await loadMods();
  };

  const handleToggleResourcePack = async (pack: ResourcePack) => {
    if (!window.fern) return;
    await window.fern.toggleResourcePack(installation.id, pack.filePath);
    await loadResourcePacks();
  };

  const handleRemoveResourcePack = async (pack: ResourcePack) => {
    if (!window.fern) return;
    await window.fern.removeResourcePack(pack.filePath);
    await loadResourcePacks();
  };

  const handleToggleShaderPack = async (pack: ShaderPack) => {
    if (!window.fern) return;
    await window.fern.toggleShaderPack(installation.id, pack.filePath);
    await loadShaderPacks();
  };

  const handleRemoveShaderPack = async (pack: ShaderPack) => {
    if (!window.fern) return;
    await window.fern.removeShaderPack(pack.filePath);
    await loadShaderPacks();
  };

  const filteredMods = mods.filter(
    (m) =>
      m.name.toLowerCase().includes(modFilter.toLowerCase()) ||
      m.fileName.toLowerCase().includes(modFilter.toLowerCase())
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Manage: ${installation.name}`}
        maxWidth="840px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '480px' }}>
          {/* Sub Navigation Bar */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '0.5rem',
            paddingBottom: '0.5rem',
          }}>
            {[
              { id: 'overview' as ManageTab, label: 'Overview', icon: Layers },
              { id: 'mods' as ManageTab, label: `Mods (${mods.length})`, icon: Box },
              { id: 'resourcepacks' as ManageTab, label: `Resource Packs (${resourcePacks.length})`, icon: Image },
              { id: 'shaders' as ManageTab, label: `Shaders (${shaderPacks.length})`, icon: Sun },
              { id: 'performance' as ManageTab, label: 'Performance', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                    color: isActive ? 'var(--color-accent)' : 'var(--text-muted)',
                    border: isActive ? '1px solid var(--border-focus)' : '1px solid transparent',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
              }}>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Minecraft</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {installation.minecraftVersion}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Mod Loader</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent)', marginTop: '4px', textTransform: 'capitalize' }}>
                    {installation.loader} {installation.loaderVersion ? `(${installation.loaderVersion})` : ''}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Memory Allocated</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {installation.maxMemory || 4096} MB
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                paddingTop: '0.5rem',
              }}>
                <button
                  onClick={() => {
                    onClose();
                    onLaunch();
                  }}
                  style={{
                    flex: 1,
                    background: 'var(--color-accent)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Play size={16} fill="currentColor" />
                  Launch Instance
                </button>

                <button
                  onClick={onOpenFolder}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1.25rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Folder size={16} />
                  Open Folder
                </button>

                <button
                  onClick={onExportModpack}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1.25rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Share2 size={16} />
                  Export Modpack
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MODS */}
          {activeTab === 'mods' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.4rem 0.75rem',
                }}>
                  <Search size={15} color="var(--text-dim)" />
                  <input
                    type="text"
                    placeholder="Filter installed mods..."
                    value={modFilter}
                    onChange={(e) => setModFilter(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-main)',
                      width: '100%',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setAddModsOpen(true)}
                    style={{
                      background: 'var(--color-accent)',
                      color: '#000000',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.45rem 0.85rem',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Plus size={15} />
                    Add Mods
                  </button>

                  <button
                    onClick={handleEnableAllMods}
                    title="Enable all mods"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--color-accent)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Power size={14} />
                    All On
                  </button>

                  <button
                    onClick={handleDisableAllMods}
                    title="Disable all mods"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-dim)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <PowerOff size={14} />
                    All Off
                  </button>

                  <button
                    onClick={() => window.fern?.openModsFolder(installation.id)}
                    title="Open mods folder"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.45rem 0.65rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Folder size={15} />
                  </button>
                </div>
              </div>

              {/* Conflict / Missing Dependency Banner */}
              {conflicts && conflicts.hasConflicts && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  color: '#fbbf24',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    <AlertTriangle size={15} />
                    <span>Mod Compatibility Warnings Detected</span>
                  </div>
                  {conflicts.missingDependencies.map((d, i) => (
                    <div key={i} style={{ marginLeft: '1.25rem' }}>
                      • <strong>{d.modName}</strong> requires missing dependency: <u>{d.requiredDependency}</u>
                    </div>
                  ))}
                  {conflicts.incompatibleMods.map((inc, i) => (
                    <div key={i} style={{ marginLeft: '1.25rem' }}>
                      • {inc.reason}
                    </div>
                  ))}
                </div>
              )}

              {/* Mods Table */}
              <div style={{
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                paddingRight: '4px',
              }}>
                {modsLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    Loading mods...
                  </div>
                ) : filteredMods.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No mods installed yet. Click "Add Mods" to search and install from Modrinth!
                  </div>
                ) : (
                  filteredMods.map((mod) => (
                    <div
                      key={mod.filePath}
                      style={{
                        background: mod.enabled ? 'var(--bg-tertiary)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.6rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: mod.enabled ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <button
                          onClick={() => handleToggleMod(mod)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: mod.enabled ? 'var(--color-accent)' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                          }}
                        >
                          {mod.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>

                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {mod.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              v{mod.version}
                            </span>
                            {mod.loaders.length > 0 && (
                              <span style={{
                                fontSize: '0.65rem',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: 'var(--text-muted)',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                textTransform: 'uppercase',
                              }}>
                                {mod.loaders.join('/')}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {mod.fileName}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveMod(mod)}
                        title="Remove mod"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RESOURCE PACKS */}
          {activeTab === 'resourcepacks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => window.fern?.openResourcePacksFolder(installation.id)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Folder size={15} />
                  Open Resource Packs Folder
                </button>
              </div>

              <div style={{
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}>
                {resourcePacks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No resource packs installed. Drop `.zip` packs into the Resource Packs folder!
                  </div>
                ) : (
                  resourcePacks.map((pack) => (
                    <div
                      key={pack.filePath}
                      style={{
                        background: pack.enabled ? 'var(--bg-tertiary)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.6rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleToggleResourcePack(pack)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: pack.enabled ? 'var(--color-accent)' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                          }}
                        >
                          {pack.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {pack.name}
                          </div>
                          {pack.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {pack.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveResourcePack(pack)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SHADER PACKS */}
          {activeTab === 'shaders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => window.fern?.openShaderPacksFolder(installation.id)}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Folder size={15} />
                  Open Shaders Folder
                </button>
              </div>

              <div style={{
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}>
                {shaderPacks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No shader packs installed. Drop `.zip` shader packs into the Shader Packs folder!
                  </div>
                ) : (
                  shaderPacks.map((shader) => (
                    <div
                      key={shader.filePath}
                      style={{
                        background: shader.enabled ? 'var(--bg-tertiary)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.6rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleToggleShaderPack(shader)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: shader.enabled ? 'var(--color-accent)' : 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                          }}
                        >
                          {shader.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {shader.name}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveShaderPack(shader)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PERFORMANCE */}
          {activeTab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: '1px solid var(--border-subtle)',
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                  Instance Performance Configuration
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                  Customize the performance profile and JVM optimization parameters for {installation.name}.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Performance Profile
                    </label>
                    <select
                      value={installation.performanceProfile || 'balanced'}
                      onChange={async (e) => {
                        if (onUpdateInstallation) {
                          await onUpdateInstallation(installation.id, { performanceProfile: e.target.value as any });
                        }
                      }}
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="balanced">Balanced (Recommended)</option>
                      <option value="potato">Potato (Max FPS)</option>
                      <option value="quality">Quality (High Fidelity)</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Allocated Memory
                    </label>
                    <div style={{
                      padding: '0.45rem 0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      {installation.maxMemory || 4096} MB
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart RAM Rationale */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                lineHeight: '1.4',
              }}>
                <div style={{ fontWeight: 600, color: '#22c55e', marginBottom: '0.25rem' }}>
                  Fern JVM Synthesizer Active
                </div>
                Evidence-based G1GC arguments, pre-touch flags, and memory region sizes are dynamically calculated on launch for {installation.loader} on Minecraft {installation.minecraftVersion}.
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Mods Browser Modal */}
      {addModsOpen && (
        <AddModsModal
          isOpen={addModsOpen}
          onClose={() => setAddModsOpen(false)}
          installation={installation}
          onModInstalled={loadMods}
        />
      )}
    </>
  );
};
