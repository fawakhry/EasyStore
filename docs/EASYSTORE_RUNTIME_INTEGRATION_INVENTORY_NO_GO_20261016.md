# EasyStore — Runtime Integration Inventory / Finance NO_GO

Date: 2026-10-16. Scope: repository-only review; no deployment or finance writes.

## Confirmed repository observations

- `Code.gs` exists on candidate and contains Apps Script routes, Google Sheets financial tables (`SHEET_NAME_ACC_WASTE`, `SHEET_NAME_ACC_STOCK_MOVES`, `SHEET_NAME_ACC_FINAL_INVOICES`) and `MATBAGY_ACCOUNTING_VERSION = V1922_UNIFIED_SAFE_BUILD`. Presence of this code does not establish that it is the deployed finance authority.
- `docs/ACCOUNTING_AGENT_PRODUCT_CONTRACT_V1.md` requires the final finance runtime to be D1-authoritative, zero Google business calls, server-side permissions, deterministic idempotent audit-backed financial tools. This is a target contract, not evidence of a completed migration.
- Source-only isolated Draft PRs #47, #48, #49 and #50 are NOT integrated into runtime. Their local tests do not establish live ledger behavior.
- Probes for `cloudflare-d1/src/index.mjs`, `cloudflare-d1/schema.sql`, and `cloudflare-d1/README.md` on candidate returned NOT_FOUND. These three paths alone do not prove that D1 source is absent elsewhere; discover the actual runtime paths before modifying any code.

## Implementation order (no bypass)

1. Locate actual Worker entry point, D1 migration schema, authenticated principal derivation, and existing finance API routes. Record exact file paths and SHA.
2. Define read-only adapter interfaces for authenticated actor, event provenance, invoice/receipt ledger and inventory transaction evidence. No direct AI D1 writes.
3. Implement idempotent, authorization-checked deterministic write commands only after owner-approved financial policy and server integration review. Preserve original event IDs and audit records.
4. Implement opening balance import in staging with owner evidence/approval; no fabricated opening balances.
5. Test invoice -> receipt -> customer statement, purchase -> stock receipt -> production use -> owner-approved waste -> count variance, expenses -> reports, and rollback/duplicate behavior against disposable staging D1.
6. Verify exact HEAD CI, staging smoke tests, data backup/restore, owner acceptance; only then request separate deployment and finance-write authorization.

## Explicit blockers

G1–G5 OPEN. FINANCE_RELEASE=NO_GO. No source-only test grants real approval. Never treat self-declared ownerRef or role as authentication. No automatic waste posting from discrepancies. No merge, production writes, or deployment authorized.
