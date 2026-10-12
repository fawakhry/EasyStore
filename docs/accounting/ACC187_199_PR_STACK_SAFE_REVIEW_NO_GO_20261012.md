# ACC187–199 — Stacked source PR dependency and merge-safety audit (NO_GO)

**Observed 2026-10-12; non-operational GitHub metadata + checked-in files only.**
**THIS IS A REVIEW ARTIFACT, NOT MERGE APPROVAL OR OWNER FINANCE GO.**

## Exact-head dependency inventory

Each TrendOS PR was fetched by number from `fawakhry/TrendOs`. All 13 were **OPEN DRAFT / unmerged** and GitHub reported `mergeable=true` into their respective immediate bases at inspection time. The base commit of each subsequent PR matched the preceding PR head. This verifies the **published PR metadata relationship**, not a safe final merge into the production-candidate branch.

| TrendOS PR | Exact observed source SHA (abbrev.) | Immediate base | Successful PR source workflow | Scope |
| --- | --- | --- | --- | --- |
| [#106](https://github.com/fawakhry/TrendOs/pull/106) | `f13fac313261` | TrendOS candidate | [SUCCESS #38251951924](https://github.com/fawakhry/TrendOs/actions/runs/38251951924) | ACC195 pinned source/config guard |
| [#107](https://github.com/fawakhry/TrendOs/pull/107) | `44891edaf666` | #106 | [SUCCESS #38253348191](https://github.com/fawakhry/TrendOs/actions/runs/38253348191) | ACC196-199 mock safety ledger and preflight |
| [#108](https://github.com/fawakhry/TrendOs/pull/108) | `1fd7b4af411a` | #107 | [SUCCESS #38256536994](https://github.com/fawakhry/TrendOs/actions/runs/38256536994) | ACC191 isolated Chromium, ACC198 fake Worker SQLite |
| [#109](https://github.com/fawakhry/TrendOs/pull/109) | `4bec3bce5d47` | #108 | [SUCCESS #38257418176](https://github.com/fawakhry/TrendOs/actions/runs/38257418176) | ACC197 A2.13 local SELECT-only denial |
| [#110](https://github.com/fawakhry/TrendOs/pull/110) | `3d7b0b62c586` | #109 | [SUCCESS #38258745629](https://github.com/fawakhry/TrendOs/actions/runs/38258745629) | ACC187 management-gated cash/credit methods |
| [#111](https://github.com/fawakhry/TrendOs/pull/111) | `bfd911df7bd7` | #110 | [SUCCESS #38260245917](https://github.com/fawakhry/TrendOs/actions/runs/38260245917) | personalized goods seller-fault exception |
| [#112](https://github.com/fawakhry/TrendOs/pull/112) | `c95d222f8447` | #111 | [SUCCESS #38261456538](https://github.com/fawakhry/TrendOs/actions/runs/38261456538) | management-discretion timing, no fixed expiry |
| [#113](https://github.com/fawakhry/TrendOs/pull/113) | `a740194391a3` | #112 | [SUCCESS #38264415221](https://github.com/fawakhry/TrendOs/actions/runs/38264415221) | denied native credit/refund and fake idempotency |
| [#114](https://github.com/fawakhry/TrendOs/pull/114) | `7a905283fde6` | #113 | [SUCCESS #38265680885](https://github.com/fawakhry/TrendOs/actions/runs/38265680885) | paid returned-items compensation cap and separate exception |
| [#115](https://github.com/fawakhry/TrendOs/pull/115) | `f3ce6906524f` | #114 | [SUCCESS #38267708897](https://github.com/fawakhry/TrendOs/actions/runs/38267708897) | physical return inspection, waste and fake stock |
| [#116](https://github.com/fawakhry/TrendOs/pull/116) | `f20bda8813c9` | #115 | [SUCCESS #38269449987](https://github.com/fawakhry/TrendOs/actions/runs/38269449987) | manufacturing-cost waste, separate third-party recovery |
| [#117](https://github.com/fawakhry/TrendOs/pull/117) | `31e1c1b9180a` | #116 | [SUCCESS #38271542131](https://github.com/fawakhry/TrendOs/actions/runs/38271542131) | material + labor + allocated overhead component proof |
| [#118](https://github.com/fawakhry/TrendOs/pull/118) | `c97f85f3f4aa` | #117 | [SUCCESS #38277189477](https://github.com/fawakhry/TrendOs/actions/runs/38277189477) | department allocation consistency and fake SQLite |

No TrendOS PR in #106–#118 changed the actual production Worker, D1 migration, live EasyStore frontend, employee-role records or material inventory: changes enumerated from per-PR filenames were confined to source-only tests/scripts, docs/test artifacts and NO_GO workflows. This is **not** proof that the production Worker supports returns or store-credit posting. CI was checked using `fetch_commit_workflow_runs` on each listed exact head SHA; every returned run was `completed/success`, but workflow coverage differs by PR. Do not count a successful workflow on one SHA as a postmerge test of another.

## Original accounting book is the sole authorized finance history

[EasyStore Draft PR #34](https://github.com/fawakhry/EasyStore/pull/34), head `81dfe8de447767d6145a4c86e069bd5bdecc8a59`, base `candidate/easystore-zero-google-audit-20261004` (at inspected SHA `57e59a8c6f9d8fa91af0bfb77c6cdeb3f3de056e`), is **OPEN DRAFT / unmerged**. Its only changed paths are:

- `EASYSTORE_ACCOUNTING_MASTER_BOOK.md` — historically preserved, append-only original ledger.
- `docs/accounting/ACC187_CUSTOMER_REFUND_OWNER_DECISION_PENDING_NO_GO_20261012.md` — eight bounded owner decisions, real handler gaps.
- `docs/accounting/ACC187_DEPARTMENT_OVERHEAD_POLICY_REGISTER_TEMPLATE_NO_GO_20261012.md` — **EMPTY** manager selection template, no live drivers/rates/approvals.

Original-book exact-head Actions [#38277422963](https://github.com/fawakhry/EasyStore/actions/runs/38277422963) (ACC146–156 gap), [#38277423003](https://github.com/fawakhry/EasyStore/actions/runs/38277423003) (ACC001–193 numbering), and [#38277423009](https://github.com/fawakhry/EasyStore/actions/runs/38277423009) (canonical book recovery) all **SUCCESS**. This extra review document is a **new proposed docs-only file on that same PR**, so verify the new EasyStore exact-head audits again before calling this updated doc revision green.

## Concrete red flags — do not trigger

The preexisting `fawakhry/TrendOs@candidate/easystore-accounting-a2-20261005:.github/workflows/easystore-a2-accounting-readonly-api-deploy.yml` contains **`workflow_dispatch`**, Cloudflare API/account secret references, **an unpinned shared-base merge from `candidate/t12-full-cloud-cutover-a56-20260929`**, real `npx wrangler d1 execute --remote` commands and **`npx wrangler deploy`** plus automatic rollback. The manual workflow must **NEVER** be used to qualify, merge, redeploy, restore or test these PRs. It is not equivalent to the read-only/source-only workflows whose CI was reviewed.

Actual finance-readiness G1–G5, current live OFF/READONLY state, protected backup/restore, real managerial identity, customer SSO and staff/browser acceptance were **NOT re-measured** here; previously reported live statuses are historical. The presence of successful isolated Chromium and SQLite tests does not constitute real SSO, real refund/credit, waste/restock or production-accounting qualification.

## Safe review/checkpoint checklist before any merge

1. **Do not merge drafts automatically.** Human owner/reviewer must separately authorize any progression; **financial GO is distinct** from a reviewed source-only merge. Confirm target candidate protection, review rules and CI side effects first.
2. Confirm each PR's exact current head/base SHA again, ensure no concurrent changes, conflicts, unexpected file paths, deploy triggers, secrets, Cloudflare/D1 calls, write permission escalation or unauthorized changes to already merged accounting stages.
3. Pin any shared source/build input to an exact reviewed SHA; never use the legacy deploy workflow's floating merge or live secrets for qualifications.
4. If an explicitly authorized **source-only** merge is later performed, preserve chronological dependency order **#106 → #118**, one controlled reviewed step at a time with fresh merged-head source CI; re-evaluate changed base SHAs and reviewer approvals on each step. A GitHub `mergeable=true` flag does **not** equal runtime readiness.
5. Independently review and then merge EasyStore **original** accounting book PR #34 only under its own documentation policy and checked SHA; re-run append-only audit and numbering coverage postmerge. Never migrate the accounting book's history to `TrendOS_MASTER_BOOK.md`.
6. Continue ACC187 design **only source-only and fictional-data work** until true manager verifier, eligible amount payment history, spendable customer-credit liability, returned product cost/stock handling, overhead allocation details and actual signed manager selection have separate acceptance.
7. G1 actual operational readiness, G2 roles/SSO, G3 opening stock/financial reconciliation, G4 real finance posting and G5 deployment/rollback all remain owner-controlled **OPEN**. No startup/cutover date, production D1/Cloudflare, refund, import/delete, staff grant, canary, live rollback or Autonomous Printshop action is authorized.

`ACCOUNTING_PR_CHAIN=OPEN_DRAFT_UNMERGED`  
`ACC187_GOVERNANCE_POLICY_SOURCE_CI=PASS_EXACT_PR_HEAD_ONLY`  
`ACC187_REAL_DEPARTMENT_DRIVER_AND_SIGNED_MANAGER_APPROVAL=PENDING`  
`ACC187_REAL_CUSTOMER_REFUND_AND_STORE_CREDIT=NOT_IMPLEMENTED`  
`ACC191_REAL_STAFF_SSO=NOT_ACCEPTED`  
`ACC198_FULL_REAL_FINANCE_ACCEPTANCE=BLOCKED`  
`ACC199_FINAL_HANDOFF=BLOCKED`  
`ACCOUNTING_G1=OPEN G2=OPEN G3=OPEN G4=OPEN G5=OPEN`  
`FINANCE_RELEASE=NO_GO`

**All observations concern source/PR metadata only. No deployment or live account operation was performed.**
