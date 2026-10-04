# EasyStore AI Accounting Agent — Product Contract V1

Status: REPO-ONLY / DEFAULT-OFF  
Date: 2026-10-05

## Goal

EasyStore is an AI-operated accounting system for the workshop.

The target is not a traditional accounting program that requires constant manual entry. The target is a financial operating agent that consumes trusted operational facts, converts them into deterministic accounting actions, continuously validates integrity, and escalates only exceptions and approval-required decisions to humans.

## Operating flow

`TrendOS event -> Accounting Agent -> policy check -> deterministic accounting tool -> D1 ledger -> integrity validation -> audit event -> Owner Brief / TrendOS result`

The Agent is never allowed to write directly to the database.

## What changes in the product

### 1. Google exits runtime authority

The final accounting runtime must not depend on Google Sheets or Apps Script for business reads or writes.

Target:

```ini
EASYSTORE_ZERO_GOOGLE=PASS
GOOGLE_BUSINESS_CALLS=0
ACCOUNTING_ENGINE=D1_AUTHORITATIVE
```

### 2. Manual bookkeeping is replaced by event-driven accounting

Facts already known to TrendOS must not be re-entered manually.

Examples:
- approved order line -> invoice candidate;
- confirmed production -> cost recognition candidate;
- confirmed material use -> stock movement;
- confirmed customer payment -> collection;
- confirmed purchase receipt -> stock/payable;
- delivered order -> financial close eligibility.

### 3. Humans provide physical truth, exceptions and approvals

Humans remain responsible for facts that cannot be inferred safely:
- actual delivered quantity when it differs from planned quantity;
- physical waste/scrap;
- physical stock counts;
- off-system cash receipt evidence;
- disputed supplier/customer transactions;
- legally sensitive overrides.

Routine bookkeeping is not a target human role.

### 4. AI becomes orchestration, not ledger authority

The AI can:
- observe;
- explain;
- forecast;
- detect anomalies;
- recommend;
- prepare exact transactions;
- execute only through policy-controlled tools.

The AI cannot:
- invent payment facts;
- directly modify D1;
- silently delete financial history;
- bypass integrity rules;
- auto-correct unexplained discrepancies;
- increase its own autonomy level.

## Deterministic accounting engine

The deterministic engine owns:
- invoices;
- payments;
- receivables;
- payables;
- party ledgers;
- stock ledgers;
- material consumption;
- waste;
- cost;
- profit;
- treasury;
- reconciliation;
- day close;
- reversals;
- audit events.

Every financial write must be:
- server-authoritative;
- idempotent;
- permission-checked;
- auditable;
- reversible by explicit counter-transaction when appropriate.

## Evidence model

Financial facts require evidence.

Accepted evidence classes:
- authoritative TrendOS event;
- deterministic accounting ledger fact;
- verified payment source;
- approved purchase receipt;
- authorized physical count;
- authorized human approval.

Not sufficient by itself:
- an AI guess;
- a WhatsApp/chat message saying a payment happened;
- browser/localStorage state;
- free-form model reasoning.

## Integrity Engine

Integrity checking is independent from AI.

Minimum equations:

```text
opening_cash + cash_in - cash_out = closing_cash
invoice_total - paid_amount = remaining_amount
opening_stock + stock_in - stock_out - waste = closing_stock
party_opening_balance + debits - credits = party_closing_balance
```

If an integrity rule fails:
- do not auto-correct;
- fail closed for affected close/auto action;
- create an exception;
- show the discrepancy and evidence;
- require reconciliation or authorized adjustment.

Day close is not allowed while unresolved integrity errors exist.

## Agent autonomy

### OFF
Agent runtime disabled.

### OBSERVE
Read and explain only.

### RECOMMEND
May create recommendations, forecasts and proposed actions.

### APPROVAL
May prepare exact deterministic transactions but requires authorized approval before execution.

### AUTO
May execute only whitelisted, low-risk actions inside server-side limits.

Autonomy applies per tool, not only globally.

## Suggested first AUTO candidates

After runtime qualification:
- invoice generation from already-approved operational facts;
- posting material consumption from confirmed production;
- routine stock movement;
- zero-difference reconciliation;
- customer receipt posting when payment evidence is authoritative and structured.

## Actions that should stay approval-gated longer

- supplier payments;
- write-offs;
- exceptional discounts;
- manual ledger adjustment;
- reversal;
- custody settlement with discrepancy;
- day close with discrepancy;
- any high-value transaction over policy threshold.

## Owner experience

The primary owner screen should be an exception-first **Owner Brief**, not a spreadsheet dashboard.

Example output:

```text
Accounting health: Healthy
Sales today: 18,450
Collected today: 14,200
Customer receivables: 4,250
Supplier due tomorrow: 6,800
Automatic movements posted: 42
Material risks: 2
Margin anomalies: 1
Unresolved reconciliation differences: 0
Approvals required: 1
```

The owner should drill into accounting screens only when needed.

## Employee experience

Employees should mainly provide:
- physical facts;
- exceptions;
- approvals within their role;
- evidence attachments where needed.

They should not re-enter information already known to TrendOS.

## Required system components

1. D1 authoritative accounting engine.
2. Stable Party / Item / Order / Line / Department / Profit Center IDs.
3. Accounting Event Bus contract.
4. Agent Tool Registry.
5. Server-side Autonomy Policy Engine.
6. Idempotency Ledger.
7. Immutable Audit Ledger.
8. Integrity Engine.
9. Exception Queue.
10. Approval Queue.
11. Owner Brief.
12. Forecasting / anomaly layer.
13. Reversal and correction contracts.
14. Runtime health and reconciliation gates.

## Agent audit record

Every AI action/decision should store structured business evidence, not hidden reasoning.

Required fields:
- agent_run_id;
- source_event_id;
- tool_name;
- autonomy_level;
- policy_epoch;
- actor/system identity;
- entity IDs;
- idempotency key;
- evidence references;
- deterministic validation result;
- approval identity if applicable;
- result;
- reversal reference if later reversed;
- timestamps;
- concise reason codes.

Do not store chain-of-thought.

## Acceptance target

The program is not considered complete merely because all accounting screens work.

Success means:

> A normal workshop day can complete without the owner manually entering routine accounting data, while every financial result remains deterministic, auditable, evidence-backed, policy-controlled, and reversible where required.

## V1 default policy

```ini
ACCOUNTING_AGENT_MODE=OBSERVE
ACCOUNTING_AGENT_WRITES=OFF
MAX_AUTO_AMOUNT=0
ALLOW_REVERSALS=false
ALLOW_DAY_CLOSE=false
ALLOW_SUPPLIER_PAYMENT=false
ALLOW_CUSTOMER_ADJUSTMENT=false
DIRECT_AI_DB_WRITE=false
AI_LEDGER_AUTHORITY=false
```

The machine-readable source for this policy is:

`docs/ACCOUNTING_AGENT_POLICY_V1.json`
