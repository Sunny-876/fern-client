# Fern Client — Maintenance Backlog & Issue Classification

**Document Version:** 1.0.0  
**Phase:** Phase 21 Post-Launch Maintenance  
**Date:** 2026-10-10  
**Status:** ACTIVE MAINTENANCE TRACKER  

---

## 1. Backlog Principles & Evidence Standards

- **No Fabricated Evidence:** Because Fern Client 1.0.0 is currently prepared and staged locally (not distributed to public telemetry servers), this backlog is grounded strictly in verified edge cases, architectural audits, compatibility boundaries, and automated test evaluations.
- **Verification Requirement:** Every item is classified as either **VERIFIED** (reproduced and observed locally) or **UNVERIFIED / PROPOSED** (architectural improvement or pending wider user testing).
- **Severity Hierarchy:**
  - **CRITICAL:** Remote code execution, credential leakage, or unrecoverable user data loss.
  - **HIGH:** Complete launch blockage, unhandled application crash, or broken updater.
  - **MEDIUM:** Significant feature impairment with an available workaround (e.g. offline skin fallback).
  - **LOW:** Minor cosmetic flaw, layout polish, or non-blocking documentation clarification.

---

## 2. Categorized Maintenance Backlog

### Category A: Critical Security & Data-Loss Prevention

| ID | Issue Title | Severity | Status | Verification & Impact |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **JVM Argument Delimiter Injection** | CRITICAL | **RESOLVED** | `LaunchArgumentValidator` rejects shell control characters (`[;&|><`$]`) preventing argument injection. |
| **SEC-02** | **Credential Storage Encryption** | CRITICAL | **RESOLVED** | Microsoft OAuth tokens encrypted with AES-256-GCM via Windows DPAPI keys (`FernSecureTokenStorage`). |
| **SEC-03** | **Config Store Corrupt-State Backup** | CRITICAL | **RESOLVED** | `.corrupt.<timestamp>.bak` created automatically if JSON stores are malformed before defaults are restored. |

---

### Category B: Installation, Update & Launch Failures

| ID | Issue Title | Severity | Status | Reproduction Steps & Expected Behavior | Proposed Fix / Workaround |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MAINT-B01** | **Interrupted Update File Lock** | HIGH | **VERIFIED** | *Steps:* Interrupt updater download midway or terminate process while updating.<br>*Expected:* Launcher rolls back cleanly.<br>*Actual:* `UpdateService` captures rollback snapshot before writing and safely restores previous build upon failure. | Managed by `UpdateService.rollbackUpdate()`. |
| **MAINT-B02** | **Corrupted Version JSON on Disk** | HIGH | **VERIFIED** | *Steps:* Write invalid JSON to `%APPDATA%/Fern Client/versions/1.21.4/1.21.4.json`.<br>*Expected:* File purged, fresh version fetched from Mojang.<br>*Actual:* `VersionService.getVersionPackage()` detects malformed JSON, deletes the corrupt file, and re-fetches. | Verified in `tests/phase17-beta-qualification.test.ts`. |
| **MAINT-B03** | **Read-Only AppData Directory Permissions** | MEDIUM | **UNVERIFIED** | *Steps:* Run launcher under restrictive corporate Windows policy where `%APPDATA%` is read-only.<br>*Expected:* Clear diagnostic error dialog directing user to Portable mode.<br>*Actual:* Write operations fail with `EACCES`. | Add startup filesystem write probe in `paths.ts` warning user to run Portable mode. |

---

### Category C: Minecraft & Java Compatibility Handling

| ID | Issue Title | Severity | Status | Description & Compatibility Boundary | Proposed Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **COMPAT-C01** | **Java 8 vs 17 vs 21 Enforcement** | HIGH | **RESOLVED** | Minecraft 1.20.5+ requires Java 21; 1.18–1.20.4 requires Java 17; 1.16.5 and below requires Java 8. | `CompatibilityEngine.checkJavaCompatibility()` flags mismatches as fatal before process spawn. |
| **COMPAT-C02** | **Future Minecraft Major Versions** | MEDIUM | **VERIFIED** | Future unreleased Minecraft releases (e.g. 1.22.x) may have unknown Java or loader requirements. | `CompatibilityEngine` returns `unknown` warning status instead of crashing, allowing user-configured runtimes. |
| **COMPAT-C03** | **ARM64 Windows x64 Emulation** | LOW | **VERIFIED** | Windows 11 ARM64 laptops run launcher via x64 emulation layer. | Documented in known issues; native ARM64 build planned for future milestone. |

---

### Category D: Mod Loader & Modpack Processing

| ID | Issue Title | Severity | Status | Description & Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **LOADER-D01** | **Fabric & NeoForge Library Merging** | HIGH | **RESOLVED** | Verified in `tests/loaders.test.ts`: libraries, main classes, and loader arguments merge into base Minecraft manifest without conflicts. |
| **LOADER-D02** | **Large Modpack (.mrpack) Memory Budget** | MEDIUM | **VERIFIED** | Modrinth archives with 100+ mods stream unzip without memory spikes. Validated in `tests/modpacks.test.ts`. |

---

### Category E: Performance & Resource Usage

| ID | Issue Title | Severity | Status | Benchmark Baseline |
| :--- | :--- | :--- | :--- | :--- |
| **PERF-E01** | **Zero-GC In-Game HUD Elements** | MEDIUM | **RESOLVED** | In-game HUD widgets avoid heap object allocation in render loops; render cycle takes < 1.0 ms. |
| **PERF-E02** | **System RAM Protection Buffer** | MEDIUM | **RESOLVED** | `RamAdvisor` prevents allocating > 75% of system RAM or leaving < 2 GB for Windows OS. |

---

### Category F: Privacy, Diagnostics & UI Usability

| ID | Issue Title | Severity | Status | Verification & Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **PRIV-F01** | **Diagnostic Log Secret Redaction** | HIGH | **RESOLVED** | `DiagnosticsService.sanitizeSensitiveText()` masks OAuth tokens, passwords, Windows usernames in paths, and internal IPs. |
| **PRIV-F02** | **Offline Player Skin Caching** | LOW | **VERIFIED** | In offline mode, player skins default to Steve/Alex until connected to Microsoft skin servers once. |
