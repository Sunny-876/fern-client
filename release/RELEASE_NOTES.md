# Fern Client v1.0.0 (Stable Release)

*Release Date: 2026-10-10*

Fern Client v1.0.0 is the official initial public release of Fern Client, a high-performance Windows-first Minecraft Java Edition client and launcher engineered for modern Windows systems.

---

## 🌟 Highlights
- **Zero GC In-Game HUD Engine**: Real-time snap-grid modular HUD customization engineered without per-frame memory allocation.
- **Unified Multi-Loader Support**: Native Fabric (0.16.x), NeoForge (21.x), and Forge (47.x) mod loader management.
- **Hardware-Aware Memory & JVM Synthesizer**: Automated system RAM detection and tuned G1GC/ZGC arguments for Java 21 and Java 17.
- **Offline-First Resilience**: Full launcher operation, instance switching, and local Minecraft gameplay function 100% offline.
- **Crash Recovery & Safe Mode**: Automated diagnosis of launch crashes (Java mismatch, OOM, Mixin conflicts) with 1-click Safe Mode and rollback snapshots.
- **Credential Security**: Microsoft OAuth tokens stored using AES-256-GCM encryption with local Windows machine keys; passwords are never stored.

---

## 💻 Windows Compatibility & System Requirements
- **Operating System**: Windows 10 (Version 1809 / Build 17763 or later, 64-bit) or Windows 11 (23H2 / 24H2, 64-bit).
- **Architecture**: Windows x64.
- **Java Runtimes**: 
  - Java 21 (LTS) for Minecraft 1.20.5+ / 1.21.x
  - Java 17 (LTS) for Minecraft 1.18 – 1.20.4
  - Java 8 for legacy Minecraft 1.16.5 and below
  - *Java is automatically detected and configured by Fern Client.*
- **System Memory**: 4 GB RAM minimum (8 GB recommended for modded gameplay).
- **Graphics**: Intel HD Graphics 4000 / AMD Radeon R5 / NVIDIA GeForce 400 Series or higher with OpenGL 4.4+.

---

## 📦 Distribution Artifacts & Checksums

| Artifact | File Format | Size | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| `FernClient-1.0.0-Portable.zip` | Portable ZIP | 215,454 bytes (~210 KB) | `aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128` |

### Cryptographic Verification Command (PowerShell):
```powershell
Get-FileHash -Algorithm SHA256 .\FernClient-1.0.0-Portable.zip
```
Expected hash:
`ACA5AE20ADBBA76BEEFEA614181F4014E3962F3A76265AB3A14C59EFE1E72128`

---

## ⚠️ Known Limitations & Code-Signing Notice
- **Signing Status**: This portable distribution is self-contained and **unsigned** (no commercial Authenticode EV certificate applied).
- **Windows SmartScreen**: Windows Defender / SmartScreen may display an informational warning on initial launch (*"Windows protected your PC"*). To proceed: click **More info** -> **Run anyway**.
- **Portable Architecture**: User configuration and instance data are isolated inside the `./data` directory adjacent to the binary. No Start Menu shortcuts or Windows Registry entries are modified.

---

## 🚀 Installation & Getting Started
1. Download `FernClient-1.0.0-Portable.zip` from this release.
2. (Optional but recommended) Verify SHA-256 checksum with the PowerShell command above.
3. Extract the ZIP archive into your desired folder (e.g. `C:\Games\FernClient` or `D:\FernClient`).
4. Launch `FernClient-Portable.bat` to start Fern Client in portable mode.
