# Fern Client — Windows Production Installer Specification & Guide

**Artifact:** `release/FernClientSetup.exe`  
**Milestone:** Phase 25 — Windows Installer & Release Pipeline Hardening  
**Target OS:** Windows 10 (Version 1809+, 64-bit) & Windows 11  

---

## 1. Installer Architecture & Overview

`FernClientSetup.exe` is the official Windows installer for Fern Client. It packages the production desktop launcher and web user interface using the Nullsoft Scriptable Install System (NSIS).

### Key Architectural Characteristics
- **No Administrator Privileges Required:** Configured with `RequestExecutionLevel user`. Installs cleanly into user space without triggering User Account Control (UAC) prompts.
- **Optimized Footprint:** Compressed with NSIS zlib datablock optimization, producing a compact setup binary (~286 KB core bundle).
- **Clean Registry Footprint:** Confines registry keys strictly to `HKEY_CURRENT_USER` (HKCU).
- **Complete Packaging Order:** Application bundle is packaged, staged, verified, and Authenticode audit checks are executed before final SHA-256 checksums are calculated.

---

## 2. File System Layout & Installation Locations

### Installed Application Directory
Default installation target:
```text
%LocalAppData%\Programs\Fern Client
```
(typically `C:\Users\<Username>\AppData\Local\Programs\Fern Client`)

Contents installed:
```text
Fern Client/
├── dist/                 # Production React 19 UI bundle & assets
│   ├── assets/
│   └── index.html
├── dist-electron/        # Electron main process & preload scripts
│   ├── main.cjs
│   └── preload.cjs
├── FernClient.bat        # Windows entrypoint launcher
└── Uninstall.exe         # Generated uninstaller
```

### User Data & Minecraft Instance Storage
User data is strictly decoupled from application binaries:
```text
%AppData%\Fern Client/
├── installations/        # Minecraft game instances & modded profiles
├── accounts/             # Encrypted Microsoft & local account tokens
├── configs/              # In-game HUD layout, themes, keybinds
├── cache/                # Mojang & Modrinth download caches
└── logs/                 # Launcher diagnostics & crash reports
```

> [!NOTE]
> Installing, upgrading, or reinstalling Fern Client **never overwrites or resets** the `%AppData%\Fern Client` directory.

---

## 3. Command-Line Switch Reference

The installer supports automated, enterprise, and scripted deployment via standard NSIS command-line switches:

| Switch | Syntax | Description |
| :--- | :--- | :--- |
| **Silent Install** | `FernClientSetup.exe /S` | Executes an unattended, silent installation with no UI wizard. |
| **Custom Target** | `FernClientSetup.exe /D=C:\Custom\Path` | Specifies a custom installation folder. Must be the last parameter and specified without quotes. |
| **Combined Silent** | `FernClientSetup.exe /S /D=C:\Games\FernClient` | Performs a silent installation directly to the specified folder. |

---

## 4. Windows Shell & Registry Integration

### Start Menu & Desktop Shortcuts
The installer registers:
- **Start Menu Folder:** `%SMPROGRAMS%\Fern Client`
  - `Fern Client.lnk` &rarr; launches `FernClient.bat`
  - `Uninstall.lnk` &rarr; launches `Uninstall.exe`
- **Desktop Shortcut:** `%DESKTOP%\Fern Client.lnk`

### Windows "Installed Apps" / Add or Remove Programs Registration
The installer writes standard uninstall keys under:
```text
HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\FernClient
```
Registered values:
- `DisplayName`: `Fern Client`
- `DisplayVersion`: `1.0.0`
- `Publisher`: `Fern Client Team`
- `InstallLocation`: `%LocalAppData%\Programs\Fern Client`
- `UninstallString`: `"<InstallDir>\Uninstall.exe"`
- `QuietUninstallString`: `"<InstallDir>\Uninstall.exe" /S`
- `NoModify`: `1`
- `NoRepair`: `1`

---

## 5. Upgrade & Reinstallation Behavior

When a newer version of `FernClientSetup.exe` is run over an existing installation:
1. Updated binaries in `dist` and `dist-electron` overwrite the previous application version.
2. New registry version strings are updated.
3. User settings, account tokens, custom modpacks, and world saves in `%AppData%\Fern Client` are **100% preserved**.
4. Existing shortcuts are validated and refreshed.

---

## 6. Uninstallation Behavior & Data Protection

### Silent Uninstallation
Running:
```powershell
& "$env:LocalAppData\Programs\Fern Client\Uninstall.exe" /S
```
- Removes all application binaries (`dist`, `dist-electron`, `FernClient.bat`, `Uninstall.exe`).
- Removes Start Menu and Desktop shortcuts.
- Deletes HKCU registry entries.
- **Preserves** all user settings, world saves, and game configurations in `%AppData%\Fern Client`.

### Interactive Uninstallation
When run interactively from Settings &rarr; Installed apps:
- Prompts user whether to keep or remove configuration files.
- Explicitly safeguards Minecraft world saves and instances.

---

## 7. Distribution Format Comparison

| Attribute | Windows Installer (`FernClientSetup.exe`) | Portable ZIP (`FernClient-1.0.0-Portable.zip`) |
| :--- | :--- | :--- |
| **Target User** | Everyday users wanting seamless Windows integration | Power users, USB drive usage, isolated testing |
| **Installation Path** | `%LocalAppData%\Programs\Fern Client` | Extracted directory of user's choice |
| **User Data Path** | `%AppData%\Fern Client` | Local `./data` directory next to executable |
| **Shortcuts** | Automatically created in Start Menu & Desktop | None created automatically |
| **Add/Remove Programs** | Yes, registered in Windows Settings | No registry footprint |
| **Admin Rights Needed** | No (Per-user install) | No |
| **Integrity Verification** | SHA-256 Checksum & Authenticode Signature | SHA-256 Checksum & Ed25519 Manifest |

---

## 8. Verification & Integrity Check

Verify the installer checksum in Windows PowerShell:
```powershell
Get-FileHash -Path .\FernClientSetup.exe -Algorithm SHA256
```
Expected SHA-256 for v1.0.0:
```text
95235b5c0541d23ece41a39c66153ec2cc2f4a98a84bdbeb51468acfd3d15145
```
