import React, { useState, useEffect } from 'react';
import {
  Plus,
  Play,
  Download,
  Copy,
  Folder,
  Trash2,
  Edit3,
  Layers,
  Cpu,
  HardDrive,
  AlertCircle,
  Loader2,
  Check,
  Box,
  UploadCloud,
  FileArchive,
  Share2,
} from 'lucide-react';
import {
  Installation,
  CreateInstallationDTO,
  UpdateInstallationDTO,
  ModLoaderType,
} from '../../../../shared/models/installation';
import { JavaRuntime } from '../../../../shared/models/java';
import { LoaderVersionInfo } from '../../../../shared/models/loader';
import { MOD_LOADERS } from '../../../../shared/constants/loaders';
import { Modal } from '../components/Modal';
import { InstanceManageModal } from '../components/InstanceManageModal';
import { ImportModpackModal } from '../components/ImportModpackModal';

interface InstallationsPageProps {
  installations: Installation[];
  activeInstallation: Installation | null;
  javaRuntimes: JavaRuntime[];
  onSelectInstallation: (id: string) => void;
  onCreateInstallation: (dto: CreateInstallationDTO) => Promise<void>;
  onUpdateInstallation: (id: string, dto: UpdateInstallationDTO) => Promise<void>;
  onDuplicateInstallation: (id: string) => Promise<void>;
  onDeleteInstallation: (id: string, deleteFiles?: boolean) => Promise<void>;
  onOpenFolder: (id: string) => Promise<void>;
  onInstallVersion: (versionId: string) => Promise<void>;
  onLaunch: (dryRun: boolean) => Promise<void>;
}

export const InstallationsPage: React.FC<InstallationsPageProps> = ({
  installations,
  activeInstallation,
  javaRuntimes,
  onSelectInstallation,
  onCreateInstallation,
  onUpdateInstallation,
  onDuplicateInstallation,
  onDeleteInstallation,
  onOpenFolder,
  onInstallVersion,
  onLaunch,
}) => {
  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Targets
  const [selectedInst, setSelectedInst] = useState<Installation | null>(null);
  const [manageTargetInst, setManageTargetInst] = useState<Installation | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mcVersion, setMcVersion] = useState('1.21.4');
  const [loader, setLoader] = useState<ModLoaderType>('vanilla');
  const [loaderVersion, setLoaderVersion] = useState('');
  const [availableLoaderVersions, setAvailableLoaderVersions] = useState<LoaderVersionInfo[]>([]);
  const [loadingLoaderVersions, setLoadingLoaderVersions] = useState(false);

  const [gameDir, setGameDir] = useState('');
  const [selectedJava, setSelectedJava] = useState('');
  const [minRam, setMinRam] = useState(2048);
  const [maxRam, setMaxRam] = useState(4096);
  const [jvmArgs, setJvmArgs] = useState('');
  const [gameArgs, setGameArgs] = useState('');

  // Delete Confirmation Checkbox
  const [deleteDiskFiles, setDeleteDiskFiles] = useState(false);

  // Editor Tab
  const [editorTab, setEditorTab] = useState<'general' | 'java' | 'memory' | 'advanced'>('general');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ramPresets = [1024, 2048, 4096, 6144, 8192];

  // Fetch compatible loader versions whenever loader or MC version changes in Create/Edit
  useEffect(() => {
    if (loader !== 'vanilla' && window.fern) {
      setLoadingLoaderVersions(true);
      window.fern
        .getLoaderVersions(loader, mcVersion)
        .then((vers) => {
          setAvailableLoaderVersions(vers);
          if (vers.length > 0 && !loaderVersion) {
            setLoaderVersion(vers[0].version);
          }
        })
        .catch(() => {
          setAvailableLoaderVersions([]);
        })
        .finally(() => {
          setLoadingLoaderVersions(false);
        });
    } else {
      setAvailableLoaderVersions([]);
      setLoaderVersion('');
    }
  }, [loader, mcVersion]);

  const handleOpenCreate = () => {
    setName('');
    setMcVersion('1.21.4');
    setLoader('vanilla');
    setLoaderVersion('');
    setGameDir('');
    setSelectedJava('');
    setMinRam(2048);
    setMaxRam(4096);
    setJvmArgs('');
    setGameArgs('');
    setError(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (inst: Installation) => {
    setSelectedInst(inst);
    setName(inst.name);
    setMcVersion(inst.minecraftVersion);
    setLoader(inst.loader);
    setLoaderVersion(inst.loaderVersion || '');
    setGameDir(inst.gameDirectory);
    setSelectedJava(inst.javaPath || '');
    setMinRam(inst.minMemory || inst.memoryAllocation?.minMb || 2048);
    setMaxRam(inst.maxMemory || inst.memoryAllocation?.maxMb || 4096);
    setJvmArgs((inst.jvmArguments || []).join(' '));
    setGameArgs((inst.launchArguments || []).join(' '));
    setError(null);
    setEditorTab('general');
    setEditModalOpen(true);
  };

  const handleOpenDelete = (inst: Installation) => {
    setSelectedInst(inst);
    setDeleteDiskFiles(false);
    setDeleteModalOpen(true);
  };

  const handleOpenManage = (inst: Installation) => {
    setManageTargetInst(inst);
    setManageModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Please provide an installation name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateInstallation({
        name: name.trim(),
        minecraftVersion: mcVersion.trim(),
        versionId: mcVersion.trim(),
        loader,
        loaderVersion: loader !== 'vanilla' ? loaderVersion : undefined,
        gameDirectory: gameDir.trim() || undefined,
        javaPath: selectedJava || undefined,
        minMemory: minRam,
        maxMemory: maxRam,
        jvmArguments: jvmArgs.trim() ? jvmArgs.trim().split(/\s+/) : [],
        launchArguments: gameArgs.trim() ? gameArgs.trim().split(/\s+/) : [],
      });
      setCreateModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to create installation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;
    setError(null);

    setIsSubmitting(true);
    try {
      await onUpdateInstallation(selectedInst.id, {
        name: name.trim(),
        minecraftVersion: mcVersion.trim(),
        versionId: mcVersion.trim(),
        loader,
        loaderVersion: loader !== 'vanilla' ? loaderVersion : undefined,
        gameDirectory: gameDir.trim() || undefined,
        javaPath: selectedJava || undefined,
        minMemory: minRam,
        maxMemory: maxRam,
        jvmArguments: jvmArgs.trim() ? jvmArgs.trim().split(/\s+/) : [],
        launchArguments: gameArgs.trim() ? gameArgs.trim().split(/\s+/) : [],
      });
      setEditModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update installation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInst) return;
    try {
      await onDeleteInstallation(selectedInst.id, deleteDiskFiles);
      setDeleteModalOpen(false);
      setSelectedInst(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete installation');
    }
  };

  const handleExportModpack = async (inst: Installation) => {
    if (!window.fern) return;
    try {
      const dest = await window.fern.selectExportPath(inst.name);
      if (dest) {
        await window.fern.exportModpack(inst.id, dest);
        alert(`Successfully exported modpack to:\n${dest}`);
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const getStatusBadge = (inst: Installation) => {
    switch (inst.status) {
      case 'RUNNING':
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            background: 'rgba(34, 197, 94, 0.2)',
            color: 'var(--color-accent)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)' }} />
            RUNNING
          </span>
        );
      case 'INSTALLING':
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            background: 'rgba(234, 179, 8, 0.15)',
            color: '#facc15',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            INSTALLING ({inst.installProgress?.percentage || 0}%)
          </span>
        );
      case 'INSTALLED':
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            background: 'rgba(34, 197, 94, 0.12)',
            color: 'var(--color-accent)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            INSTALLED
          </span>
        );
      case 'ERROR':
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            background: 'var(--color-danger-subtle)',
            color: 'var(--color-danger)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            ERROR
          </span>
        );
      default:
        return (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-dim)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            NOT INSTALLED
          </span>
        );
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>Installations</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Manage isolated Minecraft instances, mod loaders (Fabric, Forge, NeoForge, Quilt), mods, and resource packs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FileArchive size={16} />
            <span>Import Modpack</span>
          </button>

          <button onClick={handleOpenCreate} className="btn-primary" style={{ fontSize: '0.82rem' }}>
            <Plus size={16} />
            <span>New Installation</span>
          </button>
        </div>
      </div>

      {/* Installations List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {installations.map((inst) => {
          const isActive = activeInstallation?.id === inst.id;
          const loaderMeta = MOD_LOADERS[inst.loader] || MOD_LOADERS.vanilla;
          const isInstalled = inst.status === 'INSTALLED' || inst.status === 'RUNNING';

          return (
            <div
              key={inst.id}
              style={{
                background: 'var(--bg-card)',
                border: isActive ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: isActive ? '0 4px 14px rgba(34, 197, 94, 0.08)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--color-accent-subtle)' : 'var(--bg-tertiary)',
                    border: `1px solid ${isActive ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? 'var(--color-accent)' : 'var(--text-muted)',
                  }}>
                    <Layers size={22} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {inst.name}
                      </span>
                      {getStatusBadge(inst)}
                      {isActive && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: 'var(--text-inverse)',
                          background: 'var(--color-accent)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-full)',
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.3rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      <span>Version: <strong style={{ color: 'var(--text-main)' }}>{inst.minecraftVersion}</strong></span>
                      <span>•</span>
                      <span>Loader: <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
                        {loaderMeta.name} {inst.loaderVersion ? `(${inst.loaderVersion})` : ''}
                      </strong></span>
                      <span>•</span>
                      <span>RAM: <strong style={{ color: 'var(--text-main)' }}>{inst.maxMemory || inst.memoryAllocation.maxMb} MB</strong></span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isInstalled ? (
                    <button
                      onClick={async () => {
                        await onSelectInstallation(inst.id);
                        await onLaunch(false);
                      }}
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 1rem' }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Play</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onInstallVersion(inst.versionId || inst.minecraftVersion)}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
                    >
                      <Download size={14} />
                      <span>Install</span>
                    </button>
                  )}

                  {/* Manage Mods / Packs Button */}
                  <button
                    onClick={() => handleOpenManage(inst)}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Manage Mods, Resource Packs, and Shaders"
                  >
                    <Box size={14} />
                    <span>Manage</span>
                  </button>

                  {!isActive && (
                    <button
                      onClick={() => onSelectInstallation(inst.id)}
                      className="btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                      title="Select as active profile"
                    >
                      <Check size={14} />
                      <span>Select</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEdit(inst)}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
                    title="Edit Installation"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    onClick={() => onDuplicateInstallation(inst.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
                    title="Duplicate Installation"
                  >
                    <Copy size={14} />
                  </button>

                  <button
                    onClick={() => onOpenFolder(inst.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
                    title="Open Game Directory in Explorer"
                  >
                    <Folder size={14} />
                  </button>

                  <button
                    onClick={() => handleOpenDelete(inst)}
                    className="btn-danger"
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
                    title="Delete Installation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Installing Progress Bar */}
              {inst.status === 'INSTALLING' && inst.installProgress && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{inst.installProgress.step}</span>
                    <span>
                      {inst.installProgress.percentage}%
                      {inst.installProgress.speed && ` • ${inst.installProgress.speed}`}
                      {inst.installProgress.eta && ` • ETA ${inst.installProgress.eta}`}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${inst.installProgress.percentage}%`,
                      height: '100%',
                      background: 'var(--color-accent)',
                      transition: 'width 0.2s ease',
                    }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Installation Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Installation" maxWidth="580px">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              Installation Name
            </label>
            <input
              type="text"
              placeholder="e.g. Fern Survival"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Minecraft Version
              </label>
              <select value={mcVersion} onChange={(e) => setMcVersion(e.target.value)}>
                <option value="1.21.4">1.21.4 (Latest Release)</option>
                <option value="1.21.3">1.21.3</option>
                <option value="1.21.1">1.21.1</option>
                <option value="1.20.4">1.20.4</option>
                <option value="1.20.1">1.20.1</option>
                <option value="1.19.4">1.19.4</option>
                <option value="1.16.5">1.16.5</option>
                <option value="1.8.9">1.8.9</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Mod Loader
              </label>
              <select
                value={loader}
                onChange={(e) => setLoader(e.target.value as ModLoaderType)}
              >
                <option value="vanilla">Vanilla (Unmodified)</option>
                <option value="fabric">Fabric</option>
                <option value="quilt">Quilt</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
              </select>
            </div>
          </div>

          {/* Loader Version Selection (Section 2) */}
          {loader !== 'vanilla' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Loader Version
              </label>
              {loadingLoaderVersions ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '0.5rem 0' }}>
                  <Loader2 className="spinner" size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Fetching compatible {loader} versions...
                </div>
              ) : availableLoaderVersions.length > 0 ? (
                <select
                  value={loaderVersion}
                  onChange={(e) => setLoaderVersion(e.target.value)}
                >
                  {availableLoaderVersions.map((v) => (
                    <option key={v.id} value={v.version}>
                      {v.version} {v.stable ? '(Recommended / Stable)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter custom loader version"
                  value={loaderVersion}
                  onChange={(e) => setLoaderVersion(e.target.value)}
                />
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Java Runtime
            </label>
            <select value={selectedJava} onChange={(e) => setSelectedJava(e.target.value)}>
              <option value="">Auto-Detect / Recommended</option>
              {javaRuntimes.map((rt) => (
                <option key={rt.path} value={rt.path}>
                  {(rt.versionString || rt.name || rt.version)} ({rt.architecture}) — {rt.path}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Maximum RAM
              </label>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                {maxRam} MB ({Math.round(maxRam / 1024)} GB)
              </span>
            </div>
            <input
              type="range"
              min="1024"
              max="16384"
              step="512"
              value={maxRam}
              onChange={(e) => setMaxRam(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Installation</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Installation Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Installation: ${name}`} maxWidth="620px">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          {/* Tab Selection */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '0.5rem',
            paddingBottom: '0.5rem',
          }}>
            {(['general', 'java', 'memory', 'advanced'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setEditorTab(tab)}
                style={{
                  background: editorTab === tab ? 'var(--color-accent-subtle)' : 'transparent',
                  color: editorTab === tab ? 'var(--color-accent)' : 'var(--text-muted)',
                  border: editorTab === tab ? '1px solid var(--border-focus)' : '1px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {editorTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Installation Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Minecraft Version
                  </label>
                  <input
                    type="text"
                    value={mcVersion}
                    onChange={(e) => setMcVersion(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Mod Loader
                  </label>
                  <select
                    value={loader}
                    onChange={(e) => setLoader(e.target.value as ModLoaderType)}
                  >
                    <option value="vanilla">Vanilla</option>
                    <option value="fabric">Fabric</option>
                    <option value="quilt">Quilt</option>
                    <option value="forge">Forge</option>
                    <option value="neoforge">NeoForge</option>
                  </select>
                </div>
              </div>

              {loader !== 'vanilla' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Loader Version
                  </label>
                  {availableLoaderVersions.length > 0 ? (
                    <select
                      value={loaderVersion}
                      onChange={(e) => setLoaderVersion(e.target.value)}
                    >
                      {availableLoaderVersions.map((v) => (
                        <option key={v.id} value={v.version}>
                          {v.version} {v.stable ? '(Recommended)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. 0.16.10"
                      value={loaderVersion}
                      onChange={(e) => setLoaderVersion(e.target.value)}
                    />
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Custom Game Directory (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Default: <Fern Client>/instances/<id>"
                  value={gameDir}
                  onChange={(e) => setGameDir(e.target.value)}
                />
              </div>
            </div>
          )}

          {editorTab === 'java' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Java Executable Override
                </label>
                <select value={selectedJava} onChange={(e) => setSelectedJava(e.target.value)}>
                  <option value="">Default (Auto-Detect / System)</option>
                  {javaRuntimes.map((rt) => (
                    <option key={rt.path} value={rt.path}>
                      {(rt.versionString || rt.name || rt.version)} ({rt.architecture}) — {rt.path}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {editorTab === 'memory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Maximum RAM (-Xmx)
                  </label>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                    {maxRam} MB
                  </span>
                </div>
                <input
                  type="range"
                  min="1024"
                  max="16384"
                  step="512"
                  value={maxRam}
                  onChange={(e) => setMaxRam(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Minimum RAM (-Xms)
                  </label>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                    {minRam} MB
                  </span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="8192"
                  step="512"
                  value={minRam}
                  onChange={(e) => setMinRam(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {editorTab === 'advanced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Custom JVM Arguments
                </label>
                <input
                  type="text"
                  placeholder="-XX:+UseG1GC -Dexample=true"
                  value={jvmArgs}
                  onChange={(e) => setJvmArgs(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Custom Minecraft Game Arguments
                </label>
                <input
                  type="text"
                  placeholder="--fullscreen"
                  value={gameArgs}
                  onChange={(e) => setGameArgs(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Installation Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Installation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', margin: 0 }}>
            Are you sure you want to delete <strong>"{selectedInst?.name}"</strong>?
          </p>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={deleteDiskFiles}
              onChange={(e) => setDeleteDiskFiles(e.target.checked)}
            />
            <span>Also remove associated instance files from disk</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button onClick={() => setDeleteModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleDeleteConfirm} className="btn-danger">
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Instance Management Modal (Mods, Packs, Shaders) */}
      {manageTargetInst && (
        <InstanceManageModal
          isOpen={manageModalOpen}
          onClose={() => setManageModalOpen(false)}
          installation={manageTargetInst}
          onLaunch={async () => {
            await onSelectInstallation(manageTargetInst.id);
            await onLaunch(false);
          }}
          onOpenFolder={() => onOpenFolder(manageTargetInst.id)}
          onExportModpack={() => handleExportModpack(manageTargetInst)}
          onUpdateInstallation={onUpdateInstallation}
        />
      )}

      {/* Import Modpack Modal */}
      <ImportModpackModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={async (inst) => {
          await onSelectInstallation(inst.id);
        }}
      />
    </div>
  );
};
