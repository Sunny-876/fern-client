# Fern Client — Beta Tester Onboarding & Feedback Guide

**Document Version:** 1.0.0-beta.1  
**Release Target:** Windows 10/11 x64  
**Product Name:** Fern Client  

Welcome to the Fern Client Beta Testing Cohort. This guide outlines how to safely install the beta release, verify your environment, report issues, and protect your local Minecraft data.

---

## 1. Safety & Privacy First

> [!IMPORTANT]
> - **Never share credentials**: Fern Client team members will **never** ask for your Microsoft password, session tokens, or personal authentication codes.
> - **Windows Security**: Do **not** disable Windows Defender or SmartScreen.
> - **Data Isolation**: The portable beta package stores all launcher data inside `./data` relative to the executable (`FERN_HOME=%~dp0data`), leaving host systems completely isolated.

---

## 2. Installing the Beta

### Portable Windows x64 Distribution (Recommended)
1. Download `FernClient-1.0.0-Portable.zip`.
2. Extract the archive into a dedicated directory of your choice (e.g. `C:\Games\FernClientBeta\`).
3. Launch `FernClient-Portable.bat` or run `dist-electron\main.cjs`.
4. The first-run onboarding wizard will automatically initialize default settings and detect local Java installations.

### Verifying Installed Version & Release Channel
- Click the **About** icon in the sidebar or open **Settings -> General**.
- Confirm the display reads: `Fern Client v1.0.0-beta.1 (BETA Channel)`.

---

## 3. Supported Configurations

| Component | Supported Beta Configuration | Notes |
|---|---|---|
| **OS** | Windows 10 (Build 19045+) or Windows 11 (23H2 / 24H2) | 64-bit architecture |
| **Target Minecraft** | `1.21.4` (Modern Release), `1.20.1` (Modding LTS) | `1.16.5` and `1.8.9` legacy supported |
| **Java Runtime** | Java 21 LTS (Eclipse Temurin / OpenJDK recommended) | Java 17 for 1.18–1.20.4; Java 8 for 1.8.9–1.16.5 |
| **Mod Loaders** | Fabric 0.16.x, NeoForge 21.x, Forge 47.x | Tested via automated compatibility engine |
| **Accounts** | Local Offline Profiles & Microsoft Live Accounts | Offline accounts generate deterministic UUIDs |

---

## 4. How to Report a Bug or Crash

If you encounter an issue during testing:
1. Open the launcher and navigate to **About** -> **Feedback & Bug Reporting** (or click the green chat bubble in the status bar).
2. Select the appropriate issue category:
   - **Bug Report**
   - **Game Crash**
   - **Installation Issue**
   - **Performance Problem**
   - **Mod Compatibility**
   - **UI / Visual Defect**
   - **Feature Request**
3. Fill in:
   - **Summary / Title** (Required)
   - **Detailed Description** (Required)
   - **Minecraft & Java Versions** (Optional)
   - **Mod Loader & Loader Version** (Optional)
   - **Steps to Reproduce** (Optional)
   - **Expected vs. Actual Result** (Optional)
4. Ensure **Attach Sanitized Diagnostic Report** is checked. Click **Review What Will Be Sent** to inspect the scrubbed hardware data.
5. Click **Submit Feedback**. You will receive an immediate reference identifier (e.g. `FB-XXXXXXXX` or `LOCAL-FB-XXXXXXXX` if disconnected).

---

## 5. Offline & Local Report Export

If you are running in an air-gapped test environment or the cloud backend is unreachable:
1. The feedback modal will automatically save your report to `%APPDATA%\Fern Client\feedback\LOCAL-FB-*.json`.
2. Alternatively, click **Export Report Locally** inside the feedback modal or **Settings -> Diagnostics -> Export Report**.
3. You can attach this sanitized JSON file directly to our GitHub Discussions or beta triage channel.

---

## 6. Recovery & Rollback Procedures

### Recovering from a Failed Minecraft Launch
1. If Minecraft crashes, the launcher detects the exit code and presents an actionable diagnostic recommendation.
2. In the installation settings, toggle **Safe Mode** to disable non-essential shaders and HUD modules.
3. If configuration becomes malformed, Fern Client automatically creates timestamped backups in `%APPDATA%\Fern Client\launcher\settings.json.corrupt.<timestamp>.bak` and restores defaults.

### Rolling Back to Stable Channel
1. In **Settings -> Updates**, change the channel dropdown from **Beta** to **Stable**.
2. If restoring an earlier application build, run the rollback utility via `updateService.rollbackUpdate()` or re-extract the stable ZIP package over the directory.
3. User instances in `instances/` and Minecraft world saves in `saves/` are **never** modified or deleted during an application rollback.
