# ACC-199 — Trusted review & protected-branch evidence packet (NO_GO)

**Prepared 2026-10-12 — SOURCE-ONLY / NO MERGE / NO DEPLOY.**  
**Purpose:** distinguish successful **PR-controlled test code** from evidence of an **independently managed enforcement boundary** for TrendOS / EasyStore accounting.

## Actual observations, not assumptions

| Evidence check | Observed state | Classification |
| --- | --- | --- |
| TrendOS [Draft #119](https://github.com/fawakhry/TrendOs/pull/119) | OPEN / DRAFT / UNMERGED; source head `3d9a69fe3ddf9b90fb4c138bc5e4fc64d377adfb`; base `test/acc187-owner-department-overhead-fair-policy-no-go-20261012` | Confirmed metadata |
| TrendOS [Draft #118](https://github.com/fawakhry/TrendOs/pull/118) | OPEN / DRAFT / UNMERGED; head `c97f85f3f4aa2b69c1750aff9f9ee49144827999` | Confirmed metadata |
| EasyStore [Draft #34](https://github.com/fawakhry/EasyStore/pull/34) | OPEN / DRAFT / UNMERGED; original-book head `883cd8af6114488f24a491cda1d2c519c0dde991` | Confirmed metadata |
| Independent GitHub PR review submissions on #119 / #118 / #34 | **0 reviews returned per PR** using GitHub review listing | MISSING independent signoff |
| Candidate TrendOS `candidate/easystore-accounting-a2-20261005` | `.github/CODEOWNERS` fetch returned **404** at this path | No CODEOWNERS found *at this path*; broader rulesets unknown |
| Candidate EasyStore `candidate/easystore-zero-google-audit-20261004` | `.github/CODEOWNERS` fetch returned **404** at this path | No CODEOWNERS found *at this path*; broader rulesets unknown |
| GitHub repository access | Connected account has `admin=true` on **both** public repos | Capability metadata; **not** reviewer independence or authorization to relax protection |
| Branch protection / rulesets for candidate or `main` | **NOT RETRIEVED**: connected GitHub tools offer no read action for protection rules | **UNKNOWN**, **not assumed OFF** |
| TrendOS source-only CI for exact PR119 head | [ACC199 #38280639155](https://github.com/fawakhry/TrendOs/actions/runs/38280639155), [ACC196–199 #38280639175](https://github.com/fawakhry/TrendOs/actions/runs/38280639175), [A61 #38280639140](https://github.com/fawakhry/TrendOs/actions/runs/38280639140) — all SUCCESS | **SOURCE-ONLY**, **not** trusted branch enforcement |
| Original EasyStore accounting book exact PR34 head | [Coverage #38280838225](https://github.com/fawakhry/EasyStore/actions/runs/38280838225), [History #38280838113](https://github.com/fawakhry/EasyStore/actions/runs/38280838113), [Gap #38280838123](https://github.com/fawakhry/EasyStore/actions/runs/38280838123) — all SUCCESS | Docs/history source checks only |

**Important nuance:** GitHub `mergeable=true` for a Draft PR does not establish required reviewers, approved CODEOWNERS, branch protections, externally trusted checks, owner release permission, or a safe postmerge runtime.

## The known PR119 trust boundary

The source-only PR119 check tests local `git diff` from an exact PR head against the event base SHA, rejects certain forbidden paths, non-PR triggers, job write permissions and snippets containing deploy/cloud commands. It is valuable negative testing.

**However, both the checker and the workflow/test source come from the candidate PR head.** If a future PR changes a script under an allowlisted `scripts/easystore_acc*.py` path, a name-based allowlist cannot attest to that script's behavior. A malicious PR could alter, remove or neutralize its own checker or workflow before the checks execute. An unrestricted `pull_request` trigger addresses skipping-by-path but **does not create independent trust**. Likewise, green CI on one PR SHA cannot prove the security controls applied on the actual final merged target SHA.

This limitation is **BLOCKING for treating the check as a required trusted security gate**. Do not weaken or bypass it to obtain a green status.

## Protected-branch controls required before any authorized merge

**Owner/repository-administrator action and independent verification required; this document changes NO settings.**

1. **Identify branch scope:** protect both candidate accounting branches *and* applicable `main` branches, or use an explicitly reviewed matching GitHub ruleset. Check source target and future merge base, not just the currently stacked intermediate Draft branch.
2. **Require pull requests and independently approved reviews:** require at least one non-author qualified reviewer (prefer two for finance/SSO/deploy paths), code-owner review on sensitive paths, and dismiss stale approvals when code changes. Do not count an assistant-authored description, the PR author, or successful CI as an independent review. Require all conversations resolved before merge.
3. **Restrict bypass and mutation:** block force pushes, deletion, direct pushes to protected targets, repository-admin bypass where feasible, and automated merges. An owner release approval must remain separate from PR review.
4. **Pin trusted code review enforcement outside the PR-controlled head:** required source/security verification should use protected, separately approved checker code / pinned actions and SHA (or a separately controlled GitHub App/check). Only manually supplied **verified required status contexts** should be configured. A PR may provide tests, but must not be the sole arbiter of its own trustworthiness.
5. **Require exact-head and final merged-head qualification:** verify pinned base/head SHA, full changed-file list, unit tests and explicit reviewer acceptance. For a stacked series, preserve order from TrendOS #106 to #119 only **if separately permitted for source-only merge**, recheck base SHA and reviews at each step, and run trusted source-only checks on the actual merged candidate SHA. Do not reinterpret any success as a finance/production release.
6. **Lock down deploy capabilities:** inspect the inherited `.github/workflows/easystore-a2-accounting-readonly-api-deploy.yml` (manual real Cloudflare secrets, `wrangler d1 execute --remote`, `wrangler deploy`, rollback and floating shared-base merge), ensure source-validation jobs cannot dispatch it and branch protections prevent it being casually modified. **Do not invoke or modify this workflow as part of this task**. Real deployment, backup, restore and rollback are separate owner-controlled gates.
7. **Prove the rule actually exists:** collect read-only screenshots/API-derived *current* ruleset ID, protected target pattern, required review count, codeowner applicability, bypass actor list, required status names, last update time, enforcement mode and a **rejected** safe synthetic bypass attempt where authorized. Until available, record `BRANCH_PROTECTION=UNVERIFIED`, not `OFF` and not `PASS`.

## Reviewer sign-off form — unfilled

Repository/target protected branch: **PENDING_VERIFIED_EVIDENCE**  
Ruleset/branch-protection identifier and enforcement: **NOT_RETRIEVED**  
Required independent reviewer(s): **NOT_IDENTIFIED**  
Required non-author review submissions: **0 for inspected PRs**  
Codeowner file and enforcement: **NOT_VERIFIED**  
Status checks controlled independently of PR head: **NOT_VERIFIED**  
Expected code/deploy workflow trust SHA: **NOT_APPROVED**  
Administrator/bot bypass policy: **NOT_VERIFIED**  
Source-only merge approval: **NOT_GRANTED**  
Finance/cash/credit/stock/production release: **NOT_GRANTED**  
Owner go-live/cutover date: **NOT_SET**

## Important ledger and operational status

All accounting stages and dated evidence live in the original `fawakhry/EasyStore:EASYSTORE_ACCOUNTING_MASTER_BOOK.md` on still-unmerged Draft PR #34; this reviewer packet is a subordinate work document. It does NOT alter any TrendOS master book or live business data.

`ACC199_TRUSTED_INDEPENDENT_REVIEW=NOT_VERIFIED`  
`ACC199_CANDIDATE_BRANCH_PROTECTION=UNKNOWN_NOT_RETRIEVED`  
`ACC199_PR119_PR118_PR34_REVIEW_COUNT=0_0_0`  
`ACC199_GREEN_CI=SOURCE_ONLY_NOT_MERGE_AUTHORIZATION`  
`ACC187=IN_PROGRESS_UNVERIFIED`  
`ACC198=PARTIAL_SYNTHETIC_ONLY`  
`ACC199_FINAL_HANDOFF=NO_GO`  
`G1=OPEN G2=OPEN G3=OPEN G4=OPEN G5=OPEN FINANCE_RELEASE=NO_GO`

**No PR merged, reviewer fabricated, repository settings changed, Cloudflare action dispatched, production D1 touched, financial posting made, or printshop action executed.**
