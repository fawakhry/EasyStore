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

## Verified cross-repository D1 source discovery (2026-10-16)

- Actual candidate code lives in `fawakhry/TrendOs` branch `candidate/easystore-accounting-a2-20261005` (branch HEAD observed `90795b9d05b3cc72051be50683c7942b87d07452`), not in EasyStore repository root. `cloudflare-d1/src` has 75 files including `employee-accounting-native-v1.mjs`, `employee-auth-native-v1.mjs`, `accounting-finance-api-v1.mjs`, `accounting-finance-safe-v1.mjs`, `accounting-persistence-readiness-v1.mjs`. Migrations folder has 29 files through `0030_employee_accounting_write_canary_budget_v1.sql`.
- `accounting-finance-api-v1.mjs` SHA `5bfbeff90263a2cb0bec39ea21b9741347c6b89b` exposes `/v1/accounting/finance` GET metadata and `/v1/accounting/finance/plan` POST **planning-only**, explicitly `persisted:false`, `authoritativeWrites:false`, `persistence:none`.
- `accounting-persistence-readiness-v1.mjs` SHA `ba4b9e5f6863f357ce5a65c8328aefff45b14fe1` supports preview/test D1 preview-write opt-in only, explicitly blocks production and states `authoritativeWrites:false`.
- TrendOS `main` contains GitHub workflow `.github/workflows/easystore-a211-waste-canary-execution.yml` that checks remote D1 and live frontend and may execute canary steps. **Do not dispatch**: workflow references remote `trendos-main` and Cloudflare credentials. Workflow existence is NOT proof of successful acceptance or production readiness.
- Next read-only discovery: trace actual `employee-accounting-native-v1.mjs` route + `employee-auth-native-v1.mjs` trusted identity and compare candidate write routes with EasyStore front-end `config.js` and `app.js`. Verify staging-only, exact-head tests before any deployment decision.

NO_GO unchanged. No finance writes, merge, workflow dispatch, deployment, or owner approval performed.

## Critical source audit — waste approval mismatch (2026-10-16)

Read-only inspection of `fawakhry/TrendOs@candidate/easystore-accounting-a2-20261005`, `cloudflare-d1/src/employee-accounting-native-v1.mjs` SHA `c72b1ec853437f8b55c9320d59efb34445869fe0`:

- `authenticate` lines 287–295 verifies a cloud employee session, derives verified role/mode; the `approvedAccountingModeV1` roster is optional when grant mode is unset (lines 94–117). This is a real server-side authentication boundary but not proof that every financial action is owner-approved.
- **CRITICAL OWNER POLICY GAP:** `saveAccountingWasteV1` lines 956–989 permits `full`, `print`, and `laser` actors and immediately decrements material stock (lines 972–974) and inserts waste and stock movements (975–982). There is **no separate pending waste request followed by verified owner approval** in this route. This conflicts with the owner's requirement: employee submits, only owner approves, pending never posts stock/ledger. Source-only PR #47 is not wired into this route. Treat as release-blocking; do not send production waste requests.
- Route dispatcher lines 1769–1826 enforces mode OFF/READONLY/CANARY/GENERAL and session auth, and dispatches actual `saveEasyStoreSaleV2`, `saveCustomerAccountMovementV1915`, `saveAccountingWaste` handlers. `accounting-finance-api-v1.mjs` planning-only behavior is **separate** from this existing employee accounting D1 route; do not conflate them.
- CANARY waste shape lines 227–245 limits synthetic waste to a 0.01 value, no material or stock, but this is **not** an owner approval workflow and does not make GENERAL safe.

Required remediation before GENERAL: authenticated owner-only approve/reject endpoints, immutable pending request and audit evidence, server-derived actor/owner identity, idempotent atomic posting only after approval, stock race/duplicate/reversal tests. Until then keep waste write disabled outside bounded synthetic canary, and FINANCE_RELEASE=NO_GO. No code or production state changed by this audit.
