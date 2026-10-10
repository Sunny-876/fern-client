import React, { useState, useEffect } from 'react';
import { Search, Download, Check, AlertCircle, Loader2, Sparkles, Box } from 'lucide-react';
import { Installation } from '../../../../shared/models/installation';
import {
  ModSearchResultItem,
  ModVersionDetails,
  ModDependency,
} from '../../../../shared/models/mod';
import { Modal } from './Modal';

interface AddModsModalProps {
  isOpen: boolean;
  onClose: () => void;
  installation: Installation;
  onModInstalled: () => void;
}

export const AddModsModal: React.FC<AddModsModalProps> = ({
  isOpen,
  onClose,
  installation,
  onModInstalled,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ModSearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Dependency Prompt Modal State
  const [depPrompt, setDepPrompt] = useState<{
    targetMod: ModSearchResultItem;
    targetVersion: ModVersionDetails;
    deps: ModDependency[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleSearch('');
    }
  }, [isOpen, installation.id]);

  const handleSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.fern) {
        setResults([]);
        return;
      }
      const res = await window.fern.searchMods({
        query: searchQuery || undefined,
        minecraftVersion: installation.minecraftVersion,
        loader: installation.loader !== 'vanilla' ? installation.loader : undefined,
        limit: 20,
      });
      setResults(res.items);
    } catch (err: any) {
      setError(err.message || 'Failed to search mods');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateInstall = async (mod: ModSearchResultItem) => {
    if (!window.fern) return;
    setInstallingId(mod.id);
    setError(null);

    try {
      // 1. Fetch compatible versions
      const versions = await window.fern.getModVersions(
        mod.id,
        installation.minecraftVersion,
        installation.loader !== 'vanilla' ? installation.loader : undefined
      );

      if (!versions || versions.length === 0) {
        setError(`No compatible version found for ${mod.name} on MC ${installation.minecraftVersion} (${installation.loader}).`);
        setInstallingId(null);
        return;
      }

      const targetVersion = versions[0];
      const primaryFile = targetVersion.files.find((f) => f.primary) || targetVersion.files[0];

      if (!primaryFile) {
        setError(`No downloadable file found for ${mod.name}.`);
        setInstallingId(null);
        return;
      }

      // 2. Check dependencies
      const deps = await window.fern.getModDependencies(targetVersion.id);
      const requiredDeps = deps.filter((d) => d.type === 'required');

      if (requiredDeps.length > 0) {
        // Prompt user to confirm dependency installation
        setDepPrompt({
          targetMod: mod,
          targetVersion,
          deps: requiredDeps,
        });
        setInstallingId(null);
        return;
      }

      // 3. Download & install directly
      await window.fern.installMod(
        installation.id,
        primaryFile.url,
        primaryFile.filename,
        primaryFile.sha1
      );

      setInstalledIds((prev) => new Set([...prev, mod.id]));
      onModInstalled();
    } catch (err: any) {
      setError(err.message || `Failed to install ${mod.name}`);
    } finally {
      setInstallingId(null);
    }
  };

  const handleConfirmDependencies = async () => {
    if (!depPrompt || !window.fern) return;
    const { targetMod, targetVersion, deps } = depPrompt;
    setDepPrompt(null);
    setInstallingId(targetMod.id);

    try {
      // 1. Install declared dependencies first
      for (const dep of deps) {
        try {
          const depVersions = await window.fern.getModVersions(
            dep.id,
            installation.minecraftVersion,
            installation.loader !== 'vanilla' ? installation.loader : undefined
          );
          if (depVersions && depVersions.length > 0) {
            const depFile = depVersions[0].files.find((f) => f.primary) || depVersions[0].files[0];
            if (depFile) {
              await window.fern.installMod(
                installation.id,
                depFile.url,
                depFile.filename,
                depFile.sha1
              );
            }
          }
        } catch {
          // Continue best effort
        }
      }

      // 2. Install main mod
      const primaryFile = targetVersion.files.find((f) => f.primary) || targetVersion.files[0];
      await window.fern.installMod(
        installation.id,
        primaryFile.url,
        primaryFile.filename,
        primaryFile.sha1
      );

      setInstalledIds((prev) => new Set([...prev, targetMod.id]));
      onModInstalled();
    } catch (err: any) {
      setError(err.message || 'Failed to install mod with dependencies.');
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Browse Mods (${installation.name})`} maxWidth="740px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search Header */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.85rem',
            }}>
              <Search size={16} color="var(--text-dim)" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="Search mods from Modrinth (e.g. Sodium, Lithium, Iris)..."
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
            <button
              onClick={() => handleSearch(query)}
              disabled={isLoading}
              style={{
                background: 'var(--color-accent)',
                color: '#000000',
                padding: '0.5rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </div>

          {/* Compatibility Banner */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>Filtering for:</span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: 'var(--color-accent)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 600,
            }}>
              Minecraft {installation.minecraftVersion}
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-main)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}>
              {installation.loader}
            </span>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#f87171',
              fontSize: '0.85rem',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Results List */}
          <div style={{
            maxHeight: '380px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            paddingRight: '4px',
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                <Loader2 className="spinner" size={24} style={{ marginRight: '0.5rem' }} />
                <span>Searching mod catalog...</span>
              </div>
            ) : results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No compatible mods found for query "{query}".
              </div>
            ) : (
              results.map((mod) => {
                const isInstalled = installedIds.has(mod.id);
                const isInstalling = installingId === mod.id;

                return (
                  <div
                    key={mod.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', overflow: 'hidden' }}>
                      {mod.iconUrl ? (
                        <img
                          src={mod.iconUrl}
                          alt={mod.name}
                          style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Box size={20} color="var(--text-dim)" />
                        </div>
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {mod.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>by {mod.author}</span>
                        </div>
                        <p style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          margin: '2px 0 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '420px',
                        }}>
                          {mod.summary}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInitiateInstall(mod)}
                      disabled={isInstalled || isInstalling}
                      style={{
                        background: isInstalled
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'var(--color-accent)',
                        color: isInstalled ? 'var(--color-accent)' : '#000000',
                        border: isInstalled ? '1px solid var(--color-accent)' : 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: isInstalled ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexShrink: 0,
                      }}
                    >
                      {isInstalling ? (
                        <>
                          <Loader2 className="spinner" size={14} />
                          <span>Installing...</span>
                        </>
                      ) : isInstalled ? (
                        <>
                          <Check size={14} />
                          <span>Installed</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>Install</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Dependency Confirmation Modal */}
      {depPrompt && (
        <Modal
          isOpen={true}
          onClose={() => setDepPrompt(null)}
          title="Required Dependencies Detected"
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              <strong>{depPrompt.targetMod.name}</strong> requires the following dependencies to function:
            </p>
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}>
              {depPrompt.deps.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-accent)' }}>
                  <Sparkles size={14} />
                  <span>{d.name || d.id}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
              Would you like Fern Client to automatically download and install these dependencies?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setDepPrompt(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDependencies}
                style={{
                  background: 'var(--color-accent)',
                  color: '#000000',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Install All
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
