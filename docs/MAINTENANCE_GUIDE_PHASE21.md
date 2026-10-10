# Fern Client — Post-Launch Maintenance & Support Guide

**Document Version:** 1.0.0  
**Target Release:** 1.0.0 (Windows x64)  
**Date:** 2026-10-10  
**Classification:** Technical Maintenance & Support Guide  

---

## 1. Supported Environments & Compatibility Matrix

Every supported combination has been evaluated through automated regression suites and dry-run launch pipeline tests:

| Minecraft Release | Required Java | Vanilla | Fabric | NeoForge | Forge | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Minecraft 1.21.4 (Modern)** | Java 21 LTS (64-bit) | Verified | Verified (0.16.x) | Verified (21.4.x) | Unverified | Recommended target release. Full HUD companion and shader support. |
| **Minecraft 1.20.4 / 1.20.1** | Java 17 LTS (64-bit) | Verified | Verified | Verified (1.20.2+) | Verified (47.x) | High-stability ecosystem for complex modpacks and shaders. |
| **Minecraft 1.16.5 (Legacy)** | Java 8 / 11 (64-bit) | Verified | Verified | Unsupported | Verified | Legacy modpack standard. Lightweight heap requirements. |
| **Minecraft 1.8.9 (PvP Legacy)** | Java 8 (64-bit) | Verified | N/A | N/A | Verified | Legacy competitive PvP standard with low memory footprint. |

> [!IMPORTANT]
> **Java 21 Requirement:** Minecraft 1.20.5 and newer versions are compiled with Java bytecode version 65 and strictly require Java 21 LTS. Launching with Java 17 or Java 8 will result in an immediate `UnsupportedClassVersionError`. Fern Client validates this compatibility boundary before starting the Java process.

---

## 2. Known Issues & Operational Workarounds

| Issue ID | Description | Severity | Workaround | Status |
| :--- | :--- | :--- | :--- | :--- |
| **KI-21-01** | **Offline Player Skins** | Low | In offline mode, custom skins default to Steve/Alex. Connect online once to allow the launcher to cache textures locally. | Documented |
| **KI-21-02** | **Portable Shortcut Generation** | Low | The portable distribution (`FernClient-1.0.0-Portable.zip`) does not register Windows Start Menu shortcuts or registry entries by design. Use the NSIS installer if system registry registration is required. | By Design |
| **KI-21-03** | **Windows ARM64 Devices** | Low | Snapdragon X Elite and Windows 11 ARM64 devices execute via the Windows x64 emulation layer with minor performance differences. | Native ARM64 planned for v1.1.0 |

---

## 3. Installation, Update & Recovery Troubleshooting

### Troubleshooting Flowchart

```text
Problem: Launch Fails with Exit Code 1
   │
   ├─► Check Java Version in Settings > Java
   │      └── Ensure Java 21 LTS is selected for 1.21.4
   │
   ├─► Check Custom JVM Arguments
   │      └── Remove invalid or deprecated flags (-XX:+UseConcMarkSweepGC)
   │
   └─► Activate Safe Mode in Installation Settings
          └── Launches with minimal arguments and disables conflicting mods
```

### 1. Incomplete or Corrupted Downloads
If a download is interrupted by network disconnection:
- Fern Client automatically verifies downloaded files against official SHA-256 checksums before staging them.
- Corrupted version metadata on disk is automatically detected, purged, and re-fetched from Mojang without requiring manual file deletion.

### 2. Restoring Corrupted Configurations
If a sudden power loss occurs while saving settings, profiles, or installations:
- The launcher identifies the syntax error.
- Automatically preserves the damaged file as `${fileName}.corrupt.<timestamp>.bak` in `%APPDATA%\Fern Client\`.
- Restores verified defaults so the launcher opens cleanly.

---

## 4. Privacy-First Bug Reporting & Diagnostic Log Sharing

To report an issue safely without leaking sensitive information:

1. **Export Diagnostics:**
   - In the launcher, go to **Settings > Diagnostics > Export Report**.
   - Save the report locally (`fern-diagnostic-report.json`).
2. **Review Automatic Redactions:**
   - Fern Client automatically scrubs:
     - Authentication and OAuth tokens (`<REDACTED_TOKEN>`)
     - Database connection strings and passwords (`<REDACTED_PASSWORD>`)
     - Local Windows user directories (`<USER_DIR>`)
     - Internal IPv4 network addresses (`[REDACTED_IP]`)
3. **Inspect Before Submitting:**
   - Open the exported report in Notepad to verify no personal files or messages are included.
4. **Submit via GitHub Issues:**
   - Provide reproduction steps, expected behavior, actual behavior, and attach the sanitized report.

---

## 5. Verified Changelog (v1.0.0 Maintenance Baseline)

- **Data Integrity:** Added `.corrupt.bak` automatic preservation and recovery across `InstallationManager`, `ProfileManager`, `AccountManager`, and `SettingsManager`.
- **Security Hardening:** Enforced `LaunchArgumentValidator` rejection of shell control delimiters (`[;&|><`$]`) preventing argument injection.
- **Diagnostics Sanitization:** Enhanced regex filtering in `DiagnosticsService` to mask tokens, passwords, Windows user profiles, and network IPs.
- **Rollback Snapshot Engine:** Pre-update snapshots in `%APPDATA%\Fern Client\.update-rollback\` enabling 1-click recovery if updates fail.
- **Offline Resilience:** Built-in embedded fallback manifest ensures launcher functionality when network connectivity or update services are offline.
