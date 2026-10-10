# Fern Client — Phase 20: Stable Launch & Post-Release Operations

**Product:** Fern Client  
**Release Version:** 1.0.0 (Stable)  
**Target Platform:** Windows 10 Version 1809+ / Windows 11 (x64)  
**Date:** 2026-10-10  
**Status:** STABLE RELEASE PREPARED & QUALIFIED  

---

## 1. Executive Summary & Release Definition

Fern Client 1.0.0 is the official stable release of the modern Windows-first Minecraft Java Edition client and launcher. This milestone transitions the product from the Release Candidate phase (`v1.0.0-rc.1`) to **General Availability (v1.0.0 Stable)**.

The stable release is characterized by:
- **Zero Open Blockers:** 0 critical launch bugs, 0 data-loss risks, and 0 security vulnerabilities.
- **Data Protection & Graceful Recovery:** Built-in `.corrupt.<timestamp>.bak` file preservation and default fallback mechanisms across installations, profiles, accounts, and settings.
- **Cryptographic Release Verification:** Automated SHA-256 manifest generation, Ed25519 signature checks, and distribution alignment.
- **Offline-First Architectural Guarantee:** Unimpaired local launcher operation, profile switching, and Minecraft launching when network connectivity or update services are unreachable.
- **Strict Privacy Standards:** Redaction of all authentication tokens, credentials, usernames in paths, and internal IPs from crash logs and exported diagnostics.

---

## 2. Release Channels & Versioning Architecture

Fern Client manages three distinct distribution channels:

| Channel | Identifier | Cadence | Purpose | Auto-Update Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Stable** | `1.0.0` | Controlled milestone releases | Recommended for all players. Strict stability, zero regressions, certified compatibility. | Prompts when a verified, signed stable build is published to the stable feed. |
| **Release Candidate (RC)** | `1.0.0-rc.X` | Pre-release qualification | Pre-stable candidates for final regression suites, staging testing, and distribution packaging. | Available on the `rc` channel feed for validation teams. |
| **Beta / Preview** | `1.X.X-beta.X` | Bi-weekly / monthly | Feature previews (new HUD elements, experimental mod loaders, optimizer updates). | Opt-in via Launcher Settings > Updates > Channel: Beta. |

---

## 3. Supported Operating Systems & Hardware Requirements

### Minimum Requirements
- **Operating System:** Windows 10 64-bit (Version 1809, Build 17763 or later) / Windows 11
- **Processor:** Intel Core i3-3210 3.2 GHz / AMD A8-7600 APU 3.1 GHz (x64 architecture)
- **Memory (RAM):** 4 GB RAM minimum (System Memory Advisor enforces a 25% safety buffer)
- **Storage:** 500 MB free disk space for launcher and runtime libraries; 2+ GB recommended for Minecraft game assets
- **Graphics:** Intel HD Graphics 4000 / AMD Radeon R5 / NVIDIA GeForce 400 series with OpenGL 4.4+ support
- **Java Runtime:**
  - **Minecraft 1.20.5 – 1.21.x:** Java 21 LTS (64-bit)
  - **Minecraft 1.18 – 1.20.4:** Java 17 LTS (64-bit)
  - **Minecraft 1.16.5 and legacy:** Java 8 / 11 (64-bit)
  *Fern Client automatically detects all installed Java runtimes on Windows and validates compatibility before launch.*

---

## 4. Verified Release Notes (v1.0.0)

These release notes reflect strictly implemented and verified features:

### Core Launcher & Architecture
- **Offline-First Engine:** Full offline operation for profile management, instance switching, and local game launching.
- **System-Aware Memory Advisor:** Detects physical RAM boundaries and suggests optimal heap sizes (`-Xms` / `-Xmx`), preventing OS memory starvation.
- **JVM Argument Synthesis & Validation:** Synthesizes optimized G1GC garbage collection arguments while enforcing security validation against command injection delimiters (`[;&|><`$]`).
- **Safe Mode Launch Protection:** 1-click Safe Mode with minimal safe JVM flags and isolated mod directories to recover from crash loops.
- **Multi-Loader Support:** Automated installation, library resolution, and manifest assembly for **Fabric (0.16.x)**, **Forge (47.x)**, and **NeoForge (21.x)**.

### Instance & Modpack Management
- **Isolated Instances:** Per-installation game directories preventing mod and configuration cross-contamination.
- **Modrinth `.mrpack` Support:** Clean import and export with automatic exclusion of personal tokens, screenshots, and server lists.
- **Configuration Snapshots:** Versioned snapshots enabling 1-click restore of HUD layouts and client profiles.

### Data Safety & Security
- **Corrupt File Auto-Preservation:** Corrupted JSON files (`settings.json`, `installations.json`, `profiles.json`, `accounts.json`) are automatically preserved as timestamped `.corrupt.bak` archives before restoring clean defaults.
- **Encrypted Credential Vault:** Microsoft OAuth tokens encrypted with AES-256-GCM using local Windows DPAPI machine keys (`FernSecureTokenStorage`).
- **Diagnostic Privacy Sanitizer:** Automatic redaction of OAuth tokens (`<REDACTED_TOKEN>`), passwords (`<REDACTED_PASSWORD>`), Windows user home directories (`<USER_DIR>`), and IP addresses (`[REDACTED_IP]`).

---

## 5. Installation and Upgrade Procedures

### Fresh Installation
1. **NSIS Standard Installer (`FernClientSetup.exe`):**
   - Download the verified installer from the official portal.
   - Run the executable. It installs to `%LocalAppData%\Programs\Fern Client`, generates Start Menu shortcuts, and registers an uninstaller in Windows Settings.
   - User settings and Minecraft instances are stored cleanly in `%APPDATA%\Fern Client`.
2. **Portable Distribution (`FernClient-1.0.0-Portable.zip`):**
   - Extract the zip archive to any folder (e.g., `D:\Games\FernClient`).
   - Run `FernClient-Portable.bat`. All data and instances are isolated locally in `./data/`.

### Upgrade from Beta / RC builds
- **Automatic In-App Upgrade:**
  - When notified, click "Download & Install Update".
  - The launcher automatically captures a pre-update rollback snapshot in `%APPDATA%\Fern Client\.update-rollback\`.
  - The new package is verified against its SHA-256 hash and Ed25519 signature before execution.
  - All pre-existing installations, custom JVM arguments, profiles, and accounts are automatically preserved.
- **Manual Portable Upgrade:**
  - Extract the new `FernClient-1.0.0-Portable.zip` over your existing folder.
  - The `./data/` directory is preserved; all user configurations remain intact.

---

## 6. Pre-Publishing Release Checklist

Maintainers must verify every item prior to authorizing production distribution:

- [x] **Code Quality & Type Safety:** `npm run typecheck` passes with 0 errors.
- [x] **Documentation Integrity:** `npm run verify:docs` confirms 0 broken anchors or file links.
- [x] **Automated Regression Suite:** `npm test` executes all 84 test suites (465 tests) with 100% pass rate.
- [x] **Production Bundle Compiled:** `npm run build` generates valid `dist/`, `dist-electron/`, and `backend/` artifacts.
- [x] **Windows Packaging Generated:** `npm run package:win` produces `FernClient-1.0.0-Portable.zip` with verified SHA-256 checksum.
- [x] **Release Manifest Sealed:** `release/release-manifest.json` and `release/SHA256SUMS.txt` accurately record artifact hashes.
- [x] **Promotion Gate Criteria Satisfied:** `RegressionTracker.evaluatePromotionGate()` confirms 0 critical defects, 0 blockers, and 0 security issues.
- [ ] **Windows Code Signing:** Apply production EV Authenticode certificate to `FernClientSetup.exe` and `main.cjs` using offline HSM / Azure Key Vault (requires authorized release engineer).
- [ ] **CDN Edge Deployment:** Upload distribution zip and update manifest to edge CDN under `/dist/win/stable/` (requires infrastructure credentials).

---

## 7. Troubleshooting & Support Guidance

### Issue: Launcher Opens with Clean Defaults (Missing Configurations)
* **Cause:** Sudden power interruption or forced shutdown while writing JSON files corrupted the local file syntax.
* **Resolution:** Fern Client automatically created a backup named `settings.json.corrupt.<timestamp>.bak` or `profiles.json.corrupt.<timestamp>.bak` in `%APPDATA%\Fern Client\`. Users can inspect the `.bak` file or share it safely with support.

### Issue: "Exit Code 1" on Minecraft 1.21.4 Launch
* **Cause:** Java runtime version mismatch (e.g. attempting to run modern Minecraft on Java 8 or Java 17).
* **Resolution:** Navigate to **Installation Settings > Java Runtime**, and select **Java 21 LTS**. Fern Client automatically flags incompatible Java versions with a warning badge.

### Issue: Update Failed or Interrupted
* **Cause:** Network disconnection during package download or antivirus lock on executable.
* **Resolution:** The launcher automatically aborts and preserves the existing installation. If launcher files were partially modified, launch the rollback script or extract the portable bundle over the installation directory.
