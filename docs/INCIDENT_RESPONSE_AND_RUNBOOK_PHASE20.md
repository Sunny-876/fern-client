# Fern Client — Phase 20: Operational Incident Response Runbook

**Product:** Fern Client  
**Version:** 1.0.0 (Stable)  
**Date:** 2026-10-10  
**Classification:** Operational Runbook & Emergency Procedures  

---

## 1. Principles of Post-Release Operations

1. **Safety Over Speed:** Never rush unverified binaries or force-downgrade user profiles without explicit backup preservation.
2. **User Data Sanctity:** Configuration files, screenshot directories, and world saves must never be deleted as a shortcut to fix a bug.
3. **Privacy First:** When triaging incidents, all telemetry and log attachments must be scrubbed of authentication tokens, passwords, local Windows usernames, and IP addresses.
4. **Verifiable Rollbacks:** Any deployment rollback must reference cryptographic SHA-256 manifests and tested rollback snapshots.

---

## 2. Emergency Rollback & Staged Rollout Controls

### Emergency Halt Procedure
If a critical defect, crash loop, or security flaw is identified in a newly deployed build:
1. **Halt Rollout Immediately:**
   - In `packaging/distribution.json`, update `channels.stable.latestVersion` back to the previous verified build (`1.0.0-rc.1` or previous stable).
   - In the edge CDN / update server, point `https://downloads.fernclient.net/dist/win/stable/` to the fallback package.
2. **GitHub Releases Containment:**
   - Immediately switch the affected release on GitHub to **Pre-release** or **Draft** to halt downloads from third-party mirrors and automation scripts.
3. **Notify Users Transparently:**
   - Post an active advisory banner on the website status portal and Discord announcements.

---

## 3. Incident Scenarios & Standard Operating Procedures

---

### Scenario A: Installation Failures After Release

#### 1. Identification
- Users report installer exits with `Error creating directory` or Windows SmartScreen blocks execution.
- Feedback reports categorised under `INSTALLATION` increase.

#### 2. Evidence Collection
- Obtain sanitized installer logs from `%TEMP%\FernClientSetup.log`.
- Request Windows build number (`winver`) and destination directory permissions.
- Ensure the user does not submit personal documents or un-sanitized log paths.

#### 3. Distribution Containment
- If widespread on a specific Windows 10/11 build, update the download landing page with a known issue banner directing users to the portable bundle.

#### 4. Restoration to Known-Good Build
- Advise affected users to extract `FernClient-1.0.0-Portable.zip`, which bypasses NSIS registry calls and runs standalone without elevated administrative permissions.

#### 5. Hotfix Preparation & Validation
- Reproduce the permission boundary in an isolated VM.
- Update NSIS script `packaging/installer.nsi` or packaging script.
- Validate fresh install and uninstallation in both standard user and admin contexts.

#### 6. User Communication
- Publish a patch note explaining the installer fix and provide direct download links for the portable workaround.

---

### Scenario B: Minecraft Launch Regressions

#### 1. Identification
- Users report that clicking "Play" produces a crash dialog or exit code `1` / `-1073740791`.
- Spike in reports under `LAUNCH_FAILURE`.

#### 2. Evidence Collection
- Request sanitized crash log via **Launcher > Settings > Export Diagnostics**.
- Inspect `latest.log` in `%APPDATA%\Fern Client\installations\<id>\logs\` for Mixin conflicts or Java architecture mismatches (e.g., 32-bit vs 64-bit Java).

#### 3. Distribution Containment
- Identify if the regression is loader-specific (Fabric, Forge, or NeoForge) or tied to a specific Minecraft minor version.

#### 4. Restoration / Mitigation
- Instruct users to launch via **Safe Mode** (toggled in Installation Options), which bypasses custom JVM arguments and isolates incompatible mods.
- If caused by a newly pushed launcher update, invoke `updateService.rollbackUpdate()` to restore the previous launcher binary.

#### 5. Hotfix Preparation & Validation
- Add regression test to `tests/` reproducing the exact launch arguments or manifest failure.
- Validate `FernLauncherService.launch()` in dry-run and process lifecycle test suites.

#### 6. User Communication
- Post a guide detailing the Safe Mode workaround and the root cause (e.g. incompatible third-party mod or outdated Java version).

---

### Scenario C: Broken or Incompatible Updates

#### 1. Identification
- Launcher fails to start after an in-app update or reports `Update authenticity check failed`.

#### 2. Evidence Collection
- Inspect `%APPDATA%\Fern Client\.update-rollback\snapshot-<timestamp>\manifest.json`.
- Verify the SHA-256 hash of the downloaded update in `%TEMP%` against `SHA256SUMS.txt`.

#### 3. Distribution Containment
- Freeze the update endpoint immediately by switching `distribution.json` to the fallback version.

#### 4. Restoration
- The launcher's built-in `UpdateService.rollbackUpdate()` automatically recovers the previous build from the local snapshot.
- For manual recovery, extract the previous portable release archive over the application directory.

#### 5. Hotfix Preparation & Validation
- Verify digital signature alignment (`FERN_RELEASE_PUBLIC_KEY`) and ensure packaging scripts compute hashes accurately.

#### 6. User Communication
- Issue a rollback advisory stating the update channel has been reverted while a patch is validated.

---

### Scenario D: Corrupted Release Artifacts

#### 1. Identification
- Users report `Archive is corrupted` or `CRC failure` when extracting `FernClient-1.0.0-Portable.zip`.

#### 2. Evidence Collection
- Compute the SHA-256 hash of the artifact on the CDN edge node:
  ```powershell
  Get-FileHash -Path .\FernClient-1.0.0-Portable.zip -Algorithm SHA256
  ```
- Compare against `release/SHA256SUMS.txt`.

#### 3. Distribution Containment
- Purge the edge CDN cache and disable download buttons on the website portal.

#### 4. Restoration
- Re-run `npm run package:win` and `npm run release` in a clean workspace.
- Re-upload verified archive and invalidate CDN caches.

#### 5. Validation
- Independently download the file via a fresh network connection and verify SHA-256.

#### 6. User Communication
- Notify users that a refreshed download archive is live and provide the correct checksum.

---

### Scenario E: Backend or Download-Service Outages

#### 1. Identification
- Social presence, skin fetching, or cloud synchronization return HTTP 502/503 errors.

#### 2. Evidence Collection
- Check backend API server health at `/api/v1/health`.
- Review PostgreSQL connection pool metrics and database logs.

#### 3. Distribution / Client Behavior
- Fern Client's offline-first architecture automatically activates: local accounts, offline skins, and cached instance profiles continue operating without interruption.

#### 4. Restoration
- Restart backend service containers or failover to database replicas.
- Zero client-side action required.

#### 5. User Communication
- Update status page with incident notice; inform users that local launcher and Minecraft gameplay remain fully functional.

---

### Scenario F: Security Incident / Credential Exposure Risk

#### 1. Identification
- Report of potential token leakage, unauthorized parameter execution, or path traversal vulnerability.

#### 2. Evidence Collection
- Reproduce the vulnerability in an isolated sandbox.
- Confirm whether sensitive information could be transmitted externally.

#### 3. Distribution Containment
- Immediately pull the affected version from public distribution.
- Invalidate any exposed backend tokens or revoke affected application secrets.

#### 4. Remediation & Hotfix
- Apply defensive checks (e.g. strict whitelist validation in `LaunchArgumentValidator`).
- Add regression test asserting complete rejection of the attack vector.
- Issue expedited hotfix build (e.g., `v1.0.1`).

#### 5. Responsible Disclosure
- Publish security advisory with CVE/CWE classification, affected versions, and mitigation instructions once all users have access to the patched build.

---

### Scenario G: Data Migration / JSON Store Corruption

#### 1. Identification
- Configuration files fail JSON parsing; user settings revert unexpectedly.

#### 2. Evidence Collection
- Check `%APPDATA%\Fern Client\` for `.corrupt.<timestamp>.bak` files.
- Inspect the corrupted file syntax to identify whether corruption was caused by truncated writes or schema mismatch.

#### 3. Mitigation & Recovery
- The launcher automatically creates a backup of the corrupted file and loads defaults safely.
- Maintainers can assist users in restoring custom keybinds or installations from the `.corrupt.bak` backup.

#### 4. Hotfix Preparation
- Ensure atomic file write patterns (`write to temp file -> fs.rename()`) are strictly enforced across all managers to prevent partial writes during sudden power loss.

---

## 4. Hotfix Lifecycle & Expedited Release Checklist

When issuing an emergency patch (e.g. `v1.0.1`):
1. **Branching:** Create hotfix branch from `tags/v1.0.0`.
2. **Minimal Diff:** Include strictly the fix and its regression test; no feature changes.
3. **Automated Verification:**
   - `npm run typecheck` — 0 errors
   - `npm run verify:docs` — 0 broken links
   - `npm test` — all tests pass
   - `npm run build` & `npm run package:win` — artifacts built cleanly
4. **Staging Validation:** Test in a clean Windows environment.
5. **Authorization:** Obtain approval from the designated release maintainer before updating `distribution.json`.
