# ACC-187 — Customer sale refunds: owner decision required (2026-10-12)

**Status: OWNER_POLICY_PENDING — NO IMPLEMENTATION AUTHORIZED.**
This is a decision-preparation checklist only. It does not approve real or fake refund execution, ledger migration, production finance writes, publication, or employee access. Accounting execution history is recorded exclusively in the original `EASYSTORE_ACCOUNTING_MASTER_BOOK.md` in this same EasyStore repository.

## Existing verified behavior and gap
- Original native Worker rejects `refundEasyStoreSaleV2`, `returnEasyStoreSaleV2` and `reverseEasyStoreSaleV2` with 400 action unknown. ACC187 synthetic tests prove no cash/stock/party side effects from those unsupported actions.
- `reopenAccountingFinalInvoice` moves invoices to UNDER_REVIEW, removes outstanding debt, and **holds** prior payment. It does not repay cash or imply stock has been physically returned.
- ACC198 fake shared database reproduces purchases, settlements, reversal, sale, receivable, and close while refusing unapproved refunds; full financial refund acceptance therefore **cannot** be marked complete.

## Decisions that cannot be inferred from tests
Each field below is intentionally **UNDECIDED**; no option is the current business policy.

1. **Eligibility & proof:** time limit, invoice and original-payment proof, acceptable reason codes, partial-item returns versus whole invoice, non-returnable personalized/consumed products. **OWNER_DECISION=UNDECIDED**
2. **Refund amount:** cap at previously captured and *not already refunded* money; how discounts, fees, deposits and unpaid balances affect entitlement; how multi-payment methods are allocated. **OWNER_DECISION=UNDECIDED**
3. **Money return channel and authorization:** cash vs InstaPay/bank/original method, immediate payout vs credit on customer account, daily and per-employee value limits, two-person approval and documented cashbox handover, receipt requirements. **OWNER_DECISION=UNDECIDED**
4. **Inventory treatment:** physical receipt and inspection required? eligible restock quantity, damaged/customized work, cost/waste accounting, quantity conservation, supplier impact, delayed return without stock credit. **OWNER_DECISION=UNDECIDED**
5. **Post-close and disputes:** treatment of already-closed invoices/days, replacement invoices, held payments, chargebacks, duplicate or concurrent claims and dispute expiry. **OWNER_DECISION=UNDECIDED**
6. **Actual owner signoff:** named approver/record, signoff scope, effective date and version, and explicit permission to *begin source-only design* followed by separate production GO. **OWNER_DECISION=UNDECIDED**

## Proposed fail-closed engineering acceptance (not authorization)
Before refund handling can be marked ACC187 complete, source-only tests should exercise real native Worker logic against invented SQLite for full/partial/zero/overpaid refunds, denied unauthorized roles, duplicate IDempotency keys, concurrent refund caps, negative stock refusal, account/cash/stock/ledger atomicity, and reversal after day close. Tests must show compensated transactions rather than destructive invoice deletion, original lineage and immutable audit proof. A separate owner-approved acceptance is still required for real funds.

Until the policy is signed and a guarded native implementation is independently qualified:

```ini
ACC187_CUSTOMER_CASH_REFUNDS=UNSUPPORTED_FAIL_CLOSED
ACC187_OWNER_POLICY=PENDING
ACC198_FULL_ACCEPTANCE=BLOCKED
ACC199_RELEASE_HANDOFF=DRAFT
FINANCE_RELEASE=NO_GO
G1=OPEN
G2=OPEN
G3=OPEN
G4=OPEN
G5=OPEN
```

**Never** treat an automated green CI or this decision sheet as payment approval, a live canary permit, or authority to touch production D1, Cloudflare or Autonomous Printshop.
