# Fern Client — Post-Launch Prioritized Backlog (Phase 24)

This backlog documents verified technical improvements, security hardening items, and usability priorities following the initial public launch of Fern Client v1.0.0.

---

## 🎯 Prioritized Backlog Matrix

| Priority | Category | Item | Rationale & Objective | Status (Phase 25) |
| :---: | :--- | :--- | :--- | :---: |
| **P1** | **Trust & Security** | Authenticode Code Signing Pipeline | Integrated Azure Trusted Signing scaffolding & Authenticode verification into GitHub Actions release workflow. Awaiting maintainer Azure credential provisioning. | **Implemented & Scaffolding Verified** |
| **P1** | **Installation** | NSIS Installer Executable Production Build | Packaged and validated production setup binary (`FernClientSetup.exe`) with silent switches, clean uninstaller, shortcut integration, and user-data preservation. | **Completed & Tested** |
| **P2** | **Compatibility** | NeoForge 21.4.x Dynamic Launch Manifest Parsing | Expand manifest compatibility tests for newly published weekly NeoForge revisions on Minecraft 1.21.4. | Medium |
| **P2** | **Usability** | Automated Java Download Wizard | Provide automated 1-click download of Eclipse Adoptium Temurin OpenJDK 21 LTS if no local Java runtime is found on a user's PC. | Medium |
| **P2** | **Resilience** | Mirror Fallback for Mojang Version Manifests | Add redundant mirror endpoints if `piston-meta.mojang.com` experiences regional ISP throttling or DNS failures. | Low |
| **P3** | **HUD & Visuals** | Multi-Monitor Snap Boundary Constraints | Refine HUD editor widget drag boundaries when game window is spanned across mixed-DPI multi-monitor setups. | Medium |
| **P3** | **Operations** | Automated Daily Checksum & CDN Integrity Check | CI scheduled workflow to test public download link reachability and hash verification continuously. | Low |

---

## 🚫 Non-Goals for Next Milestone
- No speculative major version bumps (v2.0).
- No invasive user analytics or automatic telemetry uploading without explicit opt-in.
- No third-party monetization or sponsored bundleware.
- No unverified loader integrations without automated test coverage.
