import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar, TabId } from './components/Sidebar';
import { PlayBar } from './components/PlayBar';
import { ErrorModal, LaunchErrorInfo } from './components/ErrorModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { OmnibarModal } from './components/OmnibarModal';
import { HomePage } from './pages/HomePage';
import { InstallationsPage } from './pages/InstallationsPage';
import { VersionsPage } from './pages/VersionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { JavaPage } from './pages/JavaPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogsPage } from './pages/LogsPage';
import { PerformancePage } from './pages/PerformancePage';
import { SocialPage } from './pages/SocialPage';
import { CosmeticsPage } from './pages/CosmeticsPage';

import { Account, CreateLocalAccountDTO } from '../../../shared/models/account';
import {
  Installation,
  CreateInstallationDTO,
  UpdateInstallationDTO,
} from '../../../shared/models/installation';
import { FernSettings } from '../../../shared/models/settings';
import { JavaRuntime } from '../../../shared/models/java';
import { LaunchStatusUpdate } from '../../../shared/models/launch';
import { LogEntry } from '../core/logger';
import { DEFAULT_SETTINGS, DEFAULT_INSTALLATIONS } from '../../../shared/config/defaults';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [version, setVersion] = useState('1.0.0-phase11');
  const [basePath, setBasePath] = useState('AppData/Roaming/Fern Client');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  const [installations, setInstallations] = useState<Installation[]>([]);
  const [activeInstallation, setActiveInstallation] = useState<Installation | null>(null);

  const [settings, setSettings] = useState<FernSettings>(DEFAULT_SETTINGS);
  const [javaRuntimes, setJavaRuntimes] = useState<JavaRuntime[]>([]);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilePath, setLogFilePath] = useState<string | null>(null);

  const [launchStatus, setLaunchStatus] = useState<LaunchStatusUpdate | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<LaunchErrorInfo | null>(null);
  const [showOmnibar, setShowOmnibar] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowOmnibar((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize data from IPC Bridge (or browser fallback)
  useEffect(() => {
    const init = async () => {
      if (window.fern) {
        try {
          const v = await window.fern.getVersion();
          setVersion(v);

          const bp = await window.fern.getBasePath();
          setBasePath(bp);

          const s = await window.fern.getSettings();
          setSettings(s);
          if (s.general && s.general.firstRunCompleted === false) {
            setShowOnboarding(true);
          }

          const accs = await window.fern.getAccounts();
          setAccounts(accs);

          const activeAcc = await window.fern.getActiveAccount();
          setActiveAccount(activeAcc);

          const insts = await window.fern.getInstallations();
          setInstallations(insts);

          const activeInst = await window.fern.getActiveInstallation();
          setActiveInstallation(activeInst);

          const javas = await window.fern.getJavaRuntimes();
          setJavaRuntimes(javas);

          const initialLogs = await window.fern.getRecentLogs(500);
          setLogs(initialLogs);

          const lfPath = await window.fern.getLogFilePath();
          setLogFilePath(lfPath);
        } catch (err) {
          console.error('Initialization error:', err);
        }

        // Subscriptions
        const unsubLogs = window.fern.onLogEntry((entry) => {
          setLogs((prev) => [...prev.slice(-999), entry]);
        });

        const unsubLaunch = window.fern.onLaunchStatus((status) => {
          setLaunchStatus(status);
          if (status.stage === 'running') {
            setIsLaunching(false);
            refreshInstallations();
          } else if (status.stage === 'error' || status.stage === 'exited') {
            setIsLaunching(false);
            refreshInstallations();

            // Crash Recovery check (Section 27, 28)
            if (status.crashAnalysis) {
              setLaunchError({
                title: 'Minecraft Exited Unexpectedly',
                message: status.crashAnalysis.summary || 'A crash or unexpected exit occurred.',
                possibleCause:
                  status.crashAnalysis.suggestedAction ||
                  status.crashAnalysis.suspectedCause ||
                  'Review crash report and mods.',
                details: status.crashAnalysis,
              });
            }
          }
        });

        const unsubInstall = window.fern.onInstallProgress(() => {
          refreshInstallations();
        });

        return () => {
          unsubLogs();
          unsubLaunch();
          unsubInstall();
        };
      } else {
        // Browser Preview Fallback
        setInstallations(DEFAULT_INSTALLATIONS);
        setActiveInstallation(DEFAULT_INSTALLATIONS[0]);
        setAccounts([
          {
            id: 'demo-local',
            displayName: 'FernPlayer',
            type: 'local',
            uuid: '85e40702-8a90-3ce4-bf3e-86e5792c3a3b',
            createdAt: Date.now(),
            lastUsed: Date.now(),
          },
        ]);
        setActiveAccount({
          id: 'demo-local',
          displayName: 'FernPlayer',
          type: 'local',
          uuid: '85e40702-8a90-3ce4-bf3e-86e5792c3a3b',
          createdAt: Date.now(),
          lastUsed: Date.now(),
        });
      }
    };

    init();
  }, []);

  const refreshInstallations = async () => {
    if (window.fern) {
      const insts = await window.fern.getInstallations();
      setInstallations(insts);
      const active = await window.fern.getActiveInstallation();
      setActiveInstallation(active);
    }
  };

  // Handlers
  const handleSelectAccount = async (id: string) => {
    if (window.fern) {
      const acc = await window.fern.selectAccount(id);
      setActiveAccount(acc);
      const accs = await window.fern.getAccounts();
      setAccounts(accs);
    }
  };

  const handleCreateLocalAccount = async (dto: CreateLocalAccountDTO) => {
    if (window.fern) {
      const acc = await window.fern.createLocalAccount(dto);
      setActiveAccount(acc);
      const accs = await window.fern.getAccounts();
      setAccounts(accs);
    }
  };

  const handleRemoveAccount = async (id: string) => {
    if (window.fern) {
      await window.fern.removeAccount(id);
      const accs = await window.fern.getAccounts();
      setAccounts(accs);
      const active = await window.fern.getActiveAccount();
      setActiveAccount(active);
    }
  };

  const handleSelectInstallation = async (id: string) => {
    if (window.fern) {
      const inst = await window.fern.selectInstallation(id);
      setActiveInstallation(inst);
      await refreshInstallations();
    }
  };

  const handleCreateInstallation = async (dto: CreateInstallationDTO) => {
    if (window.fern) {
      const inst = await window.fern.createInstallation(dto);
      await refreshInstallations();
      setActiveInstallation(inst);
    }
  };

  const handleUpdateInstallation = async (id: string, dto: UpdateInstallationDTO) => {
    if (window.fern) {
      await window.fern.updateInstallation(id, dto);
      await refreshInstallations();
    }
  };

  const handleDuplicateInstallation = async (id: string) => {
    if (window.fern) {
      const inst = await window.fern.duplicateInstallation(id);
      await refreshInstallations();
      setActiveInstallation(inst);
    }
  };

  const handleDeleteInstallation = async (id: string, deleteFiles = false) => {
    if (window.fern) {
      await window.fern.deleteInstallation(id, deleteFiles);
      await refreshInstallations();
    }
  };

  const handleOpenFolder = async (id: string) => {
    if (window.fern) {
      await window.fern.openInstallationFolder(id);
    }
  };

  const handleOpenLogsFolder = async () => {
    if (window.fern) {
      await window.fern.openLogsFolder();
    }
  };

  const handleInstallVersion = async (versionId: string) => {
    if (window.fern) {
      await window.fern.installVersion(versionId);
      await refreshInstallations();
    }
  };

  const handleUpdateSettings = async (partial: Partial<FernSettings>) => {
    if (window.fern) {
      const updated = await window.fern.updateSettings(partial);
      setSettings(updated);
    }
  };

  const handleDetectJava = async () => {
    if (window.fern) {
      const res = await window.fern.detectJava();
      setJavaRuntimes(res.runtimes);
    }
  };

  const handleLaunch = async (dryRun: boolean, safeMode: boolean = false) => {
    if (!activeInstallation || !activeAccount) return;

    setIsLaunching(true);
    setLaunchStatus({
      stage: 'validating_account',
      message: safeMode ? 'Preparing Safe Mode launch...' : 'Preparing game launch...',
      percentage: 5,
    });

    try {
      if (window.fern) {
        await window.fern.launchMinecraft({
          installationId: activeInstallation.id,
          accountId: activeAccount.id,
          dryRun,
          safeMode,
        });
      } else {
        setTimeout(() => {
          setIsLaunching(false);
          setLaunchStatus({
            stage: 'running',
            message: 'Simulated Launch Complete',
            percentage: 100,
          });
        }, 1500);
      }
    } catch (err: any) {
      setIsLaunching(false);
      const isJavaIncompat = err.code === 'JAVA_INCOMPATIBLE' || err.message?.includes('incompatible');

      setLaunchError({
        title: safeMode ? 'Safe Mode Launch Failed' : 'Minecraft Failed to Launch',
        message: err.message || 'An error occurred while launching Minecraft.',
        possibleCause: isJavaIncompat
          ? err.actionableHint || `The selected Java runtime is incompatible with Minecraft ${activeInstallation.minecraftVersion}.`
          : err.actionableHint || 'Check launcher logs for more details.',
        selectedJava: err.details?.selectedJavaVersion,
        requiredJava: err.details?.requiredJavaVersion,
        details: err.details,
      });

      setLaunchStatus({
        stage: 'error',
        message: err?.message || 'Launch failed',
        percentage: 0,
        error: err?.message,
      });
    }
  };

  return (
    <div className="app-container">
      <TopBar version={version} onOpenSearch={() => setShowOmnibar(true)} />

      <div className="app-body">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeAccount={activeAccount}
        />

        <main className="main-content">
          {activeTab === 'home' && (
            <HomePage
              installations={installations}
              activeInstallation={activeInstallation}
              onSelectInstallation={handleSelectInstallation}
              activeAccount={activeAccount}
              javaRuntimes={javaRuntimes}
              basePath={basePath}
              launchStatus={launchStatus}
              isLaunching={isLaunching}
              onNavigate={(tab) => setActiveTab(tab)}
              onLaunch={handleLaunch}
              onInstallVersion={handleInstallVersion}
            />
          )}

          {(activeTab === 'installations' || activeTab === 'mods') && (
            <InstallationsPage
              installations={installations}
              activeInstallation={activeInstallation}
              javaRuntimes={javaRuntimes}
              onSelectInstallation={handleSelectInstallation}
              onCreateInstallation={handleCreateInstallation}
              onUpdateInstallation={handleUpdateInstallation}
              onDuplicateInstallation={handleDuplicateInstallation}
              onDeleteInstallation={handleDeleteInstallation}
              onOpenFolder={handleOpenFolder}
              onInstallVersion={handleInstallVersion}
              onLaunch={handleLaunch}
            />
          )}

          {activeTab === 'versions' && (
            <VersionsPage
              installations={installations}
              activeInstallation={activeInstallation}
              onSelectInstallation={handleSelectInstallation}
              onInstallVersion={handleInstallVersion}
              onCreateInstallationFromVersion={() => {
                setActiveTab('installations');
              }}
              onLaunch={handleLaunch}
            />
          )}

          {activeTab === 'cosmetics' && (
            <CosmeticsPage />
          )}

          {activeTab === 'social' && (
            <SocialPage />
          )}

          {activeTab === 'accounts' && (
            <AccountsPage
              accounts={accounts}
              activeAccount={activeAccount}
              onSelectAccount={handleSelectAccount}
              onCreateLocalAccount={handleCreateLocalAccount}
              onRemoveAccount={handleRemoveAccount}
            />
          )}

          {activeTab === 'java' && (
            <JavaPage
              javaRuntimes={javaRuntimes}
              onRescan={handleDetectJava}
            />
          )}

          {activeTab === 'downloads' && (
            <DownloadsPage
              onNavigateHome={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'performance' && (
            <PerformancePage
              installations={installations}
              activeInstallation={activeInstallation}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              javaRuntimes={javaRuntimes}
              onUpdateSettings={handleUpdateSettings}
              onDetectJava={handleDetectJava}
            />
          )}

          {activeTab === 'about' && (
            <AboutPage
              currentVersion={version}
            />
          )}

          {activeTab === 'logs' && (
            <LogsPage
              logs={logs}
              logFilePath={logFilePath}
              onClearView={() => setLogs([])}
              onOpenLogFolder={handleOpenLogsFolder}
            />
          )}
        </main>
      </div>

      <PlayBar
        installations={installations}
        activeInstallation={activeInstallation}
        activeAccount={activeAccount}
        onSelectInstallation={handleSelectInstallation}
        onLaunch={handleLaunch}
        onInstallVersion={handleInstallVersion}
        launchStatus={launchStatus}
        isLaunching={isLaunching}
      />

      <ErrorModal
        error={launchError}
        onClose={() => setLaunchError(null)}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenLogs={() => setActiveTab('logs')}
        onLaunchSafeMode={() => handleLaunch(false, true)}
      />

      {showOnboarding && (
        <OnboardingWizard
          javaRuntimes={javaRuntimes}
          installations={installations}
          onComplete={async () => {
            if (window.fern) {
              await window.fern.updateSettings({
                general: {
                  ...settings.general,
                  firstRunCompleted: true,
                },
              });
            }
            setShowOnboarding(false);
          }}
          onCreateLocalAccount={async (name) => {
            const acc = await handleCreateLocalAccount({ displayName: name });
            return acc as any;
          }}
        />
      )}

      <OmnibarModal
        isOpen={showOmnibar}
        onClose={() => setShowOmnibar(false)}
        onNavigate={(target) => {
          if (target.startsWith('settings')) setActiveTab('settings');
          else if (target.startsWith('modules') || target.startsWith('hud')) setActiveTab('settings');
          else if (target.startsWith('installations')) setActiveTab('installations');
          else if (target.startsWith('docs')) setActiveTab('about');
        }}
      />
    </div>
  );
};
