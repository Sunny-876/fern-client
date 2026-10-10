# Fern Client — Repeatable Release Engineering Procedures

## 1. Versioning & Channel Strategy

Fern Client follows strict Semantic Versioning (`MAJOR.MINOR.PATCH[-PRERELEASE]`):
- **Stable Channel**: Production-ready releases (e.g. `1.0.0`, `1.0.1`, `1.1.0`). Tested and validated for general players.
- **Beta Channel**: Preview releases with experimental features (e.g. `1.0.0-beta.1`, `1.1.0-beta.2`).

---

## 2. Release Pipeline Workflow

```
[ Code Complete ] ➔ [ Automated CI Tests ] ➔ [ Production Build ]
        ➔ [ Windows Packaging ] ➔ [ SHA-256 Manifest ]
        ➔ [ Release Candidate QA ] ➔ [ Approval & Publication ]
```

### Step 1: Pre-Release Verification
Run the complete automated test suite locally or on CI:
```powershell
npm test
```
Verify that all test suites pass with 0 failures.

### Step 2: Production Bundle Compilation
Build all client, launcher, and backend bundles:
```powershell
npm run build
```
Confirm the presence of:
- `dist/index.html` (UI bundle)
- `dist-electron/main.cjs` (Launcher core)
- `dist-electron/preload.cjs` (IPC Bridge)
- `backend/dist` (NestJS backend)

### Step 3: Windows Package Generation
Execute the release builder script:
```powershell
npm run package:win
```
This produces:
- `release/FernClient-1.0.0-Portable.zip`
- `release/SHA256SUMS.txt`
- `packaging/distribution.json`

### Step 4: Checksum Manifest Generation & Verification
Verify SHA-256 hashes against `SHA256SUMS.txt`:
```powershell
Get-FileHash -Algorithm SHA256 release\*.zip
```
Ensure the hash matches the value recorded in `SHA256SUMS.txt`.

### Step 5: Release Manifest Generation
Run the automated release pipeline generator:
```powershell
npx tsx scripts/release-pipeline.ts
```
This outputs:
- `release/release-manifest.json`
- `release/RELEASE_NOTES.md`
- `release/ROLLBACK_INSTRUCTIONS.md`

---

## 3. Approval & Publication

1. **Tag the Release**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```
2. **GitHub Actions Execution**:
   - The [`release.yml`](file:///d:/Fern%20Client/.github/workflows/release.yml) workflow builds, computes checksums, and uploads artifacts.
   - For stable channel releases, an explicit approval gate is required in the workflow dispatch or release draft review.

---

## 4. Rollback Procedures

If an unexpected defect is discovered post-release:
1. Revert `distribution.json` `latestVersion` to point to the prior version.
2. In GitHub Releases, toggle the compromised release to `Pre-release` or delete the release tag.
3. Users on portable builds can extract the prior portable zip directly over their installation folder without losing configurations.
