# Fern Client — Supply Chain Security & Integrity Policy

## Core Protections
1. **Zero Secret Leaks**:
   - Signing keys, database passwords, and production tokens MUST NEVER be committed to Git.
   - Use `.gitignore` and automated secret scanners to block inadvertent credential commits.
2. **Artifact Integrity**:
   - Every generated distribution package is hashed using SHA-256 and recorded in `release/SHA256SUMS.txt`.
   - The launcher updater verifies downloaded archive hashes against the remote manifest before extracting.
3. **Safe Archive Decompression**:
   - All ZIP extractions utilize strict path traversal guards rejecting entries with `..`, absolute paths, or leading slashes.
   - Zip bombs are prevented by setting a 500MB cumulative uncompressed byte limit during extraction.
4. **Credential Vault Isolation**:
   - User session tokens on Windows are encrypted via AES-256-GCM using Windows DPAPI machine keys.
   - Configuration exports and `.fernbackup` archives automatically scrub tokens and passwords.
5. **Least Privilege CI**:
   - GitHub Actions workflows use `permissions: contents: read` by default, granting write permissions only to authenticated release jobs on tag events.
