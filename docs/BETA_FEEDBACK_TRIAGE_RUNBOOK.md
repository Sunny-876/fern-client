# Fern Client — Beta Feedback Triage & Release Promotion Runbook

## Objective
Establish a structured triage workflow to handle beta bug reports, deduplicate incoming issues, sanitize user diagnostics, and provide clear gates for promoting a beta build to stable.

---

## 1. Defect Severity Matrix

| Severity | Criteria | Impact on Release |
|---|---|---|
| **CRITICAL** | Crash on boot, Minecraft launch failure on primary supported versions (1.21.4/1.20.1), data loss in configuration, or authentication token compromise. | **Blocker**: Halts promotion immediately. |
| **HIGH** | Major feature unavailable (e.g. shader presets fail to apply, resource pack profiles corrupt `options.txt`), but Minecraft can still be launched with a workaround. | Maximum 1 permitted for promotion if a workaround is published. |
| **MEDIUM** | Non-blocking bug affecting specific optional modules (e.g. waypoint compass icon alignment, screenshot tag search case sensitivity). | Does not block release; scheduled for next minor patch. |
| **LOW** | Minor cosmetic styling, tooltip typo, or non-actionable log warning. | Does not block release. |

---

## 2. Issue Taxonomy & Categories

Every issue is categorized under one of the following domains:
1. `INSTALLATION`: Windows installer, portable zip, extraction, or permissions.
2. `LAUNCH_FAILURE`: Process launch failures, Java path discovery, JVM argument errors.
3. `PERFORMANCE`: Frame drops, memory leaks, high CPU utilization.
4. `MOD_COMPATIBILITY`: Fabric / Forge / NeoForge loader incompatibilities.
5. `UI_CUSTOMIZATION`: HUD editor, themes, profiles, keybind configuration.
6. `AUTHENTICATION`: Microsoft/Xbox OAuth flow, token refresh, local offline accounts.
7. `CLOUD_SYNC`: Profile and settings synchronization with Fern backend.
8. `SECURITY`: Credential handling, path traversal, archive safety.
9. `UPDATER`: Checksum verification, update download, delta patching.

---

## 3. Log Sanitization & Privacy Standard

Before attaching diagnostic logs to an issue:
1. Personal Windows username directories (`C:\Users\<Name>`) MUST be replaced with `%USERPROFILE%`.
2. Access tokens, refresh tokens, passwords, and session cookies MUST be stripped or replaced with `[REDACTED]`.
3. Non-local IP addresses MUST be sanitized to `[REDACTED_IP]`.

The built-in [`RegressionTracker.sanitizeLogContent`](file:///d:/Fern%20Client/launcher/src/qa/regression-tracker.ts#L36) utility automatically applies this sanitization standard.

---

## 4. Promotion Criteria: Beta to Stable

A beta build may be promoted to stable only when all of the following conditions are met:
1. **Zero Critical Defects**: No open `CRITICAL` defects.
2. **High Defect Cap**: No more than 1 open `HIGH` defect, and that defect must have a documented workaround.
3. **Zero Security Defects**: No unresolved `SECURITY` category issues.
4. **Baking Window**: The build has been available in the public beta channel for at least **7 days**.
5. **Automated Suite**: 100% pass rate on all automated unit, integration, and benchmark tests.
6. **Documentation**: Release notes and rollback procedures are written and verified.
