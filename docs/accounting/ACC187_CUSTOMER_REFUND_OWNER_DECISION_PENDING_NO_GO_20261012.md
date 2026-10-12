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

## Owner's personalized-product eligibility decision — 2026-10-12

The owner confirmed **"agree"** to this question: whether items customized with the customer's **name or photo** cannot be returned except for **a manufacturing defect** or **an error by Trend Mall**.

**DECIDED BUSINESS RULE:**
- Customer-name or customer-photo customized products are **not eligible** for ordinary return merely because the buyer changed their mind, dislikes the product, or supplied the wrong photo/text.
- Only a **verified manufacturing defect** or **a verified Trend Mall error** creates **eligibility for return review** for these products. The reported reason alone is NOT proof; verification evidence must be independently checked.
- Even a verified exception does NOT automatically approve a refund. The specific return and settlement method still require **management approval**. Either returning money or issuing a customer-account credit is permitted only after that approval, as decided previously.
- No real return, payout, account credit, restocking, cashbox adjustment or D1 ledger update is authorized by this policy record.
- Real proof verification standards, time limits, partial-item eligibility, other product categories, inventory inspection, compensation amount and final payment route remain **UNDECIDED**.

This records **two bounded owner decisions** (method choice, personalized-item exception), not the entire ACC-187 procedure.

## Owner's return timing decision — case-by-case management discretion (2026-10-12)

On 2026-10-12 the owner explicitly decided: **«تترك المدة حسب تقدير الإدارة لكل حالة»**. This answers the proposed choice between a fixed 7/14-day return-request deadline and individual management judgment.

**DECIDED BUSINESS RULE:**
- There is **NO internal fixed-day auto-expiry** for asking for a return. Do not hard-code 7, 14, or another day count as an automatic eligibility approval or rejection.
- Management must assess the **timing of each distinct request** and record a case-specific decision and supporting reason. A decision on one request cannot authorize another invoice, request, item, or date.
- Submission timestamps and case data are needed for an audit trail, **not for an automatic legal deadline or refusal**. Claims presented by the client and `role=admin` flags are not authentic managerial verification.
- This timing choice is **separate** from the independently evidenced manufacturing defect or Trend Mall error requirement on personalized name/photo items and from the separate management decision to choose refund of money or customer credit.
- Applicable consumer-protection law and mandatory consumer rights take priority over internal management discretion. Legal applicability has **not** been adjudicated by these synthetic tests.
- Real manager identity/authority, decision evidence capture and actual cash/credit transactions are **NOT IMPLEMENTED/NOT AUTHORIZED** by this source-only rule.

This records the **third bounded owner decision**: method choice, personalized product exception, and case-specific review timing. It does **not** resolve the remaining refund amount, inventory and production acceptance requirements.

## Remaining decisions not covered by the three owner approvals
The following requirements remain **UNDECIDED** and require separate decisions before implementation/acceptance.

1. **Eligibility & proof — PARTIALLY DECIDED:** customer-name/photo customized products are ineligible except where a manufacturing defect or Trend Mall error is independently verified. Other product categories, invoice/payment evidence requirements, proof format, partial-item returns and detailed acceptance workflow still require **OWNER_DECISION=UNDECIDED**. The **timing rule itself is DECIDED**: per-case management review without an internal fixed-day cutoff.
2. **Refund amount:** cap at previously captured and *not already refunded* money; how discounts, fees, deposits and unpaid balances affect entitlement; how multi-payment methods are allocated. **OWNER_DECISION=UNDECIDED**
3. **Remaining payment detail and authority:** the two business routes are approved conditionally; whether cash reimbursement is paid from cashbox vs InstaPay/bank/original tender, daily/per-employee limits, specific manager identity and role verification, any dual approval, custody/handover and signed receipt requirements are **OWNER_DECISION=UNDECIDED**.
4. **Inventory treatment:** physical receipt and inspection required? eligible restock quantity, damaged/customized work, cost/waste accounting, quantity conservation, supplier impact, delayed return without stock credit. **OWNER_DECISION=UNDECIDED**
5. **Post-close and disputes:** treatment of already-closed invoices/days, replacement invoices, held payments, chargebacks, duplicate or concurrent claims and dispute expiry. **OWNER_DECISION=UNDECIDED**
6. **Operational signoff:** the owner has authorized **method selection only**, not individual transactions. Specific real management approval chain, effective policy version, source-review signoff and independent production GO remain **OWNER_DECISION=UNDECIDED**.

## ACC-187/198 follow-up — anti-double-settlement rehearsal, NOT owner amount policy

[TrendOS Draft PR #113](https://github.com/fawakhry/TrendOs/pull/113) adds two **test-only** protections. First, the checked-in original Worker under fake single-database SQLite refuses six unsupported cash/customer-credit action names without changing any accounting table row. Second, a completely separate fake SQLite ledger demonstrates a conservative **hypothetical** combined cash-and-credit ceiling, unique-request idempotency, and denial of attempted extra or recycled settlements. This does NOT assert that the ceiling or refund entitlement formula has been approved by the owner.

**Strict pending decision:** how much money or customer credit can be issued for paid-in-full, partially paid, discounted, overpaid, previously refunded and post-day-close invoices, including split cash-plus-credit settlement. No live finance handler may use the rehearsal's illustrative ceiling as policy.

The actual backend still has no authorized customer cash-return or store-credit posting handler, no real management authorization chain, no production cutover, and no execution permission. These test results are not an ACC187 close.

## Customer debt adjustment is NOT spendable store credit — source audit

The checked-in Worker has a generic customer-party ledger action `savePartyLedgerTransaction` / `saveCustomerAccountMovementV1915` supporting `adjustment_decrease`. In the reviewed source, this **reduces an existing customer debt balance**, is restricted to the `full` accounting role for adjustment operations, and **does not itself generate a customer cash refund or an independently spendable store-credit liability**. It therefore **MUST NOT** be relabeled or re-used as an approved ACC187 refund/credit settlement.

A distinct future real store-credit design, with owner-approved liability/accounting treatment, case/amount/method/manager binding, idempotency, reconciliation and financial authority guards, remains **UNDECIDED** and **NOT IMPLEMENTED**. The source-audit regression is **not** a proof that all other possible financial actions are safe or that a real refund cannot be miscategorized.

## Proposed fail-closed engineering acceptance (not authorization)
Before refund handling can be marked ACC187 complete, source-only tests should exercise real native Worker logic against invented SQLite for full/partial/zero/overpaid refunds, denied unauthorized roles, duplicate IDempotency keys, concurrent refund caps, negative stock refusal, account/cash/stock/ledger atomicity, and reversal after day close. Tests must show compensated transactions rather than destructive invoice deletion, original lineage and immutable audit proof. A separate owner-approved acceptance is still required for real funds.

Until the policy is signed and a guarded native implementation is independently qualified:

```ini
ACC187_CUSTOMER_CASH_REFUNDS=UNSUPPORTED_FAIL_CLOSED
ACC187_OWNER_SETTLEMENT_METHODS=CASH_REFUND_OR_CUSTOMER_CREDIT
ACC187_METHOD_REQUIRES_CASE_MANAGEMENT_APPROVAL=YES
ACC187_REMAINING_POLICY=PENDING
ACC187_CUSTOMER_CREDIT_POSTING=UNSUPPORTED_FAIL_CLOSED
ACC187_PERSONALIZED_NAME_PHOTO_RETURN=ONLY_VERIFIED_MANUFACTURING_DEFECT_OR_TREND_MALL_ERROR
ACC187_PERSONALIZED_CHANGE_OF_MIND=INELIGIBLE
ACC187_PERSONALIZED_EXCEPTION_STILL_REQUIRES_MANAGEMENT_APPROVAL=YES
ACC187_RETURN_TIME_LIMIT=NO_FIXED_DAYS_CASE_SPECIFIC_MANAGEMENT_REVIEW
ACC187_AUTOMATIC_TIME_APPROVAL_OR_EXPIRY=DISABLED
ACC187_STATUTORY_CONSUMER_RIGHTS=NOT_OVERRIDDEN
ACC187_REAL_MANAGEMENT_TIMING_VERIFIER=NOT_IMPLEMENTED
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
