# Fern Client — Architecture Specification

## 1. Architectural Philosophy

Fern Client is designed around strict separation of concerns, high runtime efficiency, and zero lock-in:

1. **Lightweight Core**: The launcher main process relies only on native Node.js APIs (`fs/promises`, `child_process`, `crypto`, `http`/`https`) rather than bloated native addons or heavy frameworks.
2. **Context-Isolated IPC**: The UI renderer executes in an isolated environment with disabled Node integration and communicates with the main process exclusively via typed IPC handles exposed through `window.fern`.
3. **Resilient Filesystem**: All state (settings, accounts, installations, profiles) is saved as human-readable JSON files with atomic write semantics under `%APPDATA%\Fern Client` or portable environment overrides.
4. **Legitimate Authentication**: Local profiles are restricted to legitimate local/offline development environments and generate deterministic RFC 4122 v3 UUIDs. No token scraping or bypass mechanisms are permitted.

---

## 2. Monorepo Organization

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
```

---

## 3. Technology Selection Rationale

| Requirement | Selected Technology | Rationale |
|---|---|---|
| **Desktop Shell** | Electron 44 + Node.js 22+ | First-class Windows process spawning (`child_process.spawn`), stdio stream monitoring, filesystem control, and reliable cross-version compatibility. |
| **Main Process Bundler** | esbuild 0.28 | Bundles main and preload scripts into optimized CommonJS modules in under 10 milliseconds. |
| **UI Framework** | React 19 + TypeScript | Declarative state management, fast rendering, and component reusability. |
| **UI Build Tool** | Vite 8 | Instant hot module replacement in development and lightweight rollups for distribution. |
| **Styling** | Vanilla CSS + CSS Variables | Zero CSS framework overhead (no heavy runtime, no Tailwind build latency), full control over dark-first minimal aesthetics. |
| **Testing** | Vitest 5 | Ultra-fast Node test execution (<500ms) with out-of-the-box TypeScript support. |

---

## 4. Launch Sequence Pipeline

The Minecraft launch flow in `FernLauncherService` follows this deterministic lifecycle:

```text
[User clicks PLAY]
       │
       ▼
1. Validate Account
   └── Check active Account in AccountManager.
       │
       ▼
2. Validate Installation
   └── Check Installation model in InstallationManager.
       │
       ▼
3. Validate Java Runtime
   └── Inspect installation.javaPath or auto-detect via JavaManager.
   └── Check Java major version compatibility against Minecraft version.
       │
       ▼
4. Prepare Directories
   └── Ensure gameDir, assetsDir, librariesDir exist.
       │
       ▼
5. Build JVM and Game Arguments
   └── Memory flags (-Xms, -Xmx).
   └── JVM optimizations (-XX:+UseG1GC, -XX:+ParallelRefProcEnabled).
   └── Minecraft parameters (--username, --version, --gameDir, --assetsDir, --uuid, etc.).
       │
       ▼
6. Spawn / Dry-Run
   └── If dryRun: validate parameters and return LaunchResult.
   └── If live: spawn child process with detached: false, pipe stdio.
       │
       ▼
7. Process Tracking
   └── Register with MinecraftProcessManager.
   └── Stream stdout/stderr into FernLogger and UI status events.
```

---

## 5. Security Architecture

1. **No Plaintext Credential Storage**: Passwords and raw authentication tokens are never serialized to disk.
2. **Context Isolation**: The Electron renderer operates with `contextIsolation: true` and `nodeIntegration: false`.
3. **Deterministic Local Profiles**: Local offline profiles generate UUIDs strictly via RFC 4122 v3 MD5 hashing of the string `OfflinePlayer:<username>`.
4. **Future Microsoft Auth Boundary**: Microsoft OAuth 2.0 device code flows are integrated without storing raw passwords.

---

## 6. Phase 9 — Cosmetics, Social Features & Fern Ecosystem Architecture

### 6.1 Fern User Profile System
- **Model**: `FernUserProfile` represents the player's Fern ecosystem identity (`id`, `username`, `displayName`, `avatar`, `bio`, `badges`, visibility settings).
- **Disambiguation**: Kept completely distinct from `FernProfile` (which configures game installations and HUD layouts).
- **Validation**: Enforced via `UserProfileValidator` (username 3-20 chars alphanumeric/underscore, display name 2-32 chars, bio max 250 chars).

### 6.2 Cosmetic System & In-Game Rendering
- **Pure Visual Guarantee**: Strictly visual models with zero hitbox changes, zero collision differences, and zero gameplay advantages.
- **De-coupled Contracts**:
  - `CosmeticDefinition`: Immutable metadata, asset path, preview icon, model type (`default` Steve / `slim` Alex / `both`), and rarity.
  - `CosmeticOwnership`: User owned items, favorites, and unlock timestamps.
  - `CosmeticEquippedState`: Current equipped item per category (`cape`, `cloak`, `hat`, `accessory`, `emote`).
  - `InGameCosmeticsPayload`: Serialized payload dispatched to client runtime without network dependencies.
- **In-Game Rendering Engine (`CosmeticRenderer`)**:
  - Evaluates third-person vs first-person perspective rules (capes and cloaks automatically hidden in first-person to preserve FOV).
  - Model offsets adapt dynamically to Alex slim arm measurements and player sneaking/sprinting/flying states.
  - Bounded memory cache with LRU eviction for loaded texture buffers.
  - Asset path traversal protection rejects `..`, absolute Windows drive paths, and dangerous URI schemes.

### 6.3 Friend & Presence Network
- **Friend Model**: `Friend`, `FriendRequest`, `FriendSearchResult`, with state transitions (`pending`, `accepted`, `declined`, `blocked`).
- **Presence Engine (`PresenceService`)**:
  - States: `offline`, `online`, `in_launcher`, `playing_minecraft`, `invisible`.
  - Rate-limited broadcast updates prevent socket or UI flooding.
  - Privacy redaction via `PrivacyService`: when Invisible Mode is active, presence broadcasts immediately as `offline` with stripped metadata.
  - Zero sensitive exposure: Server IP addresses, private credentials, and filesystem paths are strictly never broadcast.

### 6.4 Blocking & Player Statistics
- **Blocking (`BlockService`)**: Global local blocklist persisted in `blocks.json`. Blocked users cannot send friend requests, initiate interactions, or appear in discovery.
- **Local Statistics (`StatisticsService`)**: Tracks total Minecraft playtime, session frequency, and top installations/versions. Strictly local with zero external telemetry.

### 6.5 Offline-First Resilience & Backend Abstraction
- **API Contracts**: Prepared versioned interfaces (`/api/v1/profile`, `/api/v1/friends`, `/api/v1/presence`, `/api/v1/cosmetics`).
- **Local Fallback (`LocalSocialProvider`)**: Persists all social state to local JSON files (`profile.json`, `friends.json`, `requests.json`, `blocks.json`, `cosmetics_owned.json`, `cosmetics_equipped.json`). Works seamlessly without internet connectivity or external servers.
