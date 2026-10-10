# Fern Client — Production Deployment Verification Report

**Milestone:** Final Production Deployment  
**Repository:** `https://github.com/Sunny-876/fern-client`  
**Platform:** Windows 10/11 x64  
**Date:** 2026-10-10  

---

## 1. Live Web Deployment (Vercel)

- **Production Vercel URL:**  
  [`https://temporary-express-azure-gkti6et.vercel.app`](https://temporary-express-azure-gkti6et.vercel.app)
- **Deployment Status:** **LIVE AND VERIFIED** (HTTP 200 OK from Vercel Edge CDN with valid headers).
- **Vercel Claim URL (to attach to maintainer account):**  
  [`https://vercel.com/claim-deployment?code=88702773-4dae-44bd-9f98-18165116c766`](https://vercel.com/claim-deployment?code=88702773-4dae-44bd-9f98-18165116c766)
- **Framework Preset & Toolchain:** Vite / React 19 / TypeScript / Single Page Application.
- **Root Directory:** Repository Root (`.`) with `buildCommand: "npm run build:website"` and `outputDirectory: "dist-website"`.
- **Configuration File:** [`vercel.json`](file:///d:/Fern%20Client/vercel.json) configured with SPA route rewriting (`/.* -> /index.html`), immutable asset caching (`Cache-Control: public, max-age=31536000, immutable`), and security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).

---

## 2. Public Windows Application Distribution (GitHub Releases)

The public application is distributed directly from GitHub Releases under the official release tag `v1.0.0`:
[`https://github.com/Sunny-876/fern-client/releases/tag/v1.0.0`](https://github.com/Sunny-876/fern-client/releases/tag/v1.0.0)

| Distribution | Filename | Size | SHA-256 Checksum | Verified Download URL |
| :--- | :--- | :--- | :--- | :--- |
| **Windows Installer** | `FernClientSetup.exe` | 292,766 bytes (~286 KB) | `95235b5c0541d23ece41a39c66153ec2cc2f4a98a84bdbeb51468acfd3d15145` | [Download Installer](https://github.com/Sunny-876/fern-client/releases/download/v1.0.0/FernClientSetup.exe) |
| **Portable ZIP** | `FernClient-1.0.0-Portable.zip` | 215,454 bytes (~210 KB) | `aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128` | [Download Portable ZIP](https://github.com/Sunny-876/fern-client/releases/download/v1.0.0/FernClient-1.0.0-Portable.zip) |

Both files have been verified via direct HTTP HEAD and GET requests (returning HTTP 200 OK from `release-assets.githubusercontent.com`).

---

## 3. Discrepancy Resolution (Portable ZIP vs Staged Installer)

- **Prior Discrepancy:** Earlier reports noted that `FernClient-1.0.0-Portable.zip` was published publicly on GitHub, whereas the Windows Installer was described as locally staged.
- **Resolution:**
  1. `FernClient-1.0.0-Portable.zip` was verified live on GitHub Releases tag `v1.0.0` with matching SHA-256 hash `aca5ae20adbba76beefea614181f4014e3962f3a76265ab3a14c59efe1e72128`.
  2. The production setup executable `FernClientSetup.exe` was compiled with NSIS v3.03, verified locally, and attached as an official release asset to tag `v1.0.0`.
  3. The release description and checksum manifest (`SHA256SUMS.txt`) on GitHub were updated to document both distributions.
  4. The live website download portal links directly to the real GitHub Releases download URLs.

---

## 4. Signing Status & Windows SmartScreen Disclosure

- **Signing Status:** **Unsigned Community Release** (No commercial Authenticode EV certificate applied).
- **Authenticode Inspection:** `Get-AuthenticodeSignature` returns `Status: NotSigned`.
- **SmartScreen Impact:** Windows Defender SmartScreen displays a protective dialog on first launch.
- **Truthful Documentation:** Website and download page clearly guide users to verify the cryptographic SHA-256 checksum and click **More info** &rarr; **Run anyway**.
- **CI Scaffolding:** Azure Trusted Signing workflow is integrated into `.github/workflows/release.yml` with safe fallback ready for maintainer credential provisioning.

---

## 5. Permanent Vercel Linking Instructions for Maintainers

To link the repository permanently to your personal or organization Vercel account:

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Select the repository: `Sunny-876/fern-client`.
4. The repository's [`vercel.json`](file:///d:/Fern%20Client/vercel.json) will automatically configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build:website`
   - **Output Directory:** `dist-website`
5. Click **Deploy**. Vercel will assign a permanent production domain (e.g. `fern-client.vercel.app` or custom domain `fernclient.net`).
