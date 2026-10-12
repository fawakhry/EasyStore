# ACC-187 — Customer refund method decided; remaining conditions pending (2026-10-12)

**Status: OWNER_METHOD_PERSONALIZED_ELIGIBILITY_TIMING_AND_AMOUNT_CAP_DECIDED — IMPLEMENTATION_AND_OTHER_POLICY_PENDING — NO_FINANCE_EXECUTION_AUTHORIZED.**
This is a decision-preparation checklist only. It does not approve real or fake refund execution, ledger migration, production finance writes, publication, or employee access. Accounting execution history is recorded exclusively in the original `EASYSTORE_ACCOUNTING_MASTER_BOOK.md` in this same EasyStore repository.

## Existing verified behavior and gap
- Original native Worker rejects `refundEasyStoreSaleV2`, `returnEasyStoreSaleV2` and `reverseEasyStoreSaleV2` with 400 action unknown. ACC187 synthetic tests prove no cash/stock/party side effects from those unsupported actions.
- `reopenAccountingFinalInvoice` moves invoices to UNDER_REVIEW, removes outstanding debt, and **holds** prior payment. It does not repay cash or imply stock has been physically returned.
- ACC198 fake shared database reproduces purchases, settlements, reversal, sale, receivable, and close while refusing unapproved refunds; full financial refund acceptance therefore **cannot** be marked complete.

## Owner's actual decision — method and management approval only
On 2026-10-12 the owner responded, verbatim: **«نسمح بالاختيارين حسب موافقة الإدارة»** to whether a customer return can be compensated by refunded money, customer account credit, or both with management approval.

**APPROVED_AS_BUSINESS_METHOD_CHOICES:** `CASH_REFUND`, `CUSTOMER_CREDIT`, **or a combination of BOTH** for the same returned items, with the aggregate amount rule below. Every settlement choice and its cash/credit split requires case-specific management approval. Approval to offer both methods in principle is **not** approval for any particular refund, account credit or paid amount. Client-supplied flags such as `approved=true` or `role=admin` are not proof of management authorization. Server-verified manager identity, approval case/amount/method binding, audit and unique idempotency identifiers are still implementation preconditions.

The current Worker still lacks a handler for actually paying money or creating customer credit. Both remain **UNSUPPORTED_FAIL_CLOSED** in production; don't infer them from `reopenAccountingFinalInvoice` or from this document.

## Owner's personalized-product eligibility decision — 2026-10-12

The owner confirmed **"agree"** to this question: whether items customized with the customer's **name or photo** cannot be returned except for **a manufacturing defect** or **an error by Trend Mall**.

**DECIDED BUSINESS RULE:**
- Customer-name or customer-photo customized products are **not eligible** for ordinary return merely because the buyer changed their mind, dislikes the product, or supplied the wrong photo/text.
- Only a **verified manufacturing defect** or **a verified Trend Mall error** creates **eligibility for return review** for these products. The reported reason alone is NOT proof; verification evidence must be independently checked.
- Even a verified exception does NOT automatically approve a refund. The specific return and settlement method still require **management approval**. Either returning money or issuing a customer-account credit is permitted only after that approval, as decided previously.
- No real return, payout, account credit, restocking, cashbox adjustment or D1 ledger update is authorized by this policy record.
- Real proof verification standards, partial-item evidence handling, other product categories, inventory inspection, exact discount/payment allocation and payout channel remain **UNDECIDED**. Timing and net-paid compensation ceiling are separately DECIDED below.

This historical checkpoint records the first **two bounded owner decisions** (method choice, personalized-item exception); later decisions below expand the methods to mixed cash/credit and set timing and amount limits.

## Owner's return timing decision — case-by-case management discretion (2026-10-12)

On 2026-10-12 the owner explicitly decided: **«تترك المدة حسب تقدير الإدارة لكل حالة»**. This answers the proposed choice between a fixed 7/14-day return-request deadline and individual management judgment.

**DECIDED BUSINESS RULE:**
- There is **NO internal fixed-day auto-expiry** for asking for a return. Do not hard-code 7, 14, or another day count as an automatic eligibility approval or rejection.
- Management must assess the **timing of each distinct request** and record a case-specific decision and supporting reason. A decision on one request cannot authorize another invoice, request, item, or date.
- Submission timestamps and case data are needed for an audit trail, **not for an automatic legal deadline or refusal**. Claims presented by the client and `role=admin` flags are not authentic managerial verification.
- This timing choice is **separate** from the independently evidenced manufacturing defect or Trend Mall error requirement on personalized name/photo items and from the separate management decision to choose refund of money or customer credit.
- Applicable consumer-protection law and mandatory consumer rights take priority over internal management discretion. Legal applicability has **not** been adjudicated by these synthetic tests.
- Real manager identity/authority, decision evidence capture and actual cash/credit transactions are **NOT IMPLEMENTED/NOT AUTHORIZED** by this source-only rule.

This historical checkpoint records the **third bounded owner decision**: method choice, personalized-product exception, and case-specific timing. A subsequent fourth decision below governs the amount ceiling; inventory and production acceptance remain unresolved.

## Owner's actual-paid compensation ceiling decision — 2026-10-12

The owner answered **"agree"** to the explicit proposal that the **TOTAL** compensation given as money, customer account credit or **both together** must **not exceed the money ACTUALLY PAID for the RETURNED products, after subtracting ALL compensation previously issued**. Any **exceptional compensation greater than that net amount** requires **SEPARATE management approval** beyond the normal case/settlement decision.

**DECIDED OWNER BUSINESS RULE:**
- Define the normal maximum for the items actually being returned as `MAX(0, VERIFIED_ACTUAL_PAID_FOR_RETURNED_ITEMS - VERIFIED_PREVIOUS_CASH_REFUNDS - VERIFIED_PREVIOUS_CUSTOMER_CREDIT_ISSUED)`; a new request's cash **PLUS** new store-credit amount must not exceed this maximum under the normal rule.
- The original **invoice gross total is NOT a substitute** for independently verified actual payment attributable to the specific returned items. The actual allocation across multi-item/discounted/partially paid invoices is **not yet designed or accepted**.
- Any authorized cash-plus-credit combination must share the **same** remaining entitlement calculation and accounting lineage. Credit already issued must count even if not yet redeemed. Client-supplied `paid` or `previousCompensation` fields are NOT trusted sources.
- An **additional, distinct** management approval must expressly document the exact *excess amount*, returned items, invoice, request, settlement split and business justification. It must be separate from the normal management acceptance, timing review and product-defect evidence.
- Approval of an exceptional increase here is **policy-level permission to consider such a case**, NOT authorization to create a refund, add customer credit or override mandatory statutory remedies. Legal customer rights and relevant law continue to take precedence.
- No real server-side payment allocation, true refund/store-credit ledger, authentic managerial role verifier, compensating entries or live payment operations are implemented by this test-only owner policy contract.

**Source proof:** [TrendOS Draft PR #114](https://github.com/fawakhry/TrendOs/pull/114) contains a review-only amount contract and negative tests. The tests use strictly invented item payments and previous refunds/credits; they DO NOT compute any real customer entitlement or post finance data.

## Owner's returned-goods stock and waste handling decision — 2026-10-12

The owner explicitly agreed on 2026-10-12 that **a product returned for manufacturing defect or Trend Mall error MUST NOT go back into saleable stock until it has been physically inspected and confirmed suitable for resale; a damaged product MUST be recorded as WASTE, not as available inventory**.

**FIFTH BOUNDED OWNER BUSINESS DECISION:**
- A physically received returned item is **held outside saleable stock** (quarantine/inspection-pending) until a verified independent quality inspection for that exact item and returned quantity exists. Mere approval of a refund, credit or return timing never implies a stock addition.
- **If verified fit for resale:** it becomes a **candidate for restocking after the appropriate inventory controls**, not an automatic stock increase. A distinct actual return/restock accounting workflow and authorization are still NOT IMPLEMENTED.
- **If verified damaged:** it must be **classified and logged as waste (هالك)** and must not re-enter saleable stock. Waste proof must reference the same return case, physical receipt, item, quantity and inspection decision. No actual finished-goods stock write or waste expense may be inferred from this policy document.
- **If inspection missing, unverified or ambiguous:** no restock or waste booking may occur; the item remains isolated pending further review. Duplicate returns or repeat inspections cannot double-count stock or waste.
- The checked-in Worker already has `saveAccountingWaste` for department/material waste, but this is **NOT a verified finished-product customer-return / physical receipt / quality-inspection / restock handler**. It cannot be used as proof that real returns or post-return inventory valuation are implemented.
- Outstanding details: damaged-item cost/valuation, expenses, partial-unit returns, proof evidence custody, finished goods vs raw material SKU mapping, disposal authorization, collection/transport/storage, and post-close reversals remain **UNDECIDED**; statutory consumer rights are unchanged.

**Source-only proof:** [TrendOS Draft PR #115](https://github.com/fawakhry/TrendOs/pull/115) adds purely synthetic inspection and `:memory:` SQLite stock/waste tests. No real inventory, D1, customer payment or printshop job is touched.

## Remaining decisions not yet covered by the five owner approvals
The following requirements remain **UNDECIDED** and require separate decisions before implementation/acceptance.

1. **Eligibility & proof — PARTIALLY DECIDED:** customer-name/photo customized products are ineligible except where a manufacturing defect or Trend Mall error is independently verified. Other product categories, invoice/payment evidence requirements, proof format, partial-item returns and detailed acceptance workflow still require **OWNER_DECISION=UNDECIDED**. The **timing rule itself is DECIDED**: per-case management review without an internal fixed-day cutoff.
2. **Refund amount — CEILING DECIDED, CALCULATION IMPLEMENTATION PENDING:** ordinary total cash plus credit plus prior compensation cannot exceed **verified actual amount paid for the returned items**. Exact payment allocation for discounts, part-payment, deposits, unpaid balances, multiple items and payment methods; historical compensation evidence; and exceptional amount documentation remain **IMPLEMENTATION/DETAILS=UNDECIDED**.
3. **Remaining payment detail and authority:** cash refund, customer credit and a mixed settlement are now approved conditionally; whether cash reimbursement is paid from cashbox vs InstaPay/bank/original tender, daily/per-employee limits, specific manager identity and role verification, any dual approval, custody/handover and signed receipt requirements are **OWNER_DECISION=UNDECIDED**.
4. **Inventory treatment — INSPECTION AND WASTE PRINCIPLE DECIDED:** returned goods must stay outside saleable stock until independently inspected and verified fit for resale. Damaged returns must be logged as waste, never restocked. Actual proof format, product/raw-material mapping, waste cost/valuation, stock transactions, authorized disposal, stock quantity guards, supplier effects and closed-day compensation remain **DETAILS/IMPLEMENTATION=UNDECIDED**.
5. **Post-close and disputes:** treatment of already-closed invoices/days, replacement invoices, held payments, chargebacks, duplicate or concurrent claims and dispute expiry. **OWNER_DECISION=UNDECIDED**
6. **Operational signoff:** the owner has authorized **bounded business rules for settlement method, named/photo exception, case timing and amount ceiling**, not individual financial transactions. Specific real management approval chain, effective policy version, source-review signoff and independent production GO remain **OWNER_DECISION=UNDECIDED**.

## ACC-187/198 follow-up — anti-double-settlement rehearsal, NOT owner amount policy

[TrendOS Draft PR #113](https://github.com/fawakhry/TrendOs/pull/113) adds two **test-only** protections. First, the checked-in original Worker under fake single-database SQLite refuses six unsupported cash/customer-credit action names without changing any accounting table row. Second, a completely separate fake SQLite ledger demonstrates a conservative **historical hypothetical invoice-wide** cash-and-credit ceiling, unique-request idempotency, and denial of attempted extra or recycled settlements. It was designed **before** the later owner's actual-paid-for-returned-items decision. That older invoice-wide mock is NOT sufficient to prove the now-approved item-level entitlement.

**Later resolved rule:** normal cash+credit compensation cannot exceed the amount actually PAID for RETURNED items less prior cash+credit, with excess only by a separate management exception approval. Exact allocation for partially paid/discounted/post-close invoices remains to be designed; no live finance handler may use the older invoice-wide mock ceiling as a substitute.

The actual backend still has no authorized customer cash-return or store-credit posting handler, no real management authorization chain, no production cutover, and no execution permission. These test results are not an ACC187 close.

## Customer debt adjustment is NOT spendable store credit — source audit

The checked-in Worker has a generic customer-party ledger action `savePartyLedgerTransaction` / `saveCustomerAccountMovementV1915` supporting `adjustment_decrease`. In the reviewed source, this **reduces an existing customer debt balance**, is restricted to the `full` accounting role for adjustment operations, and **does not itself generate a customer cash refund or an independently spendable store-credit liability**. It therefore **MUST NOT** be relabeled or re-used as an approved ACC187 refund/credit settlement.

A distinct future real store-credit design, with owner-approved liability/accounting treatment, case/amount/method/manager binding, idempotency, reconciliation and financial authority guards, remains **UNDECIDED** and **NOT IMPLEMENTED**. The source-audit regression is **not** a proof that all other possible financial actions are safe or that a real refund cannot be miscategorized.

## Proposed fail-closed engineering acceptance (not authorization)
Before refund handling can be marked ACC187 complete, source-only tests should exercise real native Worker logic against invented SQLite for full/partial/zero/overpaid refunds, denied unauthorized roles, duplicate IDempotency keys, concurrent refund caps, negative stock refusal, account/cash/stock/ledger atomicity, and reversal after day close. Tests must show compensated transactions rather than destructive invoice deletion, original lineage and immutable audit proof. A separate owner-approved acceptance is still required for real funds.

Until the policy is signed and a guarded native implementation is independently qualified:

```ini
ACC187_CUSTOMER_CASH_REFUNDS=UNSUPPORTED_FAIL_CLOSED
ACC187_OWNER_SETTLEMENT_METHODS=CASH_REFUND_OR_CUSTOMER_CREDIT_OR_BOTH_TOGETHER
ACC187_METHOD_REQUIRES_CASE_MANAGEMENT_APPROVAL=YES
ACC187_TOTAL_NORMAL_COMPENSATION=ACTUAL_PAID_FOR_RETURNED_ITEMS_MINUS_ALL_PREVIOUS_CASH_AND_STORE_CREDIT
ACC187_AMOUNT_ABOVE_NORMAL_CAP=SEPARATE_MANAGER_EXCEPTION_APPROVAL_REQUIRED
ACC187_ITEM_PAYMENT_ALLOCATION_AND_REAL_LIABILITY=NOT_IMPLEMENTED
ACC187_RETURNED_GOODS_BEFORE_INSPECTION=NOT_SALEABLE_QUARANTINED
ACC187_RESTOCK_ONLY_AFTER_VERIFIED_FIT_FOR_RESALE=YES
ACC187_DAMAGED_RETURN=WASTE_NOT_SALEABLE_STOCK
ACC187_FINISHED_GOODS_RETURN_RESTOCK_WASTE_HANDLERS=NOT_IMPLEMENTED
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
