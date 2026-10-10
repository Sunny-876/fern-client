# Fern Client — Code-Signing & Authenticode Guide (Phase 24)

This document outlines the technical requirements, architecture, and deployment procedures for transitioning Fern Client from its current self-contained unsigned portable distribution (v1.0.0) to a verified Authenticode-signed Windows installer.

---

## 1. Current Status (v1.0.0)

| Distribution Channel | Artifact | Signing Status | Integrity Mechanism |
| :--- | :--- | :--- | :--- |
| **Stable (Portable)** | `FernClient-1.0.0-Portable.zip` | **Unsigned** | SHA-256 Checksum (`aca5ae20...`) + Ed25519 Manifests |
| **Installer (Staged)** | `FernClientSetup.exe` (NSIS) | **Staged Template** | Pre-release script ([`packaging/installer.nsi`](file:///d:/Fern%20Client/packaging/installer.nsi)) |

### Windows SmartScreen User Impact
Because v1.0.0 does not carry an Extended Validation (EV) digital signature, Windows Defender SmartScreen displays a warning on initial launch:
```
Windows protected your PC
Microsoft Defender SmartScreen prevented an unrecognized app from starting.
```
- **Current Mitigation**: Users are instructed to verify the official SHA-256 hash using Windows PowerShell `Get-FileHash` against [`SHA256SUMS.txt`](file:///d:/Fern%20Client/release/SHA256SUMS.txt), then click **More info** &rarr; **Run anyway**.
- **Important**: Security warnings must never be dismissed indiscriminately. Users should always cross-reference official release checksums on GitHub.

---

## 2. Requirements for a Future Signed Release

Under CA/Browser Forum baseline requirements (effective June 1, 2023), private keys for all code-signing certificates must be stored in certified Hardware Security Modules (HSMs) conforming to FIPS 140-2 Level 2 or Common Criteria EAL 4+.

### Option A: Cloud HSM / Azure Trusted Signing (Recommended)
- **Service**: Azure Trusted Signing (formerly Microsoft Identity Verification for Code Signing).
- **Benefits**:
  - Direct integration with GitHub Actions workflows via Microsoft's `trusted-signing-action`.
  - No physical USB token management or on-premise hardware required.
  - Cost-effective for open-source and independent developer teams.
- **Requirements**:
  - Azure subscription with an Azure Trusted Signing account.
  - Identity validation (organization or registered individual developer).
  - Azure Key Vault certificate profile configured with Endpoint URL and Certificate Profile Name.

### Option B: Commercial EV Code Signing Certificate
- **Providers**: DigiCert, Sectigo, GlobalSign, or SSL.com.
- **Hardware**: Cloud HSM token (e.g., DigiCert ONE / eSigner) or physical FIPS 140-2 YubiKey/SafeNet token.
- **Benefits**: Instant SmartScreen reputation on day one without initial warning ramp-up.

---

## 3. Signing Toolchain & Script Architecture

### Dual-Signing Procedure for NSIS Installers
In NSIS installers, the embedded `Uninstall.exe` is generated during compilation and must be signed separately:

1. **Step 1: Compile Uninstaller Staging**:
   ```powershell
   makensis.exe /DGENERATE_UNINSTALLER packaging\installer.nsi
   ```
2. **Step 2: Sign Uninstaller**:
   ```powershell
   signtool.exe sign /v `
     /fd SHA256 `
     /tr http://timestamp.digicert.com `
     /td SHA256 `
     /a build\Uninstall.exe
   ```
3. **Step 3: Compile Final Installer Bundle**:
   ```powershell
   makensis.exe packaging\installer.nsi
   ```
4. **Step 4: Sign Final Setup Binary**:
   ```powershell
   signtool.exe sign /v `
     /fd SHA256 `
     /tr http://timestamp.digicert.com `
     /td SHA256 `
     /d "Fern Client Setup" `
     /du "https://fernclient.net" `
     /a release\FernClientSetup.exe
   ```
5. **Step 5: Verify Digital Signature**:
   ```powershell
   signtool.exe verify /v /pa release\FernClientSetup.exe
   ```

---

## 4. Security Rules & Safe Handling
- **Never Commit Secrets**: Private keys, `.pfx` certificates, HSM passwords, and Azure credentials must NEVER be committed to git or stored in plaintext.
- **Automated CI Secrets**: Store credentials exclusively in GitHub Actions Encrypted Secrets (`AZURE_CREDENTIALS`, `AZURE_CERT_PROFILE`).
- **RFC 3161 Timestamping**: Always include an authentic RFC 3161 timestamp (`http://timestamp.digicert.com`). This ensures the binary remains valid even after the certificate expires.
- **No Self-Signed Impersonation**: Never generate self-signed Authenticode certificates claiming commercial authority, as this causes immediate anti-virus flags.
