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

## Follow-up: ACC199 pinned PR changed-file security preflight — new Draft #119

A new **fourteenth** dependent source-only proposal was prepared AFTER the 13-PR inventory above: [TrendOS Draft PR #119](https://github.com/fawakhry/TrendOs/pull/119), base #118 head `c97f85f3f4aa2b69c1750aff9f9ee49144827999`; exact current PR119 head `7c635fc4fb36f9ba6e6a4397d5000c824a3d0d3e`. All predecessors #106–#118 remain DRAFT/unmerged, so this is NOT a source merge or activation.

**New independent read-only check:** `scripts/easystore_acc199_pr_diff_safety_gate_no_go.py` reads ONLY the locally checked-out git DAG and compares the exact PR event head to its exact pinned base SHA, requiring base ancestry and refusing unexpected modified paths. The allowlist accepts narrowly named source-only test scripts, staged NO_GO docs, and audit workflow files; excludes real Worker, D1, app/config, original TrendOS master, legacy manual Cloudflare deploy and all unrelated paths. Renames/deletes, unexpected diff statuses and symlink changes fail closed. New audit workflows need explicit `pull_request` trigger, read-only repository permission and checkout persistence disabled; known secrets, production environments, privilege escalations, non-PR triggers, `wrangler deploy/rollback/d1 execute`, deployment actions and git mutation commands are rejected in **changed workflows**. The historical hazardous manual deploy workflow is deliberately read by the negative test but NEVER run or edited.

**Exact-head evidence:** [GitHub Actions #38279570834](https://github.com/fawakhry/TrendOs/actions/runs/38279570834) **SUCCESS** (job `114913267014`), **17/17** Python adversarial tests passed, and the real local git diff preflight emitted `ACC199_PR_SOURCE_DIFF_GATE=PASS_SOURCE_ONLY` for exactly **4 new files**. Same exact head [ACC196–199 #38279570826](https://github.com/fawakhry/TrendOs/actions/runs/38279570826) and [A61 #38279570822](https://github.com/fawakhry/TrendOs/actions/runs/38279570822) were **SUCCESS**. This check is NOT a proof of safe arbitrary code in the allowlisted files, comprehensive permission/auth audit, merged-SHA verification, or production deploy readiness; the old manual workflow remains capable of live effects if separately invoked.

**Hard restrictions unchanged:** PR119/PR118 and upstream remain Draft, EasyStore PR34 remains Draft, full accounting stages ACC187/191/198/199 are not operationally accepted; no genuine management approval, department allocation, payout or customer-credit liability is enabled. All `G1–G5=OPEN` and `FINANCE_RELEASE=NO_GO`. The reviewer must still inspect every actual diff and job definition independently before any authorized source-only merging; **no merges or live actions were performed**.

## ACC199 follow-up: full PR coverage security trigger correction (2026-10-12)

**Confirmed security gap in initial Draft PR #119**: `pull_request.paths` limited execution of the source-only guard to a few files; a dangerous change **only to production/accounting paths** could therefore fail to **trigger** the guard at all. The 17-test green result on the earlier PR head did **not** demonstrate universal triggering. This gap has now been addressed on the still-Draft PR119.

**Correction:** The security workflow's `on: pull_request` no longer has any `paths`, `paths-ignore`, `branches`, or `branches-ignore` restrictions. The **exact SHA head/base diff check runs before the untrusted branch's test code**. The static workflow inspector now rejects file/branch filters on newly added or changed guard workflows, and adversarial tests assert the real checked-in workflow contains no such filter and preserves execution order.

**Exact verified revision:** [TrendOS PR #119](https://github.com/fawakhry/TrendOs/pull/119), exact head `3d9a69fe3ddf9b90fb4c138bc5e4fc64d377adfb`. [ACC199 source-only diff CI #38280639155](https://github.com/fawakhry/TrendOs/actions/runs/38280639155) **SUCCESS** on this exact head, including the prior **20/20** negative/guard tests and the pinned diff. Same commit [ACC196–199 #38280639175](https://github.com/fawakhry/TrendOs/actions/runs/38280639175) **SUCCESS**, [A61 #38280639140](https://github.com/fawakhry/TrendOs/actions/runs/38280639140) **SUCCESS**. The workflow still uses only checkout source and empty Cloudflare environment variables.

**Remaining trust boundary:** a `pull_request` workflow defined in or executed from a user-changeable branch, and any scripts and tests within allowed paths, **cannot be an independent tamper-proof security enforcement boundary**. A malicious modification of the checker could pass a superficial allowlist. Proper protected branch rules, trusted reviewer-controlled checks, code-owner review, separately pinned independently run checks, and owner authorization are still prerequisites to any merge. Historic manual Cloudflare deploy workflow is unmodified and still separately actionable; never trigger it here.

**Release status unchanged:** PR119 remains **OPEN DRAFT / UNMERGED**, its successful CI is a source-only safeguard, not financial approval or a deployed runtime proof. `ACC187=IN_PROGRESS_UNVERIFIED`; `ACC198=PARTIAL_SYNTHETIC_ONLY`; `ACC199=HANDOFF_DRAFT`; `G1=OPEN G2=OPEN G3=OPEN G4=OPEN G5=OPEN FINANCE_RELEASE=NO_GO`. No source merge, Cloudflare deployment, real D1 request, real balance, stock, supplier recovery or printshop operation was performed.
