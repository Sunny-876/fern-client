# Fern Client — Dependency Maintenance & Security Policy

## Principles
1. **Minimal Dependencies**: Only introduce third-party libraries when the implementation is non-trivial and performance/security critical.
2. **Pinned Toolchains**: Use controlled Node.js 22 LTS, Vite, Vitest, and TypeScript versions.
3. **Automated Weekly Audits**: Dependabot scans root, backend, and GitHub Actions dependencies weekly.
4. **Grouped Updates**: Low-risk devDependencies (types, linters, test harnesses) are grouped together to minimize PR noise.

---

## Update Review Process

Before merging any dependency update:
1. **Changelog & Breaking Change Review**: Confirm the change does not alter IPC signatures or break Windows compatibility.
2. **Security Advisories**: Run `npm audit` to verify the new version resolves known CVEs and introduces none.
3. **License Verification**: Ensure the library uses an open license (MIT, Apache 2.0, BSD-3-Clause). Reject GPLv3 dependencies in proprietary core modules.
4. **Automated Test Validation**: All Vitest test suites (395+ tests) must pass with zero regressions.
5. **Production Build Verification**: All production builds (`build:ui`, `build:main`, `build:backend`) must compile cleanly.

---

## Major Version Upgrades
Major version upgrades (e.g. React 19 -> 20, Electron 44 -> 45) must be evaluated in isolated feature branches and baked for at least one full sprint before merging into `main`.
