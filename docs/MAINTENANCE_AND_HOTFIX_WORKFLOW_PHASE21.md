# Fern Client — Post-Launch Maintenance & Hotfix SOP

**Document Version:** 1.0.0  
**Date:** 2026-10-10  
**Scope:** Engineering Operations & Triage Workflow  

---

## 1. Ten-Step Repeatable Maintenance & Hotfix Workflow

Every defect, compatibility patch, or security fix must progress through this standardized lifecycle before distribution:

```text
[1. Reproduce Issue] ──> [2. Root Cause Analysis] ──> [3. Minimal Safe Fix]
         │
         ▼
[4. Add Regression Test] ──> [5. Run Automated Checks] ──> [6. Build Artifacts]
         │
         ▼
[7. Update Documentation] ──> [8. Prepare Maintenance Tag] ──> [9. Validate SHA-256]
         │
         ▼
[10. Authorized Distribution Gate]
```

### Step 1: Systematic Reproduction
- Verify whether the bug is reproducible in an isolated sandbox or automated unit test.
- Check operating environment: Windows 10 vs 11, Java version, loader (Fabric/Forge/NeoForge), and offline vs online state.
- If an issue cannot be reproduced, record the configuration details and mark as **UNVERIFIED**. Do not apply speculative code changes.

### Step 2: Root-Cause Investigation
- Isolate the defect to the specific domain:
  - Launcher startup or file I/O (`paths.ts`, `settings-manager.ts`, `installation-manager.ts`)
  - Java scanning or version resolution (`java-manager.ts`, `version-service.ts`)
  - Launch argument synthesis (`launch-arguments.ts`, `jvm-synthesizer.ts`)
  - UI state or IPC communication (`preload.ts`, `main.ts`, React components)
  - Mod loader library conflict (`mod-loader-manager.ts`)

### Step 3: Implement Minimal Safe Fix
- Apply surgical modifications that resolve the root cause without altering adjacent systems.
- Preserve backward compatibility with existing user configuration files and directory structures.
- Never silently reset user data or bypass security controls.

### Step 4: Regression Test Enforcement
- Implement a dedicated regression test reproducing the original failing condition.
- The test must fail prior to the fix and pass cleanly after the fix.
- Add edge-case assertions (e.g. malformed inputs, read-only permissions, network timeouts).

### Step 5: Execute Automated Verification Suite
Run the required automated checks in order:
```powershell
npm run typecheck      # Must pass with 0 errors
npm run verify:docs    # Must confirm 0 broken markdown anchors/links
npm test               # Must pass 100% across all test suites
```

### Step 6: Production Build Compilation
Compile all affected application layers:
```powershell
npm run build          # Builds main process, preload bridge, React UI, and NestJS backend
npm run package:win    # Packages Windows distribution artifacts and updates metadata
```

### Step 7: Update Documentation & Release Notes
- Document the fix in [`docs/MAINTENANCE_BACKLOG_PHASE21.md`](file:///d:/Fern%20Client/docs/MAINTENANCE_BACKLOG_PHASE21.md).
- Update [`release/RELEASE_NOTES.md`](file:///d:/Fern%20Client/release/RELEASE_NOTES.md) with verified changes only.
- If compatibility boundaries changed, update [`docs/STABLE_RELEASE_OPERATIONS_PHASE20.md`](file:///d:/Fern%20Client/docs/STABLE_RELEASE_OPERATIONS_PHASE20.md).

### Step 8: Prepare Maintenance Release Tag
- Calculate next semantic version according to SemVer:
  - Patch release for defect fixes (e.g., `1.0.1`)
  - Minor release for non-breaking compatibility extensions (e.g., `1.1.0`)
- Update `package.json` and `shared/constants/branding.ts`.

### Step 9: Validate Artifacts & Cryptographic Checksums
- Generate release manifests:
```powershell
node -e "import('./scripts/release-pipeline.ts').then(m => new m.ReleasePipeline().buildReleaseManifest('<VERSION>', './release'))"
```
- Verify computed SHA-256 checksums in `release/SHA256SUMS.txt` against output binaries.

### Step 10: Authorized Distribution Gate
- **CRITICAL RESTRICTION:** Automated scripts and coding agents are strictly prohibited from publishing directly to public CDNs, third-party mirrors, or production update channels without explicit authorization.
- An authorized release maintainer must review test logs, sign binaries with an Authenticode certificate, and authorize the CDN deployment.

---

## 2. Priority & Severity Handling

```text
Priority 1: Critical Security (RCE, token leak) ───────> Immediate hotfix (<24h)
Priority 2: Data Loss / Startup Hang ──────────────────> Fast-track patch (<48h)
Priority 3: Minecraft Launch Regression ──────────────> Scheduled maintenance
Priority 4: Cosmetic / Minor UI Polish ────────────────> Next minor release
```

---

## 3. Privacy-Conscious Bug Reporting Instructions

When requesting diagnostic logs from users:
1. **In-App Export:** Guide users to **Settings > Diagnostics > Export Log**.
2. **Built-in Redaction:** Inform the user that the launcher automatically scrubs:
   - Microsoft authentication tokens (`<REDACTED_TOKEN>`)
   - Passwords and database strings (`<REDACTED_PASSWORD>`)
   - Windows user home directories (`<USER_DIR>`)
   - Internal IPv4 network addresses (`[REDACTED_IP]`)
3. **Local Review:** Encourage users to open and review the exported `.txt` / `.json` file in Notepad before attaching it to a GitHub issue or support ticket.
