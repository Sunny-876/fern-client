# Fern Client — Long-Term Maintenance & Compatibility Engineering Guide
## Phase 13 Architecture, Operations & Verification Manual

---

### 1. Supported Minecraft & Java Runtime Matrix

Fern Client maintains explicit, evidence-based boundaries between Minecraft release versions and required Java environments.

| Minecraft Version Range | Required Java Runtime | Recommended Distribution | Bytecode / Class Version | Status |
|---|---|---|---|---|
| **1.20.5 – 1.21.x** | **Java 21 (LTS)** | Eclipse Adoptium Temurin 21 / Microsoft OpenJDK 21 | Class 65 | **Fully Tested & Supported** |
| **1.18 – 1.20.4** | **Java 17 (LTS)** | Eclipse Adoptium Temurin 17 | Class 61 | **Fully Tested & Supported** |
| **1.17 – 1.17.1** | **Java 16 or 17** | Eclipse Adoptium Temurin 17 | Class 60 | **Partially Tested** |
| **1.13 – 1.16.5** | **Java 8 (LTS)** | Temurin 8 / Zulu 8 | Class 52 | **Fully Tested & Supported** (Warning if Java >16 without modloader patches) |
| **1.8.9 – 1.12.2** | **Java 8 (LTS)** | Temurin 8 | Class 52 | **Fully Tested & Supported** |
| **Pre-1.8.9** | **Java 8 (LTS)** | Temurin 8 | Class 52 | **Untested / Unknown** |

---

### 2. Mod Loader Support Matrix

| Mod Loader | Supported MC Versions | Minimum Java | Notes / Known Incompatibilities |
|---|---|---|---|
| **Vanilla** | All (1.8.9 – 1.21.4) | Follows Minecraft Matrix | Clean baseline execution; no mods. |
| **Fabric** | 1.14.4 – 1.21.4 | 17 (1.18–1.20.4), 21 (1.20.5+) | Intermediary mappings dynamically loaded. Compatible with Quilt mods. |
| **NeoForge** | **1.20.2 – 1.21.4+** | 21 (1.20.5+) | Forked from Forge. **Does NOT support MC versions < 1.20.2.** |
| **Forge** | 1.8.9 – 1.21.4 | 8, 17, or 21 | Uses Forge installer wrapper and library resolution. |
| **Quilt** | 1.18.2 – 1.21.4 | Follows Fabric Matrix | Runs standard Fabric mods natively. |

---

### 3. Performance Benchmarks Instructions

To execute the automated benchmark suite:

```bash
# Run the benchmark test suite
npx vitest run tests/phase13-benchmarks.test.ts
```

#### Benchmark Targets & Measured Latencies:
1. **EventBus Dispatch (10,000 events)**:
   - *Baseline*: ~10,000 array allocations (~12ms).
   - *Phase 13 Optimized*: Copy-on-write snapshotting; **zero allocations**, executing in **<5ms**.
2. **HUDManager Render Pass (1,000 frames)**:
   - *Baseline*: Array recreation and sorting on every frame (~18ms).
   - *Phase 13 Optimized*: Cached pre-sorted elements; **zero allocations**, executing in **<4ms**.
3. **Module Ticking Loop (1,000 ticks)**:
   - *Phase 13 Optimized*: Fast-path execution bypassing inactive/non-ticking modules in **<3ms**.
4. **Cosmetic Renderer (1,000 frames)**:
   - Evaluates active layers with perspective and model checks in **<10ms**.
5. **Compatibility Engine Matrix (500 checks)**:
   - Multi-dependency resolution evaluates in **<20ms**.

---

### 4. Regression Testing Guide

Run all 73 test suites across the repository:

```bash
# Run all vitest suites
npm test

# Run specific phase tests
npx vitest run tests/phase13-compatibility-engine.test.ts
npx vitest run tests/phase13-performance-optimizations.test.ts
```

#### Critical Regression Paths:
- **Offline Launch Resilience**: Disconnect internet or set mock offline state; launcher must boot and launch local installations without blocking.
- **Corrupted Config Recovery**: If `settings.json` or `client.json` contains invalid syntax, verify it creates a timestamped `.bak` backup and restores defaults.
- **Safe Mode Arguments**: Verify `-Dfern.safemode=true` and `--fernSafeMode` flags are injected when Safe Mode is enabled.

---

### 5. Dependency Update Policy

1. **Regular Auditing**: Run `npm audit` across both root and `backend/` quarterly.
2. **Conservative Upgrades**: Never upgrade major framework versions (React, Vite, Electron, NestJS) without isolated compatibility testing and full test suite verification.
3. **Lockfile Integrity**: Always commit `package-lock.json`. Avoid `npm install` without explicit package pinning.
4. **Vulnerability Remediation**: Apply non-breaking patches (`npm audit fix`). Major/breaking security updates must be validated in an isolated branch.

---

### 6. Crash Troubleshooting Guide & Error Classification

| Category | Diagnostic Trigger | Confidence | Actionable Resolution |
|---|---|---|---|
| **`java_version`** | `UnsupportedClassVersionError` | **High** | Select compatible Java runtime in Settings > Java (Java 21 for 1.20.5+). |
| **`out_of_memory`** | `OutOfMemoryError` / `Java heap space` | **High** | Increase Max Memory slider in Installation Settings (4–6 GB recommended). |
| **`graphics_driver`** | GLFW error 65542 / WGL acceleration failure | **High** | Update GPU display drivers from NVIDIA/AMD/Intel; ensure high-performance GPU is used. |
| **`mod_conflict`** | `MixinApplyError` / `ModResolutionException` | **High** | Launch in Safe Mode or disable overlapping rendering/optimization mods. |
| **`loader_failure`** | `ModLoadingException` / Fabric bootstrap crash | **Medium** | Reinstall mod loader or switch to stable loader build. |
| **`corrupted_config`** | `JsonSyntaxException` in config directory | **High** | Delete or repair corrupted file in instance `config/` directory. |
| **`missing_dependency`** | `ClassNotFoundException` / missing Fabric API | **Medium** | Install required libraries via Mod Manager. |
| **`network_timeout`** | `SocketTimeoutException` during library download | **Medium** | Verify network connection; retry download. |

All exported diagnostic reports are automatically sanitized to redact Bearer tokens, passwords, and Windows usernames.

---

### 7. Configuration Migration & Recovery

1. **Schema Versioning**: Configuration schemas carry an explicit integer `version` field.
2. **Automated Migration**: On load, older configurations are automatically migrated sequentially (`v0 -> v1 -> v2`).
3. **Corrupted File Protection**: Before defaults are restored, corrupted files are automatically preserved as `settings.json.corrupt.<timestamp>.bak`.
4. **Untrusted Input Sanitization**: Imported profile names and theme identifiers are sanitized against path traversal (`..`, `\`, `/`), and array lengths are bounded.

---

### 8. Backend Failure & Offline Behavior

1. **Decoupled Architecture**: All core launcher operations (installing instances, configuring RAM, launching Minecraft, customizing HUD, editing keybinds) operate 100% offline.
2. **Network Resilience**:
   - `VersionService` caches version manifests locally. If network calls fail and disk cache is absent, an embedded LTS manifest (1.21.4, 1.20.4, 1.16.5) is used.
   - HTTP requests configure an 8–10s timeout with exponential backoff retries.
3. **Cloud Sync Conflicts**: Employs SHA-256 revision hashing. On 409 Conflict, users can choose between keeping local configurations or downloading remote revisions.

---

### 9. Maintenance Ownership & Release Checklist

- [ ] Verify `npm test` runs with 100% passing rate.
- [ ] Verify `npm run build:ui` and `npm run build:website` produce valid bundles.
- [ ] Verify `npm run build:main; npm run build:preload` compile cleanly with esbuild.
- [ ] Confirm no private keys or tokens are in version control.
- [ ] Validate compatibility matrix for newly released Minecraft versions.
- [ ] Perform trial launch in dry-run mode for Vanilla, Fabric, and Forge.
- [ ] Verify all exported logs pass `CrashAnalyzer.sanitizeLog()`.
