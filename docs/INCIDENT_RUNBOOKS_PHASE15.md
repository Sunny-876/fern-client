# Fern Client — Operational Incident & Recovery Runbooks

## Severity Classifications

| Severity | Definition | Target Resolution Time | Example |
|---|---|---|---|
| **SEV-1 (Critical)** | Core launcher crash on start, data loss defect, or total authentication outage. | < 1 hour | Launcher crashes on boot for all users; corrupt database schema. |
| **SEV-2 (High)** | Major feature failure affecting a subset of players (e.g. skin sync down, launch failure on specific Java version). | < 4 hours | Cloud sync fails with 500 error; specific mod loader fails launch. |
| **SEV-3 (Medium)** | Non-blocking defect with an immediate workaround. | < 24 hours | HUD editor snapping glitch; cosmetic preview delayed. |
| **SEV-4 (Low)** | Minor cosmetic or documentation error. | Next sprint | Typo in tooltip; non-critical log warning. |

---

## Runbook 1: Broken Release & Immediate Rollback

### Detection
- Sudden surge of crash reports or launch errors immediately following a release tag.
- GitHub Release issue spike or Discord alert.

### Containment & Rollback
1. **Halt Auto-Updates**:
   - Access `distribution.json` on the distribution CDN.
   - Revert `latestVersion` in `channels.stable` or `channels.beta` back to the previous known good version (e.g. `1.0.0-beta.0`).
2. **Deprecate Artifact on GitHub Releases**:
   - Switch the broken release to `Draft` or `Pre-release` status to prevent new web downloads.
3. **Notify Users**:
   - Post a notice on the official website and status portal explaining the temporary hold.

### Recovery Verification
- Confirm that existing launchers check for updates and report "Up to date" against the previous version.
- Confirm that new download links serve the rollback build.

---

## Runbook 2: Failed Updater or Corrupt Update Artifact

### Detection
- Updater logs report `CHECKSUM_MISMATCH` or `CORRUPT_ARCHIVE`.
- Users report an error during in-app update extraction.

### Containment & Recovery
1. Run local checksum verification against the hosted file:
   ```powershell
   Get-FileHash -Algorithm SHA256 FernClientSetup.exe
   ```
2. Compare the output with the official value published in `SHA256SUMS.txt`.
3. If the CDN artifact is truncated or corrupted:
   - Purge CDN cache for the artifact URL.
   - Re-upload the verified artifact from the CI release pipeline.
4. If an in-app updater is broken for a deployed version, direct affected users to download the portable zip directly without auto-updater.

---

## Runbook 3: Backend & Database Outage

### Detection
- Monitoring alert triggered by `/api/v1/health` or `/api/v1/health/ready` reporting HTTP 503.
- Database connection pool exhausted or database unresponsive.

### Containment & Recovery
1. **Verify Database Health**:
   - Inspect PostgreSQL container/service status:
     ```bash
     pg_isready -h localhost -p 5432 -U postgres
     ```
2. **Restart Backend Service**:
   - Use graceful restart to re-initialize Prisma connection pools:
     ```bash
     npm --prefix backend run start
     ```
3. **Database Snapshot Restoration**:
   - If data corruption occurred, restore from the latest verified automated snapshot:
     ```bash
     pg_restore -d fern_production fern_db_pre_release.dump
     ```
4. **Client Fallback**:
   - Fern Client features offline desktop resilience and will continue to launch Minecraft in offline mode without crashing.

---

## Runbook 4: Compromised Signing Credentials

### Containment & Rotation
1. Immediately revoke the compromised certificate or Ed25519 signing key.
2. Generate a new keypair in a secure offline environment.
3. Update public verification keys in `distribution.json` and release metadata.
4. Issue an emergency patch with the new public key baked in.

---

## Post-Incident Review (PIR) Template

- **Incident Summary**: [Date, duration, affected components]
- **Root Cause Analysis (RCA)**: [Why did the failure occur?]
- **Preventative Actions**:
  - [Action Item 1 — Owner, Target Date]
  - [Action Item 2 — Owner, Target Date]
- **Lessons Learned**: [What went well, what could be improved]
