# ACC-187 — Customer refund method decided; remaining conditions pending (2026-10-12)

**Status: OWNER_METHOD_DECIDED — REMAINING_POLICY_PENDING — NO_FINANCE_EXECUTION_AUTHORIZED.**
This is a decision-preparation checklist only. It does not approve real or fake refund execution, ledger migration, production finance writes, publication, or employee access. Accounting execution history is recorded exclusively in the original `EASYSTORE_ACCOUNTING_MASTER_BOOK.md` in this same EasyStore repository.

## Existing verified behavior and gap
- Original native Worker rejects `refundEasyStoreSaleV2`, `returnEasyStoreSaleV2` and `reverseEasyStoreSaleV2` with 400 action unknown. ACC187 synthetic tests prove no cash/stock/party side effects from those unsupported actions.
- `reopenAccountingFinalInvoice` moves invoices to UNDER_REVIEW, removes outstanding debt, and **holds** prior payment. It does not repay cash or imply stock has been physically returned.
- ACC198 fake shared database reproduces purchases, settlements, reversal, sale, receivable, and close while refusing unapproved refunds; full financial refund acceptance therefore **cannot** be marked complete.

## Owner's actual decision — method and management approval only
On 2026-10-12 the owner responded, verbatim: **«نسمح بالاختيارين حسب موافقة الإدارة»** to whether a customer return can be compensated by refunded money, customer account credit, or both with management approval.

**APPROVED_AS_BUSINESS_METHOD_CHOICES:** `CASH_REFUND` **OR** `CUSTOMER_CREDIT`. One of these two routes can be selected for a particular return **only with case-specific management approval**. Approval to offer both methods in principle is **not** approval for any particular refund, account credit or paid amount. Client-supplied flags such as `approved=true` or `role=admin` are not proof of management authorization. Server-verified manager identity, approval case/amount/method binding, audit and unique idempotency identifiers are still implementation preconditions.

The current Worker still lacks a handler for actually paying money or creating customer credit. Both remain **UNSUPPORTED_FAIL_CLOSED** in production; don't infer them from `reopenAccountingFinalInvoice` or from this document.

## Remaining decisions that cannot be inferred from the owner's method choice
The following requirements remain **UNDECIDED** and require separate decisions before implementation/acceptance.

1. **Eligibility & proof:** time limit, invoice and original-payment proof, acceptable reason codes, partial-item returns versus whole invoice, non-returnable personalized/consumed products. **OWNER_DECISION=UNDECIDED**
2. **Refund amount:** cap at previously captured and *not already refunded* money; how discounts, fees, deposits and unpaid balances affect entitlement; how multi-payment methods are allocated. **OWNER_DECISION=UNDECIDED**
3. **Remaining payment detail and authority:** the two business routes are approved conditionally; whether cash reimbursement is paid from cashbox vs InstaPay/bank/original tender, daily/per-employee limits, specific manager identity and role verification, any dual approval, custody/handover and signed receipt requirements are **OWNER_DECISION=UNDECIDED**.
4. **Inventory treatment:** physical receipt and inspection required? eligible restock quantity, damaged/customized work, cost/waste accounting, quantity conservation, supplier impact, delayed return without stock credit. **OWNER_DECISION=UNDECIDED**
5. **Post-close and disputes:** treatment of already-closed invoices/days, replacement invoices, held payments, chargebacks, duplicate or concurrent claims and dispute expiry. **OWNER_DECISION=UNDECIDED**
6. **Operational signoff:** the owner has authorized **method selection only**, not individual transactions. Specific real management approval chain, effective policy version, source-review signoff and independent production GO remain **OWNER_DECISION=UNDECIDED**.

## Proposed fail-closed engineering acceptance (not authorization)
Before refund handling can be marked ACC187 complete, source-only tests should exercise real native Worker logic against invented SQLite for full/partial/zero/overpaid refunds, denied unauthorized roles, duplicate IDempotency keys, concurrent refund caps, negative stock refusal, account/cash/stock/ledger atomicity, and reversal after day close. Tests must show compensated transactions rather than destructive invoice deletion, original lineage and immutable audit proof. A separate owner-approved acceptance is still required for real funds.

Until the policy is signed and a guarded native implementation is independently qualified:

```ini
ACC187_CUSTOMER_CASH_REFUNDS=UNSUPPORTED_FAIL_CLOSED
ACC187_OWNER_SETTLEMENT_METHODS=CASH_REFUND_OR_CUSTOMER_CREDIT
ACC187_METHOD_REQUIRES_CASE_MANAGEMENT_APPROVAL=YES
ACC187_REMAINING_POLICY=PENDING
ACC187_CUSTOMER_CREDIT_POSTING=UNSUPPORTED_FAIL_CLOSED
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
