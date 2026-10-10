export interface DocArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  keywords: string[];
}

export interface DocCategory {
  id: string;
  name: string;
  description: string;
  articles: DocArticle[];
}

export const DOCUMENTATION_CATEGORIES: DocCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential installation, initial launch, and configuration guide for Fern Client.',
    articles: [
      {
        id: 'installing-fern',
        category: 'Getting Started',
        title: 'Installing Fern Client on Windows',
        summary: 'Step-by-step installation instructions for the standard NSIS installer and portable package.',
        keywords: ['install', 'setup', 'nsis', 'portable', 'windows', 'download'],
        content: `### Installing Fern Client

Fern Client provides two official installation formats for Windows 10/11 x64 systems:

1. **Standard Windows Installer (\`FernClientSetup.exe\`)**:
   - Downloads directly from the Download Portal.
   - Installs binaries to \`%LocalAppData%\\Programs\\Fern Client\`.
   - Runs with standard user privileges—**no administrator elevation required**.
   - Creates Windows Start Menu and Desktop shortcuts.
   - Registers with Windows Add/Remove Programs for clean upgrades and uninstallation.

2. **Portable ZIP Bundle (\`FernClient-1.0.0-Portable.zip\`)**:
   - Extract the ZIP archive to any directory (e.g. \`D:\\Games\\FernClient\`).
   - Run \`FernClient-Portable.bat\` to start.
   - Stores all user configuration, installations, and game data in a local \`./data\` subfolder.
   - Leaves zero registry footprints. Ideal for USB drives and isolated testing.

> **Data Isolation Guarantee**: Upgrading your Fern Client installer replaces binaries without modifying or deleting your user data, world saves, or custom mods in \`%AppData%\\Fern Client\`.`,
      },
      {
        id: 'first-launch',
        category: 'Getting Started',
        title: 'First Launch & Onboarding Experience',
        summary: 'Walkthrough of the initial launch wizard and first-time configuration.',
        keywords: ['first launch', 'wizard', 'onboarding', 'welcome'],
        content: `### First-Run Onboarding

When launching Fern Client for the first time, an interactive onboarding wizard will guide you through system setup:

- **Step 1: Welcome & Overview**: Summary of client capabilities and zero-telemetry architecture.
- **Step 2: Java Runtime Verification**: Scans your system and selects the optimal Java environment (highlighting Java 21 for modern releases).
- **Step 3: Installation & Memory Allocation**: Sets your initial RAM allocation based on detected system hardware (recommended: 4 GB for standard Minecraft; 6 GB for modpacks).
- **Step 4: Player Profile**: Create an immediate offline local profile or link your Microsoft / Fern accounts later in the Accounts tab.

Once completed, Fern Client transitions straight to the Home dashboard with your default installation ready to launch.`,
      },
      {
        id: 'java-setup',
        category: 'Getting Started',
        title: 'Java Runtime Detection & Setup',
        summary: 'How Fern Client detects, verifies, and configures Java versions.',
        keywords: ['java', 'jdk', 'jre', 'java 21', 'java 17', 'java 8'],
        content: `### Java Runtime Configuration

Minecraft Java Edition requires different Java versions depending on the game release:

- **Minecraft 1.20.5 & 1.21.x**: Requires **Java 21 (LTS)**.
- **Minecraft 1.18 to 1.20.4**: Requires **Java 17 (LTS)**.
- **Minecraft 1.16.5 and below**: Requires **Java 8**.

#### Automated Scanning
Fern Client automatically checks the following on startup:
- Windows Registry keys (\`HKLM\\SOFTWARE\\JavaSoft\`)
- Environment variables (\`JAVA_HOME\`, \`PATH\`)
- Standard runtime paths (\`Eclipse Adoptium/Temurin\`, \`Oracle\`, \`Azul Zulu\`, \`BellSoft Liberica\`, \`Microsoft JDK\`)

#### Manual Runtime Addition
If you maintain a custom Java build:
1. Open the **Java** tab in the launcher sidebar.
2. Click **Add Runtime Manually**.
3. Select your \`javaw.exe\` binary. Fern Client will test the binary, detect its major version, and validate its bytecode compatibility.`,
      },
      {
        id: 'creating-installation',
        category: 'Getting Started',
        title: 'Creating and Managing Installations',
        summary: 'How to configure separate Minecraft instances, loaders, and versions.',
        keywords: ['installations', 'instances', 'create', 'versions', 'profiles'],
        content: `### Creating Minecraft Installations

Fern Client supports multi-instance isolation, allowing each installation to have independent mods, configs, saves, and shaderpacks:

1. Navigate to the **Installations** tab.
2. Click **New Installation**.
3. Choose your configuration:
   - **Name**: Descriptive identifier (e.g., *Fabric 1.21.4 Survival*).
   - **Minecraft Version**: Selected from official Mojang release manifests.
   - **Mod Loader**: Vanilla, Fabric, NeoForge, or Forge.
   - **Game Directory**: Leave default for shared directory or specify a custom instance path.
   - **Memory Allocation**: Min/Max RAM limits in megabytes.
4. Click **Create Installation**.`,
      },
      {
        id: 'launching-minecraft',
        category: 'Getting Started',
        title: 'Launching Minecraft',
        summary: 'Launch sequence, status telemetry, and dry-run pipeline validation.',
        keywords: ['launch', 'play', 'pipeline', 'dry-run'],
        content: `### Launching Minecraft

To launch Minecraft:
1. Select your desired installation and active account on the bottom **PlayBar**.
2. Click the green **Play** button.

#### Launch Pipeline Stages:
The launcher executes a strict verification pipeline:
1. \`validating_account\`: Verifies player credentials.
2. \`validating_java\`: Verifies Java runtime compatibility for the targeted version.
3. \`preparing_directories\`: Ensures instance folders exist (\`mods\`, \`config\`, \`saves\`, \`natives\`).
4. \`preparing_libraries\`: Verifies library checksums and constructs the classpath.
5. \`building_arguments\`: Synthesizes optimized JVM arguments (G1GC tuning, memory boundaries).
6. \`spawning_process\`: Spawns the Minecraft process and tracks its PID and session lifecycle.`,
      },
    ],
  },
  {
    id: 'installations',
    name: 'Installations & Performance',
    description: 'Game directory isolation, memory tuning, and performance engine documentation.',
    articles: [
      {
        id: 'ram-allocation',
        category: 'Installations & Performance',
        title: 'RAM Allocation & Memory Advisor',
        summary: 'Guidelines for configuring memory allocation and garbage collection.',
        keywords: ['ram', 'memory', 'xmx', 'xms', 'g1gc', 'performance'],
        content: `### Memory Tuning & RAM Advisor

Allocating too little RAM causes Java heap exhaustion (\`OutOfMemoryError\`), while allocating too much RAM can cause garbage collection pause spikes.

#### Recommended Memory Guidelines:
- **Vanilla Minecraft 1.21.4**: 2 GB minimum / 4 GB recommended.
- **Lightweight Fabric (Optimization Mods)**: 3 GB to 4 GB recommended.
- **Heavy Modpacks (150+ Mods)**: 6 GB to 8 GB recommended.

#### Built-in RAM Advisor:
Fern Client inspects your total physical RAM and provides tailored recommendations in the **Performance** tab:
- Detects overall system memory capacity.
- Ensures the launcher never recommends allocating more than 75% of total system RAM to preserve operating system stability.
- Synthesizes modern G1GC arguments: \`-XX:+UseG1GC\`, \`-XX:+ParallelRefProcEnabled\`, and adaptive pause goals.`,
      },
      {
        id: 'game-directories',
        category: 'Installations & Performance',
        title: 'Game Directories & Instance Isolation',
        summary: 'How Fern Client isolates saves, mods, and configurations per instance.',
        keywords: ['game directory', 'instances', 'saves', 'isolation'],
        content: `### Instance Directory Isolation

By default, each installation can be assigned its own isolated directory inside \`%AppData%\\Fern Client\\instances\\<instance-id>\`:

- **\`mods/\`**: Independent mod folder preventing cross-version mod conflicts.
- **\`config/\`**: Instance-specific mod configuration files.
- **\`saves/\`**: Isolated singleplayer world saves.
- **\`resourcepacks/\`** & **\`shaderpacks/\`**: Visual packs loaded for that installation.

You can open an installation's directory at any time by clicking the folder icon on the **Installations** page.`,
      },
    ],
  },
  {
    id: 'modding',
    name: 'Modding & Loaders',
    description: 'Fabric, Forge, NeoForge, mod management, and Modrinth modpack integration.',
    articles: [
      {
        id: 'mod-loaders',
        category: 'Modding & Loaders',
        title: 'Supported Mod Loaders',
        summary: 'Overview of Fabric, Forge, and NeoForge mod loader support.',
        keywords: ['fabric', 'forge', 'neoforge', 'loaders'],
        content: `### Mod Loader Support

Fern Client includes first-class mod loader integration:

- **Fabric**: Full support for Fabric Loader across all modern Minecraft releases. Automatically resolves Fabric intermediary mappings and launch arguments.
- **NeoForge**: Native support for modern NeoForge on Minecraft 1.20.2+.
- **Forge**: Legacy and modern Forge support, parsing Forge library specifications and argument tokens.

When creating an installation, selecting a loader automatically fetches verified loader builds and prepares the necessary runtime libraries.`,
      },
      {
        id: 'modpacks',
        category: 'Modding & Loaders',
        title: 'Modpack Import & Export (.mrpack)',
        summary: 'How to import and export Modrinth modpacks with progress tracking.',
        keywords: ['modpacks', 'mrpack', 'modrinth', 'import', 'export'],
        content: `### Modpack Integration

Fern Client supports the open Modrinth (\`.mrpack\`) standard for sharing curated mod configurations:

#### Importing a Modpack:
1. Open the **Installations** tab.
2. Click **Import Modpack**.
3. Select any valid \`.mrpack\` archive file.
4. Fern Client will parse the manifest, create an isolated installation, download the required mods from official endpoints, and apply bundled overrides.

#### Exporting a Modpack:
You can export any customized installation to an \`.mrpack\` file for easy sharing with friends. Fern Client automatically strips local player data, credentials, and world saves during export.`,
      },
    ],
  },
  {
    id: 'customization',
    name: 'Customization & HUD',
    description: 'In-game HUD editor, visual modules, themes, and keybind management.',
    articles: [
      {
        id: 'hud-editor',
        category: 'Customization & HUD',
        title: 'Zero-GC HUD Editor & Modules',
        summary: 'How to arrange screen elements, snap to grid, and customize widgets.',
        keywords: ['hud', 'editor', 'fps', 'cps', 'coordinates', 'widgets'],
        content: `### Advanced HUD Customization

Fern Client features a modular, zero-garbage-collection in-game HUD engine:

- **Available Widgets**: FPS Counter, CPS (Clicks Per Second), Keystrokes, Coordinates & Direction, Armor & Item Status, Ping/Latency, Server IP, Speedometer.
- **Real-Time Editor**: Drag and drop widgets on an interactive canvas with snap-to-grid alignment.
- **Typography & Styling**: Customize text scale, color accents, background opacity, borders, and rounded corners.
- **Presets**: Save and switch between competitive PvP layouts, survival exploration setups, and minimal cinematic presets.`,
      },
      {
        id: 'themes-profiles',
        category: 'Customization & HUD',
        title: 'Themes and Client Profiles',
        summary: 'Selecting visual themes and managing multiple client profile presets.',
        keywords: ['themes', 'dark mode', 'profiles', 'accent color'],
        content: `### Themes & Visual Presets

Fern Client offers three built-in visual themes:
- **Dark (Default)**: Deep obsidian background with high-contrast emerald accents.
- **Light**: Clean, daylight-accessible styling.
- **OLED Black**: Pure black (\`#000000\`) panels optimized for OLED and mini-LED displays.

All themes respect Windows high-contrast mode and \`prefers-reduced-motion\` system preferences.`,
      },
    ],
  },
  {
    id: 'accounts-online',
    name: 'Accounts & Cloud Sync',
    description: 'Authentication options, privacy controls, and opt-in cloud synchronization.',
    articles: [
      {
        id: 'auth-options',
        category: 'Accounts & Cloud Sync',
        title: 'Supported Authentication Types',
        summary: 'Offline profiles, Microsoft Minecraft accounts, and Fern online accounts.',
        keywords: ['accounts', 'microsoft', 'offline', 'fern account', 'auth'],
        content: `### Account Architecture

Fern Client supports three distinct, mutually isolated account mechanisms:

1. **Local Offline Profiles**:
   - Create local profiles instantly with custom display names.
   - Requires zero network calls and zero registration.
   - Ideal for local development, LAN play, and offline testing.

2. **Microsoft Minecraft Accounts**:
   - Legitimate Microsoft OAuth authentication.
   - Uses encrypted token storage (\`AES-256-GCM\` with Windows machine keys).
   - **Fern never stores or transmits your Microsoft password.**

3. **Fern Online Accounts (Optional)**:
   - Dedicated Fern community account powering cloud configuration sync and authoritative cosmetics.
   - Completely separated from Microsoft authentication.`,
      },
      {
        id: 'cloud-sync',
        category: 'Accounts & Cloud Sync',
        title: 'Opt-In Cloud Configuration Synchronization',
        summary: 'How cloud sync works, conflict detection (409 Conflict), and data sanitization.',
        keywords: ['cloud sync', 'conflict', 'backup', 'settings sync'],
        content: `### Cloud Sync Engine

Cloud synchronization is strictly **opt-in**:

- **Synchronized Data**: HUD presets, visual themes, custom keybinds, and launcher preferences.
- **Never Synchronized**: Microsoft passwords, session tokens, operating system credentials, installation binaries, or world saves.
- **Data Sanitization**: Before upload, all local paths and tokens are stripped; payloads are validated against a 5 MB limit.
- **Conflict Handling**: Uses SHA-256 revision hashing. If your local settings diverge from cloud revisions, Fern triggers a **409 Conflict** modal allowing you to choose whether to keep local settings or download the cloud revision.`,
      },
    ],
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting & Recovery',
    description: 'Diagnosing common errors, crash resolution, and Safe Mode recovery.',
    articles: [
      {
        id: 'safe-mode',
        category: 'Troubleshooting & Recovery',
        title: 'Fern Safe Mode & Crash Recovery',
        summary: 'How Safe Mode works and how to resolve launch failures.',
        keywords: ['safe mode', 'crash', 'recovery', 'troubleshoot'],
        content: `### Safe Mode & Crash Recovery

If Minecraft fails to launch or crashes unexpectedly:

1. **Crash Analysis**: The launcher scans your logs and crash reports to identify the exact cause:
   - *Java version mismatch* (\`UnsupportedClassVersionError\`)
   - *Out of memory* (\`OutOfMemoryError\`)
   - *Mod loader injection conflict* (\`MixinApplyError\`)
   - *Missing dependency* (\`ClassNotFoundException\`)

2. **Launching in Safe Mode**:
   - Safe Mode can be triggered directly from the crash modal or by holding Shift while launching.
   - Safe Mode injects \`-Dfern.safemode=true\` and \`--fernSafeMode\`.
   - Disables optional shader packs, unverified rendering tweaks, and experimental JVM flags while preserving your world saves and configurations.`,
      },
      {
        id: 'rollback-updates',
        category: 'Troubleshooting & Recovery',
        title: 'Recovering from a Failed Update',
        summary: 'Using rollback snapshots to restore previous launcher binaries.',
        keywords: ['rollback', 'update failed', 'snapshot', 'restore'],
        content: `### Update Rollback & Snapshots

Every time Fern Client applies an update, it creates a safety snapshot in \`%AppData%\\Fern Client\\.update-rollback\`.

If an update fails to start:
1. Open the **About** tab in Fern Client.
2. Click **Restore Previous Version**.
3. Fern Client will restore the previous binary state from the verified snapshot while preserving all your Minecraft installations and user settings.`,
      },
    ],
  },
];
