# EasyStore Zero-Google Audit Book

Date: 2026-10-04  
Repository: `fawakhry/EasyStore`  
Audit branch: `candidate/easystore-zero-google-audit-20261004`  
Baseline main commit: `41c522d0d63b1897394bedfe836b975d5119bca2`

## Rule

`Runtime truth > deployed > tested > repo-only > historical`

This audit is read-only with respect to Production business data. Repository-only audit files and CI are allowed. No accounting write cutover is authorized by this entry.

## Current product baseline

- EasyStore version: `ES47 V1922 Unified Safe Build`.
- Frontend production source is served from GitHub Pages.
- Secure TrendOS SSO handoff exists.
- Accounting D1 route configured:
  - `https://trendos-d1-api.trendmall-contact.workers.dev/v1/employee/accounting`
- `EASYSTORE_ACCOUNTING_D1_READONLY=true`.
- Generic fallback endpoint is still the Google Apps Script Web App:
  - `TREND_API_URL=https://script.google.com/macros/s/.../exec`
- `MATBAGY_SECURE_API_PROXY_URL` is empty.

Therefore EasyStore is **hybrid**, not Zero-Google.

## Current routing truth

The frontend sends only actions present in:

`D1_ACCOUNTING_READ_ACTIONS = { getAccounting, getDeptInvoiceDraftV1887, getPartyAccountV1858 }`

to D1.

Every other `api(action,...)` call falls through to:

`MATBAGY_SECURE_API_PROXY_URL || TREND_API_URL`

which currently resolves to Apps Script.

### Important UI fact

The message:

`تم التحديث من الشيتات`

is hard-coded after a successful `load()`. It is not evidence that `getAccounting` was served by Google Sheets.

## Frontend action inventory

Machine-readable source of truth:

`docs/EASYSTORE_ZERO_GOOGLE_ACTION_INVENTORY_20261004.json`

Current `app.js` contains **33 distinct literal API actions**.

### D1 route already implemented in the backend

The current TrendOS D1 accounting handler implements:

Reads:
- `getAccounting`
- `getDeptInvoiceDraftV1887`
- `getPartyAccountV1858`

Writes:
- `approveAccountingDeptInvoice`
- `saveAccountingDeptLine`
- `saveAccountingFinalInvoice`
- `saveAccountingMaterial`
- `saveAccountingTemplate`
- `savePartyLedgerTransaction`

But Production Accounting control is currently `READONLY`, so write-shaped requests must remain fail-closed.

### EasyStore calls that are still Apps Script-backed

Examples include:
- `getEasyStoreCustomers`
- `getEasyStoreSuppliers`
- `getCustomerAccountV1915`
- `getDailyDepartmentReportV1920`
- `previewAccountingAutomationV1921`
- `searchCustomers`
- purchases
- sales
- suppliers
- custody
- department purchases
- day close
- waste
- automation
- reconciliation
- reversal
- health

So even if `getAccounting` is D1-backed, a normal EasyStore session still performs Google-backed reads and all current EasyStore writes remain on Apps Script.

## Google authority still present

`Code.gs` remains the historical accounting backend and contains extensive `SpreadsheetApp` usage.

The Apps Script implementation includes:
- accounting dashboard/read model;
- final invoices;
- purchases;
- suppliers;
- customer accounts;
- party ledger;
- materials/templates;
- department purchases;
- custody;
- day close;
- waste;
- reconciliation;
- accounting automation;
- authorization/session helpers.

Therefore Google Sheets / Apps Script must still be treated as live authority for the capabilities not cut over to D1.

## D1 accounting schema already available

Migration `0015_employee_accounting_zero_google_v1.sql` defines native accounting tables including:

- `employee_accounting_control_v1`
- `employee_accounting_request_ledger_v1`
- `employee_accounting_materials_v1`
- `employee_accounting_templates_v1`
- `employee_accounting_dept_lines_v1`
- `employee_accounting_final_invoices_v1`
- `employee_accounting_party_ledger_v1`
- `employee_accounting_stock_moves_v1`
- `employee_accounting_events_v1`

The native Accounting health contract reports schema readiness from six core business tables and exposes current mode / policy epoch.

## Data truth — intentionally unresolved

The following must **not** be guessed from the UI showing zeros:

```ini
D1_ACCOUNTING_ROW_COUNTS=NOT_VERIFIED
GOOGLE_ACCOUNTING_ROW_COUNTS=NOT_VERIFIED
HISTORICAL_ACCOUNTING_DATA_EXISTENCE=NOT_VERIFIED
DATASET_RECONCILIATION=NOT_VERIFIED
MIGRATION_COMPLETENESS=NOT_VERIFIED
```

A zero-valued dashboard can mean an empty current dataset. It does not prove there was never historical accounting data.

## Audit conclusion

```ini
EASYSTORE_ZERO_GOOGLE=NO
EASYSTORE_RUNTIME_ARCHITECTURE=HYBRID
SSO_HANDOFF=IMPLEMENTED
D1_ACCOUNTING_MODE=READONLY_EXPECTED
D1_ACCOUNTING_READ_ROUTER=PARTIAL
APPS_SCRIPT_READ_DEPENDENCIES=YES
APPS_SCRIPT_WRITE_AUTHORITY=YES
D1_WRITE_IMPLEMENTATION=PARTIAL_DORMANT
ACCOUNTING_DATA_RECONCILIATION=PENDING
```

## Safe migration order

1. **Runtime proof first**
   - confirm live Pages build;
   - confirm D1 Accounting health = READONLY;
   - confirm unauthenticated reads fail with 401;
   - confirm write-shaped requests fail with 503 in READONLY;
   - obtain one real authenticated EasyStore `getAccounting` HTTP 200.

2. **Read-only data census**
   - count each accounting dataset in Google Sheets;
   - count corresponding D1 entities;
   - compare stable keys, totals and date ranges;
   - record missing/extra rows without writing either side.

3. **Finish read cutover**
   - customers;
   - suppliers;
   - customer/party accounts;
   - reports;
   - automation preview;
   - health/search/read helpers.

4. **Write cutover by capability**
   - only one domain at a time;
   - require idempotency;
   - reconcile before/after;
   - retain fail-closed rollback;
   - never promote all writes at once.

5. **Remove Google authority**
   - only after all required reads/writes reconcile;
   - remove Apps Script fallback from EasyStore;
   - prove `GOOGLE_BUSINESS_CALLS=0`;
   - then declare `EASYSTORE_ZERO_GOOGLE=PASS`.

## Entry ES-ZG-001 registration

```ini
STATUS=EASYSTORE_ZERO_GOOGLE_READONLY_AUDIT_STARTED
BASELINE_COMMIT=41c522d0d63b1897394bedfe836b975d5119bca2
AUDIT_BRANCH=candidate/easystore-zero-google-audit-20261004
APP_LITERAL_API_ACTIONS=33
D1_NATIVE_READ_ACTIONS=3
D1_NATIVE_WRITE_ACTIONS=6
CURRENT_FRONTEND_D1_MODE=READONLY_ROUTING_ONLY
GENERIC_FALLBACK=APPS_SCRIPT
PRODUCTION_BUSINESS_DATA_MUTATION=NO
NEXT_GATE=PUBLIC_RUNTIME_HEALTH_AND_FAIL_CLOSED_AUDIT
```

## ES-ZG-001 runtime result

Workflow:
`.github/workflows/easystore-es-zg-001-runtime-audit.yml`

Run:
`37233448156`

Job:
`111527773725`

Conclusion: **SUCCESS**

Observed live GitHub Pages:
```ini
LIVE_PAGES_BUILD=PASS
LIVE_D1_READONLY_FLAG=YES
LIVE_APPS_SCRIPT_FALLBACK=YES
LIVE_SECURE_PROXY_CONFIGURED=NO
```

Observed public D1 accounting health:
```ini
D1_HEALTH_SUCCESS=true
D1_SCHEMA_READY=true
D1_MODE=READONLY
D1_POLICY_EPOCH=2
D1_AUTHORITATIVE_WRITES=false
D1_GOOGLE_BUSINESS_CALLS=0
D1_APPS_SCRIPT_BUSINESS_AUTHORITY=false
```

Fail-closed proof:
```ini
UNAUTH_GET_ACCOUNTING_HTTP=401
UNAUTH_GET_ACCOUNTING_CODE=employee-session-rejected
WRITE_SHAPED_HTTP=503
WRITE_SHAPED_CODE=employee-accounting-readonly
PRODUCTION_BUSINESS_DATA_MUTATION=NO
```

Interpretation:
- D1 Accounting endpoint is live and schema-ready.
- Accounting remains correctly READONLY.
- Unauthenticated reads are rejected.
- Writes are blocked before authentication while READONLY.
- EasyStore live Pages still keeps Apps Script as generic fallback.
- This workflow cannot prove a real authenticated EasyStore `getAccounting` HTTP 200 because it intentionally holds no employee session/token.
- D1 row counts and Google Sheet row counts remain unverified.

Updated registration:
```ini
STATUS=ES_ZG_001_PUBLIC_RUNTIME_AUDIT_PASS
AUDIT_RUN=37233448156
AUDIT_JOB=111527773725
APP_LITERAL_API_ACTIONS=33
FRONTEND_D1_READ_ACTIONS=3
D1_SCHEMA_READY=YES
D1_MODE=READONLY
D1_POLICY_EPOCH=2
UNAUTH_READ_FAIL_CLOSED=PASS
READONLY_WRITE_FAIL_CLOSED=PASS
AUTHENTICATED_D1_READ_200=PENDING
D1_ROW_COUNTS=PENDING
GOOGLE_ROW_COUNTS=PENDING
DATASET_RECONCILIATION=PENDING
EASYSTORE_ZERO_GOOGLE=NO
NEXT_GATE=AUTHENTICATED_D1_READ_200_THEN_READONLY_GOOGLE_VS_D1_DATA_CENSUS
```

## Product direction update — EasyStore becomes an AI Accounting Agent

Decision date: 2026-10-05

EasyStore is no longer treated as a conventional accounting UI that depends on humans to enter, review, and close every accounting operation.

The target product is:

`EASYSTORE_AI_ACCOUNTING_AGENT`

The program must be designed so that, over time, AI operates the accounting workflow and humans handle only exceptions, approvals, physical facts that cannot be inferred automatically, and legally/financially sensitive overrides.

### Core architectural rule

AI must **not** be the mathematical or ledger authority.

The system is split into two layers:

1. **Deterministic Accounting Engine**
   - canonical source of truth for balances, invoices, receivables, payables, stock, cost, profit, treasury and closing;
   - server-authoritative;
   - idempotent financial writes;
   - append-only audit/reversal model where appropriate;
   - stable entity IDs;
   - no free-form AI arithmetic as ledger truth.

2. **AI Accounting Agent**
   - understands events and business context;
   - chooses allowed accounting tools;
   - explains recommendations and decisions;
   - detects anomalies and missing facts;
   - executes only within explicit policy;
   - never bypasses Accounting Engine validation.

The controlling rule is:

`AI decides what to do -> deterministic tools decide whether/how it is valid -> ledger records the factual result.`

### Event-driven operating model

TrendOS and workshop operations should emit canonical events such as:

- order_created
- order_line_approved
- production_started
- material_consumed
- waste_recorded
- purchase_recorded
- purchase_received
- supplier_payment_recorded
- customer_payment_recorded
- invoice_closed
- order_delivered
- refund_or_reversal_requested
- day_close_requested

EasyStore consumes these events and turns them into accounting proposals or automatic accounting actions according to policy.

Manual re-entry of facts already known to TrendOS should be eliminated.

### Agent Tool Registry

The Accounting Agent must use explicit tools rather than direct database access.

Initial target tools include:

- get_accounting_summary
- get_customer_balance
- get_supplier_balance
- get_party_ledger
- get_open_invoices
- get_open_payables
- create_sales_invoice
- record_customer_payment
- create_purchase
- record_supplier_payment
- post_stock_movement
- post_material_consumption
- post_waste
- close_department_day
- close_accounting_day
- reconcile_customer
- reconcile_supplier
- reconcile_cashbox
- reverse_financial_transaction
- calculate_job_cost
- calculate_line_profit
- forecast_cash
- forecast_material_needs
- detect_accounting_anomalies
- explain_accounting_change

Each tool must have:

- stable input/output contract;
- authorization policy;
- idempotency key where it can write;
- audit event;
- dry-run/preview mode where relevant;
- explicit failure codes;
- no hidden Google dependency.

### Autonomy Policy

Every Agent tool/action must be assigned an autonomy level.

```ini
AUTONOMY_OBSERVE=1
AUTONOMY_RECOMMEND=2
AUTONOMY_APPROVAL=3
AUTONOMY_AUTO=4
```

#### Level 1 — OBSERVE
AI reads and explains only.

Examples:
- daily accounting summary;
- customer/supplier balances;
- anomaly detection;
- profit analysis;
- stock-risk detection.

#### Level 2 — RECOMMEND
AI proposes an accounting action but does not execute.

Examples:
- suggested customer collection;
- suggested supplier payment;
- suggested stock purchase;
- suggested classification/reconciliation.

#### Level 3 — APPROVAL
AI prepares the exact transaction and executes only after authorized human approval.

Examples:
- high-value supplier payments;
- reversals;
- manual ledger corrections;
- exceptional discounts;
- write-offs.

#### Level 4 — AUTO
AI executes automatically within policy limits.

Examples after qualification:
- invoice generation from approved operational facts;
- posting material consumption from confirmed production;
- low-risk routine receipts;
- standard stock movements;
- daily reconciliations with no discrepancy;
- automatic day close when every gate passes.

No capability may move to a higher autonomy level without runtime evidence, limits, rollback/reversal design, and recorded approval policy.

### Financial safety policy

Non-negotiable:

- no silent destructive delete of financial history after production begins;
- corrections use reversal/adjustment transactions;
- every write is idempotent;
- every write has actor/source;
- AI-generated reasoning is not ledger evidence;
- ledger rows must be reproducible from tool inputs and deterministic rules;
- no AI tool may expose or store passwords/session tokens/secrets;
- high-risk financial actions require policy thresholds;
- policy engine must be server-side;
- browser/localStorage/sessionStorage are never financial authority.

### AI accounting control plane

Add a dedicated control plane with at least:

```ini
ACCOUNTING_AGENT_MODE=OFF|OBSERVE|RECOMMEND|APPROVAL|AUTO
ACCOUNTING_AGENT_POLICY_EPOCH=<integer>
ACCOUNTING_AGENT_MAX_AUTO_AMOUNT=<currency amount>
ACCOUNTING_AGENT_ALLOW_REVERSALS=false
ACCOUNTING_AGENT_ALLOW_DAY_CLOSE=false
ACCOUNTING_AGENT_ALLOW_SUPPLIER_PAYMENT=false
ACCOUNTING_AGENT_ALLOW_CUSTOMER_ADJUSTMENT=false
```

The default production state must be fail-closed.

Initial target:

```ini
ACCOUNTING_AGENT_MODE=OBSERVE
ACCOUNTING_AGENT_WRITES=OFF
```

Only after the deterministic accounting engine is fully Zero-Google and reconciled may individual tools advance toward APPROVAL/AUTO.

### Agent audit ledger

Every AI decision/execution should create an immutable structured event containing:

- agent_run_id
- event_id / source_event_id
- accounting_tool
- policy_epoch
- autonomy_level
- actor/system identity
- entity IDs
- request/idempotency key
- input fact references
- deterministic validation result
- approval identity when applicable
- execution result
- reversal reference if later reversed
- timestamp

Do not store raw chain-of-thought. Store concise business rationale / reason codes only.

### Management experience target

The owner should not need to operate accounting screens routinely.

The target daily experience is a compact AI briefing such as:

- accounting status = healthy / attention required;
- movements posted automatically;
- invoices created;
- collections received;
- supplier obligations due;
- cash forecast;
- material purchasing forecast;
- anomalous stock/cost/profit findings;
- exceptions requiring approval;
- unresolved reconciliation differences.

The owner should receive exceptions and decisions, not routine bookkeeping.

### AI Agent relationship with TrendOS

TrendOS remains the operational source for workshop execution facts.

EasyStore AI Accounting Agent owns accounting interpretation and financial ledgers.

Target direction:

`TrendOS operational event -> Accounting Agent -> deterministic accounting tool -> D1 ledger -> Accounting event/result -> TrendOS visibility`

No spreadsheet mirror should be required for runtime operation.

### Revised Zero-Google migration strategy

The migration should now optimize for the future Agent architecture, not merely copy Apps Script actions one-by-one.

For every legacy EasyStore capability:

`Legacy behavior -> canonical accounting command/query -> deterministic D1 tool -> Agent tool wrapper -> policy -> tests -> runtime qualification`

This avoids rebuilding a legacy monolith on Cloudflare.

### Revised implementation phases

#### A1 — Clean accounting foundation
- purge unwanted historical accounting business data only, preserving schema/code;
- keep TrendOS orders/customers/employees outside accounting purge;
- maintain Accounting control fail-closed during reset.

#### A2 — Deterministic read model
- finish all accounting reads in D1;
- remove Google-backed read helpers;
- stable Party/Item/Order/Line/Department IDs;
- accounting health/integrity endpoints.

#### A3 — Deterministic write engine
- sales invoices;
- collections;
- purchases;
- supplier payments;
- stock movements;
- materials/BOM;
- waste;
- custody;
- day close;
- reversals;
- idempotency and audit.

#### A4 — Agent Tool Registry
- expose every accounting command/query as a typed tool;
- no direct free-form DB writes;
- preview/dry-run support;
- policy tags per tool.

#### A5 — Observe/Recommend Agent
- daily brief;
- anomaly detection;
- forecasts;
- reconciliation suggestions;
- no autonomous financial writes initially.

#### A6 — Approval Agent
- AI prepares safe write transactions;
- owner/authorized employee approves;
- execution through deterministic tools.

#### A7 — Controlled Auto Accounting
- graduate low-risk capabilities one at a time;
- define amount/frequency/entity thresholds;
- automatic reconciliation;
- automatic day close only when all integrity gates pass.

#### A8 — Autonomous accounting operations
Target state:

```ini
EASYSTORE_ZERO_GOOGLE=PASS
ACCOUNTING_ENGINE=D1_AUTHORITATIVE
GOOGLE_BUSINESS_CALLS=0
ACCOUNTING_AGENT=ACTIVE
ROUTINE_HUMAN_BOOKKEEPING=MINIMIZED
HUMAN_WORK=EXCEPTIONS_APPROVALS_PHYSICAL_FACTS
```

### Product success criterion

EasyStore is complete only when it can operate as an accounting employee/agent, not merely display accounting screens.

The long-term acceptance criterion is:

> A normal workshop day can complete without the owner manually entering routine accounting data, while every financial result remains deterministic, auditable, reversible where appropriate, and policy-controlled.

## Registration — AI Accounting Agent direction

```ini
PRODUCT=EasyStore
PRODUCT_DIRECTION=AI_ACCOUNTING_AGENT
ACCOUNTING_ENGINE=DETERMINISTIC
AI_LEDGER_AUTHORITY=NO
AI_TOOL_ACCESS=POLICY_CONTROLLED
DEFAULT_AGENT_MODE=OBSERVE
DEFAULT_AGENT_WRITES=OFF
TARGET_RUNTIME=CLOUDFLARE_D1
TARGET_GOOGLE_RUNTIME_DEPENDENCY=ZERO
TARGET_HUMAN_ROLE=EXCEPTIONS_APPROVALS_PHYSICAL_FACTS
CURRENT_ACCOUNTING_MODE=READONLY
CURRENT_ZERO_GOOGLE=NO
NEXT_ARCHITECTURE_GATE=ACCOUNTING_AGENT_CONTRACT_TOOL_REGISTRY_AND_AUTONOMY_POLICY
```

