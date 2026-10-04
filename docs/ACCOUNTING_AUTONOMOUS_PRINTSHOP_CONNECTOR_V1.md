# EasyStore ↔ Autonomous Printshop Finance Connector V1

Status: REPO-ONLY / DEFAULT-OFF  
Date: 2026-10-05

## Purpose

EasyStore remains the independent financial authority while Autonomous Printshop / TrendOS remains the operational authority.

The two systems communicate through a **versioned connector contract**. They do not share financial authority and they do not use direct cross-system database writes.

Target flow:

`TrendOS / Autonomous Printshop operational event -> Finance Connector -> EasyStore Agent/Policy -> Deterministic Accounting Tool -> D1 Ledger -> Financial result/event -> Connector -> Autonomous Printshop`

## Core rule

The connector transports trusted facts, queries and controlled commands.

It does **not** give Autonomous Printshop or its AI direct access to the EasyStore ledger.

```ini
EASYSTORE_FINANCIAL_AUTHORITY=YES
AUTONOMOUS_PRINTSHOP_FINANCIAL_AUTHORITY=NO
DIRECT_CROSS_SYSTEM_DB_WRITE=NO
BROWSER_DUAL_WRITE=NO
AI_DIRECT_DB_WRITE=NO
CONNECTOR_DEFAULT_MODE=OFF
```

## Authority split

Autonomous Printshop / TrendOS owns operational truth such as:
- order and line state;
- production task execution;
- completion evidence;
- physical material usage;
- physical waste evidence;
- delivery state.

EasyStore owns financial truth such as:
- invoices;
- receivables/payables;
- customer/supplier balances;
- cashbox/treasury;
- financial stock valuation;
- financial reconciliation;
- day close;
- reversals;
- cost and profitability accounting.

## Stable identity requirement

Connector messages must use stable IDs. Names are display values only.

Required envelope identity:
- event_id;
- correlation_id;
- idempotency_key;
- order_id;
- line_id when applicable;
- customer_id or party_id when applicable;
- task_id/material_id/supplier_id/invoice_id/payment_id when applicable.

## Connector modes

```text
OFF -> SHADOW -> READONLY -> CANARY -> GENERAL
```

- OFF: contract/source only.
- SHADOW: events may be received and compared, but no financial posting.
- READONLY: Autonomous Printshop may query qualified financial views and the connector may observe events.
- CANARY: selected low-risk commands are enabled for a bounded scope.
- GENERAL: only qualified connector families are enabled.

Every mode is fail-closed.

## Inbound event examples

Operational events may create accounting candidates but are not themselves financial ledger authority.

Examples:
- order_created;
- order_line_approved;
- production_started;
- production_completed;
- material_consumed_confirmed;
- waste_confirmed;
- purchase_received_confirmed;
- physical_stock_count_confirmed;
- order_delivered;
- customer_payment_reference_received.

A payment reference received from a customer or chat is **not** proof of payment. Verification remains required before financial posting.

## Outbound financial events

EasyStore may publish:
- invoice_created / invoice_status_changed;
- customer_balance_changed;
- supplier_balance_changed;
- payment_verified_and_posted;
- financial_hold_changed;
- job_cost_updated;
- profitability_snapshot_updated;
- material_cost_snapshot_updated;
- accounting_exception_raised;
- accounting_day_closed.

These are financial results published by EasyStore; Autonomous Printshop does not recreate them independently.

## Query and command boundary

Autonomous Printshop may call read tools such as:
- get_accounting_summary;
- get_customer_balance;
- get_supplier_balance;
- get_open_invoices;
- get_open_payables;
- calculate_job_cost;
- calculate_line_profit;
- get_financial_hold_status.

Write requests are commands, not direct writes. Initial examples:
- request_sales_invoice;
- request_material_consumption_post;
- request_waste_post;
- request_reconciliation.

The connector hands the request to EasyStore policy + deterministic tools. EasyStore may approve, reject, defer or require human approval.

## Delivery contract

Target delivery semantics:

`AT_LEAST_ONCE_WITH_IDEMPOTENT_CONSUMER`

Therefore every mutation-capable request needs:
- idempotency key;
- request hash / canonical payload;
- replay handling;
- deterministic response;
- audit record;
- dead-letter/exception path on repeated failure.

## Security

Connector payloads must never contain:
- passwords;
- session tokens;
- API keys;
- raw secrets;
- hidden chain-of-thought.

Authentication/authorization is transport/server responsibility.

## Accounting Agent relationship

The Accounting Agent consumes connector facts as evidence/context, but the Agent still cannot post directly to D1.

`Connector event -> Agent decision -> Policy -> Deterministic Tool -> Ledger`

The connector is therefore a system boundary, not an authority merger.

## Autonomous Printshop alignment

This contract implements the intended EasyStore Finance Adapter boundary from the Autonomous Printshop build matrix.

The accounting project keeps its own canonical book and lifecycle. Autonomous Printshop can reference this connector contract but must not duplicate EasyStore accounting state.

## V1 acceptance

```ini
CONNECTOR_CONTRACT=PASS
CONNECTOR_DEFAULT_MODE=OFF
DIRECT_CROSS_SYSTEM_DB_ACCESS=0
BROWSER_DUAL_WRITES=0
UNVERSIONED_FINANCIAL_EVENTS=0
NON_IDEMPOTENT_FINANCIAL_COMMANDS=0
AUTONOMOUS_PRINTSHOP_FINANCIAL_AUTHORITY=NO
EASYSTORE_FINANCIAL_AUTHORITY=YES
```

Machine-readable source:

`docs/ACCOUNTING_CONNECTOR_CONTRACT_V1.json`
