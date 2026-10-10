# A2.13 one-command, zero-value custody close — PREPARE only

Date: 2026-10-10. Scope: prepare the **EasyStore frontend client**, no finance or production release.
Source: `fix/easystore-sso-reused-window-20261010` @ `ce332dfec4a084ae89b4527ff19cc1a26d0b566f`, SSO hardening [PR #23](https://github.com/fawakhry/EasyStore/pull/23).
TrendOS monitored canary workflow: `candidate/easystore-accounting-a2-20261005`, released manual-only observation fix [PR #41](https://github.com/fawakhry/TrendOs/pull/41).

## Only safe frontend candidate
- `config.js`: `EASYSTORE_ACCOUNTING_D1_READONLY=true`, `EASYSTORE_ACCOUNTING_D1_WRITES=false`, `EASYSTORE_ACCOUNTING_D1_WRITE_MODE='CANARY'`, `EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS=['closePurchaseCustodyV1920']`.
- These frontend flags **cannot** activate D1 by themselves; the server must separately be armed by its 15-minute, one-employee, one-command, zero-value manual workflow. While Production is READONLY, all finance commands remain blocked.
- Require an authenticated, real Diaa session transferred from the published TrendOS UI. No standalone EasyStore password and no bearer token in GitHub. The canary button is synthetic only: department عام, workDate 2099-12-31, request prefix A213-CCLOSE-, employee prefix A2-CANARY-CUSTODY-, zero-balance and no cashbox/stock settlement.
- Frontend gets one-click latch for this session to avoid concurrent duplicate HTTP requests. Server's request-key idempotency and one-command budget remain the authoritative guard.

## Release and rollback dependency checklist
1. Confirm Cloudflare Accounting `READONLY`, zero allowed actions, zero started commands, and old A2.13 request/close absent by independent read-only D1 reconciliation. Historical supplier A2.10 is DONE and must not be rerun.
2. **Verify real Diaa SSO with EasyStore in read-only mode**, including role and authorized screen. No tokens/passwords/screenshots containing secrets in the chat.
3. Review and release EasyStore SSO hardening [PR #23](https://github.com/fawakhry/EasyStore/pull/23), then review this *dependent* canary config candidate; do not publish it ahead of a scheduled pilot.
4. Confirm the on-site operator is present and can see the `A2.13 Canary` zero-balance button. Only then run the existing GitHub **manual** A2.13 workflow against the exact candidate revision; it will arm one bounded action and wait for one operator click. **Never manually dispatch while no operator is ready.**
5. One click only after `A213_EXEC_WAITING_FOR_DIAA_CLICK=YES` in the authorized run. Do not reload, repeat a click, or change session during the pilot. If outcome is unknown, STOP and do read-only reconciliation. Cleanup must restore READONLY.
6. Immediately revert frontend config to `OFF`, permitted canary actions `[]`, and verify Production GitHub Pages config and D1 health; capture exact D1 ledger+custody-close+event counts and prove no cashbox, stock, or party-ledger side effects.

## Current status
**NOT DEPLOYED, NOT ARMED, NO LIVE FINANCIAL PILOT RUN.** This document/branch is a release candidate, not permission to bypass SSO, server authorization, owner signoff, or idempotency/cleanup controls. Real-user browser smoke and explicit timed launch coordination remain required.


## 2026-10-10 — safe OFF recovery and server-armed UI gate
- Pilot frontend **still not deployed**. The public site remains `WRITE_MODE=OFF`, allowed actions `[]`, global writes=false.
- `a213PilotHealthAllowsOneCommand()` additionally requires a GET-only live API health report of `CANARY` + `CANARY_BOUNDED`, one allowed user, one action, zero max amount, max one command, zero consumed, unexpired by more than 10 seconds, plus exact authenticated Diaa username. Network failures/mismatches hide the button. Browser polls every 5 seconds while pilot candidate config is present and automatically hides after server shutdown; only D1 grants authority.
- New automatic visual hiding does **not** undo the published static `CANARY` config. The production `OFF` restore remains a required step after the pilot. A dedicated `scripts/a213-close-frontend-config.mjs` requires explicit `--write <config.js>`, rejects unrecognized modes or permissions, and was successfully tested on temporary files. Do not claim this alone establishes a working GitHub Pages production rollback.
- The stale rollback branch `rollback/a213-off-after-pilot-20261010` was corrected to the byte-verified `OFF` and SSO-safe baseline commit `d075694ba9d5dddf50da919587084a9630ad8f1b` (Git blob `504a4b3df0e7aebc57c5e589298df4c126fa0454`). `release/a213-off-sso-verified-20261010` provides another immutable-pinned naming reference to the same baseline.
- [ACC pilot and simulated OFF recovery run 38058989097](https://github.com/fawakhry/EasyStore/actions/runs/38058989097) **PASS**; [Cloud Safety 38058991234](https://github.com/fawakhry/EasyStore/actions/runs/38058991234) **PASS**. No live A2.13 execution, financial D1 SQL write, frontend CANARY deploy, or Google Sheets mutation.
- Required before real pilot: production frontend-only publish with tested rollback deployment path; single authorized operator present; exactly one manual GitHub A2.13 workflow dispatch; wait until its `A213_EXEC_WAITING_FOR_DIAA_CLICK=YES` log before clicking; observe atomic D1 outcome and automatic server READONLY cleanup; then publish `OFF` and independently verify live frontend and backend closure.
