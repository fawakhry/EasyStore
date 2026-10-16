# EasyStore — Owner decision: positive customer advance credit (2026-10-16)

Status: **OWNER_POLICY_APPROVED / IMPLEMENTATION_SOURCE_ONLY / FINANCE_RELEASE=NO_GO**.

## Owner's exact business intent

If the customer pays more cash than the amount due, **accept the whole verified cash payment**. The excess is money **owed by the workshop to that customer**, displayed as a **positive (+) customer credit**, retained until automatically applied to a later invoice. This includes rounded payments, inability to give small change, fractional prices, or cash received before any invoice exists.

This decision **supersedes previous blanket overpayment rejection** for ordinary authorized customer receipts. It does **not** authorize fake payment evidence, automatic refunds, cash withdrawals, write-offs, or arbitrary AI ledger posts.

## Accounting invariant and examples (EGP)

| Event | Debt customer owes us | Positive customer credit owed by us | Net customer-facing balance |
|---|---:|---:|---:|
| Customer currently owes 97 | 97 | 0 | -97 |
| Verified cash received 100 | 0 | 3 | **+3** |
| New invoice 20 auto-applies 3 | 17 | 0 | -17 |
| Alternatively advance cash 50 with no debt | 0 | 50 | **+50** |
| Then next invoice 20 without new cash | 0 | 30 | **+30** |

Sign convention in **customer-facing display**: **+ is money for customer; - is money owed by customer**. Legacy native D1 `party_balances.balance` has the opposite accounting perspective: debt is positive and cannot be negative. **Do not blindly reverse existing SQL signs or bypass its CHECK**; the native implementation requires a separate customer-credit LIABILITY ledger, explicit balance/replay/CAS, and an owner-approved migration.

## Posting and evidence design required before runtime enabling

1. Actual physical cash receipt P posts **once** to `CUSTOMER_RECEIPT` cashbox from a trusted, verified employee/payment event and unique request ID. No AI-inferred payment.
2. `debtPaid = min(currentVerifiedDebt,P)`; `newCustomerCredit = P - debtPaid`. Persist an immutable, auditable **customer advance/liability** for the excess, never sales revenue.
3. On invoice, apply `min(priorCustomerCredit,newInvoiceTotal)` automatically and *separately* from fresh cash. Persist a distinct `creditApplied` evidence field/entry. Do **not** post credit application as new cash.
4. Customer account must expose separate `outstandingDebt`, `availableCustomerCredit` and customer-facing `displayBalance=credit-debt`. One customer should not have both positive debt and positive credit without reconciliation exception.
5. Concurrent collections and invoices require authoritative D1 atomic CAS/version checks; an unsuccessful stale command remains review-only, never automatically generates second cash/credit.
6. Exact request-key replay returns the original result; changed payload conflicts. Reversals/refunds and day-close must separately reconcile customer-credit liabilities. Existing owner approvals for waste/refunds remain intact.
7. Original invoice amount/paid-at-issuance and later customer account balance are **distinct financial facts**. Do not silently rewrite past invoices to simulate allocation. Previous customer-level receipt distribution among **older invoices** is still owner decision OPEN; the approved automatic credit deduction from the **next new invoice** is specifically distinct and now DECIDED.

## Source-only implementation evidence

- [Draft PR #56](https://github.com/fawakhry/EasyStore/pull/56) contains pure non-posting `scripts/easystore_customer_credit_carry_forward_no_go.cjs`, 16 fake-data tests and one ephemeral SQLite model that simulates cashbox uniqueness and credit liability consumption without real D1 writes.
- Test module emits `postingAllowed=false` and `financeRelease=NO_GO` even for a coherent preview.
- **Do not claim the currently deployed Worker accepts overpayments:** the pinned native code still rejects amounts exceeding outstanding customer debt, and SQLite migration `0024_employee_accounting_party_balances_v1.sql` explicitly checks debt balance cannot be negative.
- The next **source-code change** must implement the liability ledger and the actual cashier/invoice authorization flow, with full regression and post-merge/staging evidence. V1922 RTL is unchanged in this decision PR.

## Gate classification

`OWNER_DECISION=APPROVED`; `PURE_RULE=SOURCE_ONLY`; `REAL_NATIVE_ACCOUNTING_INTEGRATION=BLOCKED_NOT_IMPLEMENTED`; `CI=VERIFY_ON_PR_EXACT_SHA`; `DEPLOYED=NOT_VERIFIED`; `LIVE_VERIFIED=NOT_VERIFIED`; `G1-G5=OPEN`; `FINANCE_RELEASE=NO_GO`.

No production records, balances, employee data, stock, cash, secret, Cloudflare deployment, real Google calls, refund, real D1 writes or PR merge.
