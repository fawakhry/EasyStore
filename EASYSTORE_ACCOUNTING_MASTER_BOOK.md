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

`TrendOS operational facts -> Accounting Agent -> deterministic accounting tools -> D1 financial ledgers -> audited result`

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

