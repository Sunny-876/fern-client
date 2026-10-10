# Azure Trusted Signing (Microsoft Trusted Signing) Setup Guide & Maintainer Checklist

**Project:** Fern Client  
**Target Platform:** Windows 10/11 x64 Authenticode Release Pipeline  
**Milestone:** Phase 25 — Release Pipeline Code Signing Integration  

---

## 1. Overview

Azure Trusted Signing (formerly *Azure Code Signing*) is Microsoft's fully managed, cloud-based code signing service. It eliminates the need for physical hardware security modules (HSM) or third-party USB tokens by providing identity validation, automated short-lived certificate issuance, and RFC 3161 timestamping within the Azure trust boundary.

This document details the configuration requirements and step-by-step checklist for authorized maintainers to provision Azure resources and configure CI secrets.

> [!IMPORTANT]
> **Zero Secrets Exposure Policy:**  
> The release pipeline supports Workload Identity Federation (OIDC). Long-lived client secrets, private keys, or passwords must never be committed to source control or exposed in CI logs.

---

## 2. Maintainer Prerequisites Checklist

Before configuring GitHub Actions, an authorized administrator must set up the following resources in Microsoft Azure:

- [ ] **Azure Subscription & Tenant:** Active Azure subscription with billing enabled.
- [ ] **Resource Provider Registration:** Register the `Microsoft.CodeSigning` resource provider:
  ```bash
  az provider register --namespace Microsoft.CodeSigning
  ```
- [ ] **Resource Group:** Designated resource group (e.g., `rg-fern-signing-prod`).
- [ ] **Trusted Signing Account:** Create a Trusted Signing account resource in a supported region (e.g., `westeurope` or `eastus`):
  ```bash
  az trusted-signing account create \
    --resource-group rg-fern-signing-prod \
    --account-name fernclientsigning \
    --location westeurope \
    --sku Basic
  ```
- [ ] **Identity Validation:** Complete Microsoft Identity Verification (Organizational Validation or Individual Validation) inside Azure Portal.
- [ ] **Certificate Profile:** Create a Certificate Profile under the Trusted Signing Account:
  - **Profile Type:** `PublicTrust` (required for Windows Authenticode signing)
  - **Profile Name:** `FernClientReleaseProfile`
  - **Identity Validation ID:** Link to the validated organizational identity.
- [ ] **Entra ID App Registration (Service Principal):** Register an application in Microsoft Entra ID (e.g., `github-actions-fern-client`).
- [ ] **Federated Credentials (OIDC - Recommended):** Configure GitHub Actions OIDC federation:
  - **Issuer:** `https://token.actions.githubusercontent.com`
  - **Subject Identifier:** `repo:Sunny-876/fern-client:ref:refs/tags/v*` (or specific release branches)
  - **Audience:** `api://AzureADTokenExchange`
- [ ] **RBAC Role Assignment:** Assign the **Trusted Signing Certificate Profile Signer** role to the App Registration:
  ```bash
  az role assignment create \
    --assignee "<APP_REGISTRATION_CLIENT_ID>" \
    --role "Trusted Signing Certificate Profile Signer" \
    --scope "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-fern-signing-prod/providers/Microsoft.CodeSigning/codeSigningAccounts/fernclientsigning/certificateProfiles/FernClientReleaseProfile"
  ```

---

## 3. GitHub Secrets Configuration

Once Azure resources are provisioned, add the following secrets to the GitHub repository (**Settings &rarr; Secrets and variables &rarr; Actions**):

| Secret / Variable Name | Type | Description | Example |
| :--- | :---: | :--- | :--- |
| `AZURE_TENANT_ID` | Secret | Azure Entra ID Tenant Directory ID | `00000000-0000-0000-0000-000000000000` |
| `AZURE_CLIENT_ID` | Secret | App Registration Application (Client) ID | `11111111-1111-1111-1111-111111111111` |
| `AZURE_TRUSTED_SIGNING_ACCOUNT` | Secret | Name of the Azure Trusted Signing Account | `fernclientsigning` |
| `AZURE_CERT_PROFILE_NAME` | Secret | Certificate Profile name within the account | `FernClientReleaseProfile` |
| `AZURE_CLIENT_SECRET` | Secret | *(Optional if using OIDC)* Client secret | *Store securely only if OIDC unavailable* |
| `AZURE_TRUSTED_SIGNING_ENDPOINT` | Variable | Regional endpoint URI | `https://weu.codesigning.azure.net` |

---

## 4. Release Pipeline Behavior & Safe Fallback

The release pipeline (`.github/workflows/release.yml`) and signing script (`scripts/sign-and-verify.ts`) implement safe conditional signing:

1. **Local and Pre-Credential Builds (Current State):**
   - The script detects that `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, etc., are not configured.
   - It outputs an informational warning:
     ```text
     [Warning] Azure Trusted Signing credentials unavailable. Skipping signing (safe fallback). Artifacts remain unsigned.
     ```
   - It records `isSigned: false`, status `NotSigned`, and logs an audit report to `release/SIGNING_AUDIT_REPORT.json`.
   - Build completes successfully with unsigned artifacts without crashing.

2. **Strict Release Mode (`REQUIRE_CODE_SIGNING=true`):**
   - In production tag workflows where strict Authenticode enforcement is required, setting `REQUIRE_CODE_SIGNING=true` will halt the pipeline if credentials are missing or signing fails, preventing accidental publication of unsigned binaries.

3. **Signed Production Builds:**
   - When credentials exist, GitHub Actions executes `azure/trusted-signing-action@v0.4.0`.
   - The installer `release/FernClientSetup.exe` is signed with SHA-256 and timestamped via `http://timestamp.acs.microsoft.com`.
   - Final SHA-256 checksums in `release/SHA256SUMS.txt` are computed **after** digital signing is completed.
   - `scripts/sign-and-verify.ts` runs Authenticode verification (`Get-AuthenticodeSignature`) and asserts `isSigned: true`, `Status: Valid`.

---

## 5. Manual Verification Command

To verify Authenticode signature status on any Windows machine:

```powershell
Get-AuthenticodeSignature -FilePath .\release\FernClientSetup.exe | Format-List
```

Expected output for a signed binary:
```text
SignerCertificate      : [CN=Fern Client Team, ...]
TimeStamperCertificate : [CN=Microsoft Time-Stamp Service, ...]
Status                 : Valid
StatusMessage          : Signature verified.
Path                   : ...\release\FernClientSetup.exe
```

Expected output prior to signing:
```text
Status        : NotSigned
StatusMessage : The file ... is not digitally signed.
Path          : ...\release\FernClientSetup.exe
```
