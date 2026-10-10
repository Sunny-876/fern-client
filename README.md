# Fern Client

> **Fern Client** is a modern, high-performance Minecraft Java Edition client and launcher engineered for speed, low memory overhead, and clean modularity.

---

## Overview

Fern Client is structured into two core components:
1. **Fern Launcher**: A Windows-first desktop application that manages installations, Java runtimes, user accounts, and process lifecycles.
2. **Fern Minecraft Client**: A modular in-game client runtime and mod interface designed to provide enhanced performance, HUD customization, and PvP utilities in future phases.

---

## Phase 1 — Foundation Architecture

Phase 1 establishes the foundational infrastructure without premature feature bloat or technical debt:

- **Monorepo Architecture**: Clean separation between `launcher/`, `client/`, and `shared/` contracts.
- **Account Model & Local Profiles**: Legitimate offline/local profiles using deterministic RFC 4122 v3 UUIDs. Clear architectural separation for Phase 4 official Microsoft OAuth / Xbox Live flows (no bypasses, token theft, or insecure plaintext storage).
- **Settings System**: Strongly-typed settings schema with defaults, validation, runtime mutation, and schema version migrations.
- **Installation & Profile System**: First-class support for mod loaders (Vanilla, Fabric, Forge, NeoForge, Quilt), custom memory allocations (-Xms, -Xmx), and JVM argument tuning.
- **Java Runtime Management**: Automated detection across `%JAVA_HOME%`, system `%PATH%`, standard Windows installation directories (`Adoptium`, `Oracle`, `Zulu`, `Liberica`, `Microsoft`), version probing, and Minecraft compatibility checks.
- **Filesystem & Data Directory**: Strict isolation in standard Windows application locations (`%APPDATA%/Fern Client` or configurable via `FERN_HOME`).
- **Resilient Download Engine**: Asynchronous HTTP/HTTPS streaming, live progress tracking, retry with exponential backoff, cancellation tokens, and SHA-1/SHA-256 integrity verification.
- **Structured Logging & Diagnostics**: Centralized `FernLogger` with multi-level filtering (`DEBUG`, `INFO`, `WARN`, `ERROR`), daily disk logging, and live UI log streaming.
- **Launch Pipeline**: Dry-run simulation and child process orchestration with real-time standard output and error telemetry.

---

## Repository Structure

```text
fern-client/
├── launcher/
│   ├── src/
│   │   ├── accounts/          # Account storage, local profile generation & selection
│   │   ├── core/              # Paths, logger, errors, process tracking, launcher pipeline
│   │   ├── downloads/         # HTTP download streaming, retries & hash verification
│   │   ├── installations/     # Minecraft installations & Fern profile presets
│   │   ├── java/              # Java runtime detection & compatibility validation
│   │   ├── settings/          # Strongly-typed settings, migrations & validation
│   │   ├── ui/                # Modern React 19 + Vanilla CSS dark-first interface
│   │   ├── main.ts            # Electron main process & IPC handlers
│   │   └── preload.ts         # Type-safe contextBridge IPC bridge
├── client/
│   ├── src/
│   │   ├── core/              # Client runtime contracts & lifecycle
│   │   ├── hud/               # Screen element anchors & coordinate system
│   │   ├── modules/           # In-game toggles & module registry
│   │   ├── performance/       # Frame pacing, memory cleaner & tuning profiles
│   │   ├── visuals/           # Cosmetic and rendering definitions
│   │   └── ui/                # In-game GUI screens & overlay definitions
├── shared/
│   ├── config/                # Default settings & initial installations
│   ├── constants/             # Branding, loaders & application constants
│   ├── models/                # Shared TypeScript models (Account, Installation, Settings, etc.)
│   └── utilities/             # RFC4122 UUID generator, hashing & fs utilities
├── tests/                     # Vitest test suite for all core services
├── docs/
│   ├── ARCHITECTURE.md        # Deep dive into system architecture & IPC
│   └── DEVELOPMENT.md         # Developer setup, build pipeline & debugging
└── package.json
```

---

## Quick Start

### Prerequisites

- **Node.js**: v20 or newer (tested on Node v24)
- **npm**: v10 or newer

### Installation

```bash
git clone https://github.com/fernclient/fern-client.git
cd fern-client
npm install
```

### Running Tests

```bash
npm run test
```

### Building the Application

```bash
npm run build
```

### Launching the Desktop Application

```bash
npm start
```

---

## Data Directories

On Windows, Fern Client stores all assets, installations, accounts, settings, and logs under:

```text
%APPDATA%\Fern Client\
├── launcher\
│   ├── settings.json
│   └── profiles.json
├── installations\
│   └── installations.json
├── accounts\
│   └── accounts.json
├── versions\
├── libraries\
├── assets\
├── java\
├── modpacks\
├── resourcepacks\
├── shaderpacks\
├── social\
│   ├── profile.json
│   ├── friends.json
│   ├── requests.json
│   ├── blocks.json
│   ├── privacy.json
│   ├── statistics.json
│   ├── cosmetics_owned.json
│   └── cosmetics_equipped.json
├── logs\
│   └── fern-launcher-<date>.log
└── cache\
```

*(You can override the base directory by setting the `FERN_HOME` environment variable).*

---

## Roadmap

- [x] **Phase 1**: Foundation, Launcher Core Architecture, Local Profiles, Java Detection & Design System.
- [x] **Phase 2**: Minecraft Version Catalog & Installation Manager.
- [x] **Phase 3**: Mod Loaders, Mods & Modpack Management.
- [x] **Phase 4**: Fern Performance Engine & RAM Optimization.
- [x] **Phase 5**: In-Game Runtime Core, Module System, HUD Foundation & Keybinds.
- [x] **Phase 6**: Advanced HUD Editor, Themes & Profiles.
- [x] **Phase 7**: Visual Modules, Quality of Life, Screenshots & Waypoints.
- [x] **Phase 8**: Launcher Experience, Profiles, Backups, Updates & Diagnostics.
- [x] **Phase 9**: Cosmetics, Social Features & Fern Ecosystem.
- [x] **Phase 10**: Cloud Backend, Authentication, Synchronization & Online Infrastructure.
- [x] **Phase 11**: Release Engineering, Windows Distribution & Public Beta Readiness.

---

## Release & Build Commands

```bash
# 1. Build all components (Electron main, preload, Vite UI, NestJS backend)
npm run build

# 2. Run automated validation suite (308 tests across 69 suites)
npm test

# 3. Build Windows x64 distribution package (.zip, checksums, NSIS metadata)
npm run package:win

# 4. Full release pipeline
npm run release
```

For complete packaging, update signing, and beta readiness audit details, see [`docs/BETA_READINESS_PHASE11.md`](./docs/BETA_READINESS_PHASE11.md).

