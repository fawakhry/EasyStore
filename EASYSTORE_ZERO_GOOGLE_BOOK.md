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

