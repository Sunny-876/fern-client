# Rollback Procedure: Fern Client 1.0.0 -> 1.0.0-beta.0

In the event of an unexpected regression or deployment defect:

1. **Containment**:
   - Immediately switch launcher update manifest back to version `1.0.0-beta.0`.
   - In GitHub Releases, mark `1.0.0` as pre-release or draft to halt new downloads.

2. **Client Rollback**:
   - Users running portable builds can extract `FernClient-1.0.0-beta.0-Portable.zip` over their existing folder.
   - User configurations in `%APPDATA%/Fern Client/installations/` and local profiles are backward-compatible and preserved.

3. **Backend & Database**:
   - Schema migrations follow additive and backward-compatible changes; no database rollback is required for minor versions.
   - In the event of a critical database regression, restore from the latest automated snapshot:
     `pg_restore -d fern_production fern_db_pre_release.dump`

4. **User Communication**:
   - Post incident status notice on the official website and status portal.
