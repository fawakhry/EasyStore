# EasyStore Accounting Master Book

Canonical project record for EasyStore / Accounting Agent.

Repository: `fawakhry/EasyStore`  
Canonical branch: `candidate/easystore-zero-google-audit-20261004`  
Created: 2026-10-05

## Record rule

This file is the **single canonical accounting project book**.

From this point forward:

- every accounting step, gate, audit, source change, runtime change, migration, purge, deploy, test, rollback, policy change, agent-tool addition, autonomy change, and production verification MUST be recorded here;
- Accounting work MUST NOT be logged in `TrendOS_MASTER_BOOK.md`;
- TrendOS may expose integration contracts, but the accounting execution history stays here;
- EasyStore/Accounting commits may reference TrendOS runtime facts when needed, but ownership of the accounting roadmap and status remains in this book;
- no accounting step is considered complete until its evidence is recorded here;
- use the rule:
  `Runtime truth > deployed > tested > repo-only > historical`.

## Product mission

EasyStore is being rebuilt as an **AI Accounting Agent**, not merely a conventional accounting screen.

Target operating model:

`TrendOS / Autonomous Printshop operational facts -> Finance Connector -> Accounting Agent -> deterministic accounting tools -> D1 financial ledgers -> audited result`

The long-term goal is that AI manages routine accounting work and humans handle only:

- exceptions;
- approvals above policy limits;
- physical facts the system cannot infer;
- legally/financially sensitive overrides.

## Core architecture

### Deterministic Accounting Engine
Owns the financial truth.

Responsibilities:
- balances;
- invoices;
- receivables;
- payables;
- inventory;
- cost;
- profit;
- treasury;
- day close;
- reversals;
- idempotency;
- audit events.

AI is never allowed to invent ledger truth.

### AI Accounting Agent
Owns orchestration and decision support.

Responsibilities:
- understand events/context;
- choose allowed tools;
- explain decisions;
- detect anomalies;
- prepare transactions;
- execute only within policy.

Rule:

`AI decides what to attempt -> deterministic tool validates and executes -> ledger records result`.

## Autonomy ladder

```ini
LEVEL_1=OBSERVE
LEVEL_2=RECOMMEND
LEVEL_3=APPROVAL
LEVEL_4=AUTO
```

Promotion to a higher level requires:
- deterministic tool contract;
- server-side policy;
- idempotency for writes;
- audit evidence;
- runtime qualification;
- rollback/reversal path where applicable.

## Current baseline

Observed/qualified before this book was created:

```ini
PRODUCT=EasyStore
VERSION=ES47 V1922 Unified Safe Build
CURRENT_ARCHITECTURE=HYBRID
TARGET_ARCHITECTURE=CLOUDFLARE_D1_ZERO_GOOGLE_AI_ACCOUNTING_AGENT

ACCOUNTING_MODE=READONLY
ACCOUNTING_POLICY_EPOCH=2
D1_SCHEMA_READY=YES
D1_AUTHORITATIVE_WRITES=NO

EASYSTORE_ZERO_GOOGLE=NO
LIVE_APPS_SCRIPT_FALLBACK=YES
SECURE_PROXY_CONFIGURED=NO

APP_LITERAL_API_ACTIONS=33
FRONTEND_D1_READ_ACTIONS=3

ACCOUNTING_DATA_RETENTION=NOT_REQUIRED
ACCOUNTING_DATA_PURGE_AUTHORIZED=YES
ACCOUNTING_PURGE_SCOPE=ACCOUNTING_DATA_ONLY
TRENDOS_ORDERS_PRESERVE=YES
TRENDOS_CUSTOMERS_PRESERVE=YES
EMPLOYEES_PRESERVE=YES
```

Previous audit evidence:
- ES-ZG-001 runtime audit: Run `37233448156` = SUCCESS.
- D1 Accounting health: READONLY / epoch 2.
- unauthenticated read fails closed with HTTP 401.
- write-shaped request fails closed with HTTP 503 while READONLY.
- Production business-data mutation from the audit = NO.

## Roadmap

### Phase A0 — Accounting-only reset and isolation
Target duration: 0.5–1 day.

Goals:
- identify every accounting-only dataset in Google and D1;
- purge accounting business rows only;
- preserve schema, code, users, TrendOS orders/customers and non-accounting operational data;
- verify clean empty accounting baseline;
- keep Accounting control fail-closed.

Exit criteria:
```ini
ACCOUNTING_PURGE=PASS
D1_ACCOUNTING_BUSINESS_ROWS=0
GOOGLE_ACCOUNTING_BUSINESS_ROWS=0
NON_ACCOUNTING_DATA_TOUCHED=NO
ACCOUNTING_MODE=READONLY_OR_OFF_AS_PLANNED
```

### Phase A1 — Zero-Google read model
Target duration: 2–3 days.

Goals:
- move all accounting reads away from Apps Script;
- implement customers/suppliers/party balances/reporting/health/search in D1 contracts;
- remove Google-backed read helpers from normal runtime;
- unify stable IDs: Party, Item, Order, Line, Department, Profit Center.

Exit criteria:
```ini
ACCOUNTING_READS_D1=100_PERCENT_REQUIRED_SCOPE
APPS_SCRIPT_ACCOUNTING_READS=0
READ_RECONCILIATION=PASS
```

### Phase A2 — Deterministic write engine
Target duration: 4–6 days.

Build and qualify:
- sales invoices;
- customer collections;
- purchases;
- supplier payments;
- materials/items;
- stock movements;
- BOM/product formation;
- waste/adjustments;
- department purchases;
- custody;
- day close;
- reversals;
- idempotency ledger;
- immutable audit events.

Each capability is promoted separately.

Exit criteria:
```ini
ACCOUNTING_WRITES_D1=QUALIFIED
IDEMPOTENCY=PASS
REVERSAL_MODEL=PASS
AUDIT_LEDGER=PASS
APPS_SCRIPT_FINANCIAL_WRITE_AUTHORITY=0
```

### Phase A3 — Remove Google runtime authority
Target duration: 1–2 days.

Goals:
- remove Apps Script fallback from EasyStore accounting runtime;
- prove no accounting Google business calls;
- run production smoke tests;
- verify zero hidden spreadsheet authority.

Exit criteria:
```ini
EASYSTORE_ZERO_GOOGLE=PASS
GOOGLE_BUSINESS_CALLS=0
ACCOUNTING_ENGINE=D1_AUTHORITATIVE
```

### Phase B1 — Agent Contract + Tool Registry
Target duration: 2–3 days.

Create typed agent tools for:
- accounting summary;
- customer/supplier balance;
- party ledger;
- open invoices/payables;
- sales invoice creation;
- collections;
- purchases;
- supplier payments;
- stock movement;
- material consumption;
- waste;
- day close;
- reconciliation;
- reversals;
- cost/profit calculation;
- cash/material forecast;
- anomaly detection;
- accounting explanations.

Every tool must define:
- exact inputs;
- exact outputs;
- authorization;
- autonomy level;
- idempotency rules;
- dry-run support if relevant;
- failure codes;
- audit event.

Exit criteria:
```ini
AGENT_TOOL_REGISTRY=PASS
DIRECT_AI_DB_WRITE=FORBIDDEN
DEFAULT_AGENT_MODE=OBSERVE
AGENT_WRITES=OFF
```

### Phase B2 — Observe / Recommend Agent
Target duration: 3–5 days.

Capabilities:
- daily accounting briefing;
- anomaly detection;
- due collections;
- supplier obligations;
- stock risk;
- margin anomalies;
- cash forecast;
- material forecast;
- reconciliation suggestions.

No autonomous financial writes.

Exit criteria:
```ini
ACCOUNTING_AGENT_MODE=RECOMMEND
AUTO_FINANCIAL_WRITES=0
DAILY_BRIEF=PASS
ANOMALY_ENGINE=PASS
```

### Phase B3 — Approval Agent
Target duration: 3–5 days.

Capabilities:
- prepare exact financial transaction;
- show business rationale/reason codes;
- request approval;
- execute only after authorized approval;
- record approver and result.

Exit criteria:
```ini
ACCOUNTING_AGENT_MODE=APPROVAL
APPROVAL_POLICY=PASS
APPROVED_WRITE_TOOLS=QUALIFIED
```

### Phase B4 — Controlled AUTO
Target duration: 1–2 weeks of staged runtime qualification.

Start only with low-risk repetitive actions.

Possible first AUTO candidates:
- invoice generation from already-approved operational facts;
- standard material-consumption posting;
- routine stock movements;
- zero-difference reconciliations;
- routine customer receipts when source evidence is authoritative.

High-risk actions remain approval-gated until separately qualified:
- large supplier payments;
- write-offs;
- manual ledger adjustments;
- reversals;
- exceptional discounts;
- day close with discrepancies.

Exit criteria:
```ini
ACCOUNTING_AGENT_MODE=AUTO
AUTO_POLICY_LIMITS=SERVER_SIDE
AUTO_ACTIONS=WHITELIST_ONLY
HIGH_RISK_ACTIONS=APPROVAL_ONLY
```

### Phase B5 — Autonomous accounting operations
Target: approximately 4–6 weeks from active build start, depending on real-runtime qualification.

Target state:
```ini
EASYSTORE_ZERO_GOOGLE=PASS
ACCOUNTING_ENGINE=D1_AUTHORITATIVE
ACCOUNTING_AGENT=ACTIVE
ROUTINE_HUMAN_BOOKKEEPING=MINIMIZED
HUMAN_WORK=EXCEPTIONS_APPROVALS_PHYSICAL_FACTS
DAILY_CLOSE=AUTOMATABLE_WHEN_INTEGRITY_GATES_PASS
```

## Delivery targets

Practical targets:

```ini
USABLE_ZERO_GOOGLE_ACCOUNTING=10_TO_14_WORKING_DAYS
AI_OBSERVE_RECOMMEND=AROUND_2_WEEKS
AI_APPROVAL_WORKFLOWS=AROUND_3_WEEKS
CONTROLLED_AUTO_ACCOUNTING=AROUND_4_TO_6_WEEKS
```

These are engineering targets, not automatic completion promises; runtime drift, financial-contract defects, or integration failures may extend them.

## Mandatory execution policy

Every future step must be recorded in this file using this template:

```text
### Entry <ID> — <title>
- Date:
- Goal:
- Scope:
- Pre-state:
- Actions performed:
- Files/commits:
- CI/Run evidence:
- Runtime evidence:
- Data mutation:
- Production impact:
- Result: PASS / FAIL / BLOCKED
- Rollback/reversal:
- Post-state:
- Next gate:
```

No status may be marked PASS from source code alone when runtime proof is required.

## Separation policy

Accounting project records live here only.

Do not append Accounting execution entries to:
- `TrendOS_MASTER_BOOK.md`;
- TrendOS Zero-Google history;
- unrelated workshop/project books.

TrendOS should contain only the minimum integration contract necessary for its own runtime, while this book owns the accounting program lifecycle.

## Current next gate

```ini
STATUS=ACCOUNTING_MASTER_BOOK_ESTABLISHED
ROADMAP=RECORDED
LOGGING_POLICY=ACCOUNTING_BOOK_ONLY
NEXT_GATE=A0_ACCOUNTING_ONLY_PURGE
```

## Product operating model — locked

The accounting product will be built around an **exception-first AI operating model**.

### Owner experience

The owner is not expected to operate accounting screens routinely.

The primary owner experience is an **Owner Brief** that reports:
- accounting health;
- sales today;
- collections today;
- customer receivables;
- supplier obligations;
- cash forecast;
- material risk;
- profit/margin anomalies;
- automatic accounting movements;
- reconciliation status;
- exceptions that require approval.

The owner should drill into detailed screens only when needed.

### Employee experience

Employees should mainly provide facts the system cannot safely infer:
- physical stock count;
- actual received quantity;
- physical waste/scrap;
- off-system payment evidence;
- disputed transaction evidence;
- exception explanation;
- role-authorized approvals.

Facts already known to TrendOS must not be manually re-entered into EasyStore.

### Evidence rule

The Accounting Agent cannot treat AI inference or a chat message alone as proof of a financial fact.

Accepted evidence classes include:
- authoritative TrendOS event;
- deterministic accounting ledger fact;
- verified payment source;
- approved purchase receipt;
- authorized physical count;
- authorized human approval.

### Integrity Engine

Integrity validation is separate from AI.

Minimum controls:
```text
opening_cash + cash_in - cash_out = closing_cash
invoice_total - paid_amount = remaining_amount
opening_stock + stock_in - stock_out - waste = closing_stock
party_opening_balance + debits - credits = party_closing_balance
```

If an integrity check fails:
- no silent auto-correction;
- affected AUTO/day-close action fails closed;
- an exception is raised;
- discrepancy evidence is shown;
- reconciliation or authorized adjustment is required.

### Hard AI safety boundary

```ini
AI_LEDGER_AUTHORITY=NO
DIRECT_AI_DB_WRITE=NO
AI_INFERENCE_ALONE_IS_FINANCIAL_EVIDENCE=NO
CHAT_MESSAGE_ALONE_PROVES_PAYMENT=NO
DESTRUCTIVE_FINANCIAL_DELETE_AFTER_GO_LIVE=NO
```

The Agent always works through deterministic accounting tools.

## Entry ACC-001 — AI Accounting Agent product contract + safety policy
- Date: 2026-10-05
- Goal: Convert the agreed product direction into enforceable repo contracts before financial runtime migration.
- Scope: Repo-only architecture and CI. No Production/D1/Google mutation.
- Pre-state:
  - Accounting roadmap already established.
  - Target direction = AI Accounting Agent.
  - Default Accounting runtime remains READONLY / epoch 2.
- Actions performed:
  - Added machine-readable policy:
    - `docs/ACCOUNTING_AGENT_POLICY_V1.json`
  - Added product operating contract:
    - `docs/ACCOUNTING_AGENT_PRODUCT_CONTRACT_V1.md`
  - Added policy regression test:
    - `tests/accounting_agent_policy_v1.test.js`
  - Added dedicated CI:
    - `.github/workflows/easystore-accounting-agent-policy-ci.yml`
  - Locked:
    - Deterministic Accounting Engine as ledger authority.
    - AI direct DB write forbidden.
    - Agent default = OBSERVE.
    - Agent writes default OFF.
    - Evidence policy.
    - Integrity Engine fail-closed behavior.
    - Owner Brief target.
    - Human role = exceptions / approvals / physical facts.
    - Event-driven accounting model.
    - Initial Agent Tool Registry.
- Files/commits:
  - Policy commit: `0e4381cb9e36cf559497937c062ae6df91a517ef`
  - Product contract commit: `34551a4cef2852b9d48cd4e42f299061b0d0bdb0`
  - Policy test commit: `805e4911dc57748c5f9bc1bf610d835bcbb87785`
  - CI commit: `73f4066bcc48956a8dbbb048b8a639cdeac5ec29`
- CI/Run evidence:
  - Run: `37240790983`
  - Job: `111548931151`
  - Conclusion: **SUCCESS**
  - Evidence:
    ```ini
    ACCOUNTING_AGENT_POLICY_V1=PASS
    ACCOUNTING_AGENT_PRODUCT_CONTRACT_V1=PASS
    AI_LEDGER_AUTHORITY=NO
    DIRECT_AI_DB_WRITE=NO
    DEFAULT_AGENT_MODE=OBSERVE
    AGENT_WRITES=OFF
    PRODUCTION_MUTATION=NO
    D1_MUTATION=NO
    GOOGLE_MUTATION=NO
    ```
- Runtime evidence:
  - None required for this repo-only architecture gate.
  - Existing Production accounting runtime remains unchanged.
- Data mutation: NO.
- Production impact: NO.
- Result: **PASS**
- Rollback/reversal:
  - Repo-only; revert the commits if the product contract is intentionally replaced.
- Post-state:
  ```ini
  PRODUCT_DIRECTION=AI_ACCOUNTING_AGENT_LOCKED
  ACCOUNTING_ENGINE_AUTHORITY=DETERMINISTIC
  AI_LEDGER_AUTHORITY=NO
  DIRECT_AI_DB_WRITE=NO
  DEFAULT_AGENT_MODE=OBSERVE
  DEFAULT_AGENT_WRITES=OFF
  INTEGRITY_ENGINE=REQUIRED
  EVIDENCE_POLICY=REQUIRED
  OWNER_EXPERIENCE=EXCEPTION_FIRST_BRIEF
  HUMAN_ROLE=EXCEPTIONS_APPROVALS_PHYSICAL_FACTS
  ```
- Next gate:
  - `A0_ACCOUNTING_ONLY_PURGE`
  - After clean reset, implement Zero-Google deterministic read model while preserving this Agent contract.

## Updated project target

The finished program should behave like an accounting employee, not merely an accounting database/UI.

Target daily lifecycle:

`Operational facts arrive -> Agent interprets -> deterministic tools post/validate -> integrity checks run -> routine work completes -> only exceptions/approvals reach humans`

Final acceptance target:
> A normal workshop day completes without the owner manually entering routine accounting data, while every financial result stays deterministic, auditable, evidence-backed, policy-controlled, and reversible where required.

## Entry ACC-002 — A0 accounting-only purge preflight and Google dataset census
- Date: 2026-10-05
- Goal: Identify the exact Google accounting-only production dataset before destructive reset.
- Scope: Read-only discovery/census. No data mutation in this entry.
- Authorized deletion scope:
  - accounting business/configuration rows only;
  - preserve sheet schemas/header rows;
  - preserve TrendOS orders, order lines, customers, employees/users, attendance, customer conversations, operational logs and unrelated platform data.
- Production Google spreadsheet identified:
  - Title: `TrendOS_Operations_CLEAN_START_CUSTOMERS_ONLY`
  - Spreadsheet ID: `1PtsjF4oHfk__R8XheYjqlo3Rt1269rot6Q0hCU9_6bI`
- Accounting purge sheet scope:
  - every sheet prefixed `حسابات -`;
  - derived debt-block sheet `عملاء منع التسليم بالمديونية`;
  - `بنود تسعير الفاتورة` and other non-accounting operational/configuration sheets are explicitly out of purge scope.
- Pre-purge Google accounting rows observed:
  - حسابات - الخزنة: 1
  - حسابات - سجل المراجعة: 5
  - حسابات - كشف العملاء والموردين: 7
  - حسابات - الفواتير النهائية: 3
  - حسابات - فواتير الأقسام: 18
  - حسابات - الخامات: 2
  - حسابات - البنود الثابتة: 1
  - حسابات - مسودات الفواتير: 41
  - حسابات - أرشيف مسودات الفواتير: 4
  - all other targeted accounting sheets: 0 data rows
  - total observed targeted Google data rows: **82**
- Safety rule for purge:
  - clear values below row 1 only;
  - do not delete sheet tabs;
  - do not remove headers/schema/formatting;
  - do not touch non-target sheets.
- Data mutation: NO.
- Production impact: NO.
- Result: **PASS**
- Post-state:
  ```ini
  A0_GOOGLE_TARGET_IDENTIFIED=YES
  A0_GOOGLE_TARGETED_DATA_ROWS=82
  A0_NON_ACCOUNTING_SCOPE_EXCLUDED=YES
  A0_PURGE_AUTHORIZATION=YES
  ```
- Next gate:
  - `A0_GOOGLE_ACCOUNTING_ROWS_PURGE`

## Entry ACC-003 — A0 Google accounting-only business data purge
- Date: 2026-10-05
- Goal: Remove authorized accounting data from the production Google spreadsheet while preserving schemas and all non-accounting data.
- Scope:
  - 21 sheets prefixed `حسابات -`;
  - derived accounting sheet `عملاء منع التسليم بالمديونية`;
  - row 1/header preserved on every target sheet;
  - sheet tabs, formatting/schema and all out-of-scope sheets preserved.
- Pre-state:
  - Target spreadsheet: `TrendOS_Operations_CLEAN_START_CUSTOMERS_ONLY`.
  - Targeted accounting rows observed: 82.
- Actions performed:
  - Cleared `userEnteredValue` for rows below the header on exactly 22 approved target sheets.
  - No sheet tab was deleted.
  - No non-accounting sheet was included in the mutation request.
- Verification:
  - Re-read all 22 target ranges after mutation.
  - Remaining targeted accounting data rows: **0**.
- Data mutation: **YES — authorized accounting-only Google data purge**.
- Production impact:
  - Accounting historical/configuration rows in target accounting sheets were reset.
  - TrendOS orders, order lines, customers, employees/users, attendance, conversations and unrelated platform sheets were not in the mutation scope.
- Result: **PASS**
- Post-state:
  ```ini
  A0_GOOGLE_ACCOUNTING_BUSINESS_ROWS=0
  A0_GOOGLE_TARGET_SHEETS=22
  A0_HEADERS_PRESERVED=YES
  A0_SHEETS_DELETED=NO
  A0_NON_ACCOUNTING_MUTATION=NO
  ```
- Rollback/reversal:
  - This was an explicitly authorized destructive reset; no accounting data restore is required.
  - Google file version history remains provider-managed, but the project target is a clean accounting baseline.
- Next gate:
  - `A0_D1_ACCOUNTING_BUSINESS_DATA_PURGE`

## Entry ACC-004A — A0 D1 purge first controlled attempt blocked before mutation
- Date: 2026-10-05
- Goal: Purge D1 accounting business data with pre/post invariance checks.
- Controlled workflow:
  - TrendOS dependency workflow: `.github/workflows/easystore-a0-d1-accounting-purge-controlled.yml`
  - Commit: `005f72dc1dbafa95df1eaae16b0a99c035620660`
  - Run: `37242097846`
  - Job: `111552705434`
- Preflight evidence:
  ```ini
  A0_D1_PREFLIGHT=PASS
  A0_D1_MODE=READONLY
  ```
- Failure:
  - The first design attempted a count snapshot across 66 non-accounting tables in one compound D1 query.
  - That census command exited with code 1 during the **Snapshot before purge** step.
  - The destructive purge step was automatically skipped.
- Data mutation:
  - D1 accounting purge: **NO**
  - Non-accounting D1 mutation: **NO**
- Production impact: NO.
- Result: **BLOCKED_SAFE**
- Safety conclusion:
  - Fail-closed behavior worked correctly.
  - No destructive D1 command ran after the snapshot failure.
- Remediation:
  - Replace the oversized all-table invariance query with a bounded set of high-value non-accounting sentinel tables while keeping the purge SQL accounting-scoped only.
- Next gate:
  - `A0_D1_ACCOUNTING_PURGE_RETRY_CONTROLLED`

## Entry ACC-004B — A0 D1 purge retry 2 blocked before mutation
- Date: 2026-10-05
- Goal: Retry the D1 accounting-only purge with a bounded sentinel census.
- Controlled workflow:
  - TrendOS dependency workflow: `.github/workflows/easystore-a0-d1-accounting-purge-controlled.yml`
  - Commit: `4977737a0c199dbcdb6157d96f7fd4e481bae4a1`
  - Run: `37242234691`
  - Job: `111553089586`
- Preflight evidence:
  ```ini
  A0_D1_PREFLIGHT=PASS
  A0_D1_MODE=READONLY
  ```
- Failure:
  - The bounded snapshot still failed at the first combined D1 count command before any purge step.
  - Destructive purge and post-verification steps were skipped by GitHub Actions.
- Data mutation:
  - D1 accounting purge: **NO**
  - Non-accounting D1 mutation: **NO**
- Production impact: NO.
- Result: **BLOCKED_SAFE**
- Safety conclusion:
  - Fail-closed guard worked again.
  - Accounting remained READONLY.
- Remediation:
  - Replace combined/compound count SQL with one-table-at-a-time D1 count queries after discovering existing table names from `sqlite_master`.
- Next gate:
  - `A0_D1_ACCOUNTING_PURGE_RETRY_3_CONTROLLED`

## Entry ACC-004C — A0 D1 accounting-only purge completed
- Date: 2026-10-05
- Goal: Complete the authorized D1 accounting-only reset with fail-closed guards and non-accounting invariance evidence.
- Controlled workflow:
  - Dependency repo: `fawakhry/TrendOs`
  - Workflow: `.github/workflows/easystore-a0-d1-accounting-purge-controlled.yml`
  - Commit: `06c11f1520564ebe3d4c0eba5bc010696a31d054`
  - Run: `37242359626`
  - Job: `111553440473`
  - Conclusion: **SUCCESS**
- Preflight evidence:
  ```ini
  A0_D1_PREFLIGHT=PASS
  A0_D1_MODE=READONLY
  A0_D1_TABLE_DISCOVERY=PASS
  A0_D1_TABLE_COUNT=77
  A0_D1_REQUIRED_ACCOUNTING_TABLES=PASS
  ```
- Pre-purge accounting data census:
  ```ini
  request_ledger=0
  materials=2
  templates=1
  dept_lines=18
  final_invoices=3
  party_ledger=7
  stock_moves=0
  events=0
  legacy_accounting_rows=2
  parity_accounting_rows=0
  TOTAL=33
  ```
- Non-accounting sentinels checked before and after:
  - customers
  - orders
  - t12_customers
  - employee_auth_users_v1
  - employee_core_orders_v1
  - employee_core_lines_v1
  - employee_attendance_days_v1
  - employee_hr_employees_v1
  - employee_zero_google_backfill_runs_v1
- Actions performed:
  - deleted authorized rows from the eight native accounting business/ledger tables;
  - deleted only accounting-source rows from legacy-row retention;
  - deleted only accounting-family parity rows;
  - reset `employee_accounting_events_v1` sequence;
  - reset `next_invoice_number=1`;
  - preserved the accounting control row, READONLY mode and policy epoch.
- Post-verification:
  ```ini
  A0_D1_ACCOUNTING_ROWS_POST=0
  A0_D1_NON_ACCOUNTING_SENTINELS_INVARIANT=PASS
  A0_D1_ACCOUNTING_MODE_PRESERVED=READONLY
  A0_D1_POLICY_EPOCH_PRESERVED=2
  A0_D1_NEXT_INVOICE_NUMBER=1
  A0_D1_PURGE_VERIFICATION=PASS
  A0_D1_POST_HEALTH=PASS
  A0_D1_SCHEMA_READY=YES
  A0_D1_AUTHORITATIVE_WRITES=NO
  ```
- Data mutation: **YES — explicitly authorized accounting-only D1 reset**.
- Production impact:
  - Accounting D1 business rows were reset to a clean baseline.
  - Non-accounting sentinel counts were invariant.
  - Accounting write authority stayed disabled.
- Result: **PASS**
- Rollback/reversal:
  - No data restoration is required; the owner explicitly chose a clean accounting start.
  - Schema/control remain intact for rebuild.
- Next gate:
  - `A0_FINAL_CROSS_STORE_VERIFICATION`

## Entry ACC-005 — Phase A0 accounting reset closed
- Date: 2026-10-05
- Goal: Prove the authorized accounting-only reset is complete across Google and D1 before starting the new deterministic read model.
- Final Google verification:
  - 22 approved target sheets re-read after the D1 purge.
  - Remaining accounting data rows below headers: **0**.
  - Headers/sheets remain present.
- Final D1 verification:
  - accounting business data rows: **0**;
  - schema ready: YES;
  - mode: READONLY;
  - policy epoch: 2;
  - authoritative writes: NO;
  - non-accounting sentinels invariant.
- Phase exit criteria:
  ```ini
  ACCOUNTING_PURGE=PASS
  D1_ACCOUNTING_BUSINESS_ROWS=0
  GOOGLE_ACCOUNTING_BUSINESS_ROWS=0
  GOOGLE_ACCOUNTING_TARGET_SHEETS=22
  NON_ACCOUNTING_SENTINEL_DRIFT=NO
  ACCOUNTING_SCHEMA_PRESERVED=YES
  ACCOUNTING_MODE=READONLY
  ACCOUNTING_POLICY_EPOCH=2
  ACCOUNTING_AUTHORITATIVE_WRITES=NO
  ```
- Data mutation:
  - Google accounting-only reset: YES, authorized.
  - D1 accounting-only reset: YES, authorized.
  - Non-accounting mutation: no evidence; bounded sentinel invariance PASS and Google mutation scope was exact.
- Result: **PASS**
- Post-state:
  ```ini
  PHASE_A0=PASS
  ACCOUNTING_BASELINE=CLEAN
  LEGACY_ACCOUNTING_DATA_REQUIRED=NO
  NEXT_PHASE=A1_ZERO_GOOGLE_READ_MODEL
  ```
- Next gate:
  - `A1_READ_MODEL_CONTRACT_AND_SOURCE_ISOLATION`

## Entry ACC-006 — A1 Zero-Google read-model contract established
- Date: 2026-10-05
- Goal: Start Phase A1 by converting the legacy EasyStore accounting reads into an explicit D1-only migration contract.
- Scope: Repo-only source contract and CI; no Production/D1/Google mutation in this entry.
- Actions performed:
  - Added `docs/ACCOUNTING_READ_MODEL_V1.json`.
  - Added `tests/accounting_read_model_v1.test.js`.
  - Extended the Accounting Architecture CI to qualify both Agent policy and A1 read-model coverage.
- Contract decisions:
  - D1 is the target authority for every accounting read.
  - Google/Apps Script business reads must be zero at A1 exit.
  - customer master source = `t12_customers`;
  - financial balances source = `employee_accounting_party_ledger_v1`;
  - stable entity IDs are mandatory;
  - AI direct database access remains forbidden.
- Read migration order:
  ```text
  A1.1 core customer + health reads
  A1.2 party master + supplier reads
  A1.3 deterministic quote calculation
  A1.4 reports + automation preview reads
  A1.5 frontend D1-only read router
  A1.6 Production cutover + Google-read-zero proof
  ```
- Files/commits:
  - Read model: `e2b521c9b153d2e3e0a5b668f516cc3798c30cad`
  - Coverage test: `0e3d08c99d0ffec3a0e0679d0e20e8df72af4bb9`
  - CI update: `f5667289b711bf3c1689dd5422d3303016339359`
- CI/Run evidence:
  - Run: `37242695802`
  - Job: `111554396405`
  - Conclusion: **SUCCESS**
- Data mutation: NO.
- Production impact: NO.
- Result: **PASS**
- Post-state:
  ```ini
  PHASE_A1=STARTED
  A1_READ_MODEL_CONTRACT=PASS
  TARGET_READ_AUTHORITY=D1
  TARGET_APPS_SCRIPT_ACCOUNTING_READS=0
  TARGET_GOOGLE_BUSINESS_READS=0
  ```
- Next gate:
  - `A1_1_CORE_CUSTOMER_AND_HEALTH_READS`

## Entry ACC-007A — A1.1 core-read CI first attempt blocked safely
- Date: 2026-10-05
- Goal: Qualify source for four new D1 accounting reads.
- Source change:
  - Dependency repo: `fawakhry/TrendOs`
  - `cloudflare-d1/src/employee-accounting-native-v1.mjs`
  - Commit: `5478dcc0fc1d405ce9416764156bd66d2af255a9`
  - Added READONLY actions:
    - `getEasyStoreCustomers`
    - `searchCustomers`
    - `getCustomerAccountV1915`
    - `easyStoreSystemHealth`
  - customer master source = `t12_customers`;
  - balance source = `employee_accounting_party_ledger_v1`.
- Test/CI:
  - Test commit: `1108db28abaaa69eae718b09713c10d541a80544`
  - CI commit: `ce3e5024e5dd32429b18b28f4c32177023c8e84b`
  - Run: `37242867207`
  - Job: `111554878111`
- Failure:
  - source syntax and existing Entry614 tests passed;
  - new source test failed because its READ_ACTIONS regex incorrectly depended on action ordering;
  - implementation itself was not shown defective by this failure.
- Data mutation: NO.
- Production impact: NO.
- Result: **BLOCKED_SAFE**
- Remediation:
  - make the test order-independent.

## Entry ACC-007B — A1.1 core D1 read source qualified
- Date: 2026-10-05
- Goal: Qualify the corrected A1.1 core-read source gate.
- Test fix commit:
  - `42f01cdb7119304c991801c8a558d489f420c5c9`
- CI evidence:
  - Run: `37242893892`
  - Job: `111554956498`
  - Conclusion: **SUCCESS**
- Qualified read actions:
  ```text
  getEasyStoreCustomers
  searchCustomers
  getCustomerAccountV1915
  easyStoreSystemHealth
  ```
- Design evidence:
  - no SpreadsheetApp/DriveApp/PropertiesService dependency in the D1 accounting module;
  - stable `customerId` is returned from `t12_customers.customer_id`;
  - customer balances/transactions use `employee_accounting_party_ledger_v1`;
  - system health explicitly marks purchase/custody/day-close domains as partial until their D1 schema is built.
- Data mutation: NO.
- Production impact: NO.
- Result: **PASS — SOURCE QUALIFIED, NOT YET DEPLOYED**
- Post-state:
  ```ini
  A1_1_CORE_READ_SOURCE=PASS
  A1_1_PRODUCTION_DEPLOYED=NO
  A1_1_FRONTEND_ROUTED=NO
  ACCOUNTING_MODE=READONLY
  ```
- Next gate:
  - `A1_1_CORE_READ_API_DEPLOY_CONTROLLED`

## Connector-first integration rule

From this point forward, EasyStore is built on the assumption that **Autonomous Printshop / TrendOS will integrate through a dedicated Finance Connector**.

The connector is a hard system boundary:

```text
TrendOS / Autonomous Printshop
        |
        v
Versioned Finance Connector
        |
        v
EasyStore Agent + Policy
        |
        v
Deterministic Accounting Tools
        |
        v
D1 Financial Ledger
```

Rules:
- EasyStore remains the financial authority.
- Autonomous Printshop remains operational authority for orders/tasks/production facts.
- no direct Autonomous Printshop write to EasyStore D1;
- no shared-table integration as an API;
- no browser dual-write;
- no AI direct database write;
- every event/command is versioned and idempotent;
- every mutation-capable request goes through EasyStore policy and deterministic tools;
- connector rollout is `OFF -> SHADOW -> READONLY -> CANARY -> GENERAL`;
- the Connector may transport a payment reference, but payment is not financially posted until EasyStore verifies acceptable evidence.

Canonical connector contracts:
- `docs/ACCOUNTING_CONNECTOR_CONTRACT_V1.json`
- `docs/ACCOUNTING_AUTONOMOUS_PRINTSHOP_CONNECTOR_V1.md`

This aligns with Autonomous Printshop Build Matrix module:
`M20 — EasyStore Finance Adapter`.

## Entry ACC-008 — Autonomous Printshop Finance Connector boundary locked
- Date: 2026-10-05
- Goal: Make the EasyStore build connector-first so it can plug into Autonomous Printshop without merging accounting and operational authorities.
- Scope: Repo-only architecture contract + regression CI. No Production/D1/Google mutation.
- Pre-state:
  - Autonomous Printshop master book defines EasyStore as separate finance authority and M20 as the Finance Adapter.
  - EasyStore Agent architecture was already deterministic-ledger-first.
- Actions performed:
  - Added machine-readable connector contract:
    - `docs/ACCOUNTING_CONNECTOR_CONTRACT_V1.json`
  - Added human-readable connector contract:
    - `docs/ACCOUNTING_AUTONOMOUS_PRINTSHOP_CONNECTOR_V1.md`
  - Added regression test:
    - `tests/accounting_connector_contract_v1.test.js`
  - Extended Accounting Architecture CI to lock the connector boundary.
  - Updated this book's target flow to include the Finance Connector explicitly.
- Locked design:
  ```ini
  EASYSTORE_FINANCIAL_AUTHORITY=YES
  AUTONOMOUS_PRINTSHOP_FINANCIAL_AUTHORITY=NO
  DIRECT_CROSS_SYSTEM_DB_WRITE=NO
  SHARED_TABLES_AS_CROSS_SYSTEM_API=NO
  BROWSER_DUAL_WRITE=NO
  AI_DIRECT_DB_WRITE=NO
  CONNECTOR_DEFAULT_MODE=OFF
  CONNECTOR_DELIVERY=AT_LEAST_ONCE_WITH_IDEMPOTENT_CONSUMER
  CONNECTOR_ROLLOUT=OFF_SHADOW_READONLY_CANARY_GENERAL
  ```
- Inbound connector facts include:
  - order/line lifecycle;
  - production completion;
  - confirmed material consumption;
  - confirmed waste;
  - purchase receipt evidence;
  - physical stock count;
  - delivery state;
  - payment reference for verification, not automatic proof.
- Outbound finance facts include:
  - invoice state;
  - customer/supplier balance changes;
  - verified payment postings;
  - financial holds;
  - cost/profit snapshots;
  - accounting exceptions;
  - day-close result.
- Files/commits:
  - Machine contract: `c88037c72ec6aad29cc1a178ff82979d2d22c68c`
  - Human contract: `3553e030091e2bf27a48f93d416b35e05e35f0b1`
  - Test: `f1f09b2e03c1b397dc7b40aaa3c23b6df83c084a`
  - CI: `4fab8503252da11c9a4bdecf50edfffa1790b6a4`
- CI/Run evidence:
  - Run: `37244137748`
  - Job: `111558545079`
  - Conclusion: **SUCCESS**
- Runtime evidence:
  - Not required for this repo-only contract gate.
  - Connector remains OFF/not deployed.
- Data mutation: NO.
- Production impact: NO.
- Result: **PASS**
- Post-state:
  ```ini
  BUILD_MODEL=CONNECTOR_FIRST
  FINANCE_CONNECTOR_CONTRACT=PASS
  CONNECTOR_RUNTIME=OFF
  EASYSTORE_FINANCIAL_AUTHORITY=YES
  AUTONOMOUS_PRINTSHOP_FINANCIAL_AUTHORITY=NO
  ```
- Next gate:
  - continue `A1_1_CORE_READ_API_DEPLOY_CONTROLLED`;
  - every new accounting read/write/event must expose a connector-safe contract where cross-system use is expected.

## Entry ACC-009 — A1 current Production truth refreshed
- Date: 2026-10-05
- Goal: Refresh the real runtime state before any A1 Production cutover so stale Entry614/Entry619 assumptions do not drive deployment.
- Scope: Read-only runtime audit only.
- Dependency workflow:
  - Repo: `fawakhry/TrendOs`
  - Workflow: `.github/workflows/easystore-a1-current-runtime-preflight.yml`
  - Initial workflow commit: `161ccaad85589007bc39a34468fe9f8b33f71407`
  - Exact EasyStore read-set detection correction: `55d283de2e14cafb66527c160006b112cd047c06`
  - Run: `37244971391`
  - Job: `111560935274`
  - Result: **SUCCESS**
- Runtime truth:
  ```ini
  API_VERSION=22201b84-6bff-41be-8ce5-b2f6382aa0db
  UI_VERSION=bfcc6f85-a748-4b66-a334-b605c72108f7

  AUTH_MODE=OFF
  AUTH_ENV_ENABLED=false

  BRIDGE_ENABLED=false
  BRIDGE_SECRET_CONFIGURED=true
  BRIDGE_POLICY_COUNT=17

  OPS_MODE=GENERAL
  OPS_POLICY_EPOCH=7

  ACCOUNTING_MODE=READONLY
  ACCOUNTING_POLICY_EPOCH=2
  ACCOUNTING_SCHEMA_READY=true
  ACCOUNTING_AUTHORITATIVE_WRITES=false
  ACCOUNTING_GOOGLE_BUSINESS_CALLS=0

  CONTENT_MODE=OFF
  COMMS_MODE=OFF
  CORE_MODE=OFF

  TRENDOS_UI_ACCOUNTING_READONLY=true
  EASYSTORE_D1_READONLY_FLAG=true
  EASYSTORE_APPS_SCRIPT_FALLBACK=true
  EASYSTORE_D1_READ_SET=getAccounting,getDeptInvoiceDraftV1887,getPartyAccountV1858
  EASYSTORE_D1_CORE_4_ROUTED=false
  ```
- Important correction:
  - older source qualification workflows still expect historical runtime states such as Accounting=OFF or Bridge policy count=0;
  - those failures are classified as stale-runtime-assumption failures, not current accounting implementation failures;
  - all further A1 controlled deployment gates must lock against the runtime truth above.
- Data mutation: NO.
- Production impact: NO.
- Result: **PASS**
- Post-state:
  ```ini
  A1_RUNTIME_TRUTH_REFRESHED=YES
  CURRENT_ACCOUNTING=READONLY_EPOCH_2
  CURRENT_EASYSTORE_D1_READ_ACTIONS=3
  CURRENT_EASYSTORE_APPS_SCRIPT_FALLBACK=YES
  ```
- Next gate:
  - `A1_1_FRONTEND_CORE_READ_ROUTER_SOURCE`

## Entry ACC-010 — A1.1 EasyStore frontend core-read router qualified
- Date: 2026-10-05
- Goal: Route the four newly qualified A1 core accounting reads through the D1 READONLY path in EasyStore source.
- Scope: Repo-only frontend routing + regression CI. No Production deployment in this entry.
- Actions performed:
  - Expanded `D1_ACCOUNTING_READ_ACTIONS` in `app.js` from 3 to 7 actions.
  - Added:
    - `getCustomerAccountV1915`
    - `getEasyStoreCustomers`
    - `searchCustomers`
    - `easyStoreSystemHealth`
  - Financial write actions remain outside the D1 READONLY set.
  - Added dedicated source regression test and CI.
- Files/commits:
  - Router source: `43f563cd18a57592b7d2a80dec3d9a97c4f99188`
  - Router test: `2532ea1baa9c23cd491bea7eff3b172a497e7654`
  - CI: `39c3a5d9a8d54726ba52a28c471a0957d645dcec`
- CI/Run evidence:
  - Run: `37245060945`
  - Job: `111561202621`
  - Conclusion: **SUCCESS**
  - Evidence:
    ```ini
    EASYSTORE_A1_CORE_READ_ROUTER_SOURCE=PASS
    D1_READ_ACTION_COUNT=7
    NEW_A1_CORE_READ_ACTIONS=4
    FINANCIAL_WRITES_REROUTED=NO
    PRODUCTION_MUTATION=NO
    ```
- Runtime evidence:
  - Source-qualified only.
  - Production EasyStore still has the old 3-action D1 read set until controlled cutover.
- Data mutation: NO.
- Production impact: NO.
- Result: **PASS — SOURCE QUALIFIED**
- Post-state:
  ```ini
  A1_1_FRONTEND_ROUTER_SOURCE=PASS
  A1_1_FRONTEND_PRODUCTION=NOT_YET
  A1_1_API_SOURCE=PASS
  ACCOUNTING_RUNTIME=READONLY_EPOCH_2
  ```
- Next gate:
  - `A1_2_PARTY_MASTER_AND_SUPPLIER_READS`

