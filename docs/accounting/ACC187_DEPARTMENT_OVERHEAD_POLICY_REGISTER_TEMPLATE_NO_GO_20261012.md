# ACC-187 — Department production overhead allocation policy register (TEMPLATE ONLY)

**2026-10-12 | Owner governance decision #8 | NO_GO / NOT AN APPROVED COSTING METHOD**

Owner approved this **governance principle only**: management selects a documented overhead allocation method appropriate to each department (e.g. printing, laser), and applies it consistently and fairly to comparable production jobs. Management may choose different drivers for genuinely different departments or work classes where documented and justified. No department's live allocation method, rate, source costs, accounting period or effective approval has yet been supplied.

## Register status — no live method selected

| Department | Comparable production work class | Driver and calculation | Cost-pool source | Effective from/to | Manager approval reference | Evidence and fairness review | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Printing / طباعة | NOT_DEFINED | PENDING_MANAGEMENT_SELECTION | NOT_VERIFIED | NOT_SET | NOT_GRANTED | NOT_VERIFIED | NO_GO |
| Laser / ليزر | NOT_DEFINED | PENDING_MANAGEMENT_SELECTION | NOT_VERIFIED | NOT_SET | NOT_GRANTED | NOT_VERIFIED | NO_GO |
| Other / أقسام أخرى | NOT_DEFINED | PENDING_MANAGEMENT_SELECTION | NOT_VERIFIED | NOT_SET | NOT_GRANTED | NOT_VERIFIED | NO_GO |

**These rows are empty templates**, not accounts, live overhead pools, cost drivers, approved management choices, effective dates, or authorized manager identities.

## Fields required for an individual management-approved method

A department/work-class method cannot become active until management independently documents **all** of: the department and the exact class of comparable jobs; management-selected allocation driver and why it is fair for those jobs; included and excluded production-expense categories; authentic evidence of the shared overhead cost pool, its period and permitted source; driver-unit measurement source and controlled audit evidence; an unambiguous computation method with cost per unit/job, rounding and any residual-cent reconciliation; independent manager approval reference and verifiable role; effective-from and effective-until timestamps; a stable policy ID/version; and a test for other overlapping registered versions of the same comparable scope.

A separate procedure must establish treatment of mixed-purpose jobs, unfinished orders, rework, idle capacity, production jobs spanning periods, credits/refunds after the close, retroactive corrections, and accidental double allocation of the same expense or direct-labor amount. These are **not** settled by owner decision #8.

## Example categories — for comparison only, NOT adopted

The following are **hypothetical approaches** management may later examine: machine minutes for equipment-intensive work; measured direct-labor hours for manually intensive work; inspected good units for more homogeneous production runs. These are alternatives, not mandated or selected methods. **No default formula**, silent rate, cost-pool basis, or automatic distribution is authorized.

## Consistency, fairness and change-control requirements

1. **Like-for-like method stability:** the same department, comparable work class, and covered period must use the same registered method and effective revision for every qualifying job. A job may not choose another formula simply to increase or decrease its cost.
2. **No conflicting overlap:** two distinct policy revisions must not both claim authority for the same department/work class during overlapping effective dates, even when different accounting-period labels are used. A new driver requires a separate documented management decision and prospective effective date.
3. **No reused proof or duplicated cost:** one overhead source entry, labor component, or production-job allocation record cannot silently be applied twice. The real allocation must reconcile the complete accepted source pool, numerator/denominator, unit/job shares and unavoidable rounding residual.
4. **Fail closed:** undocumented driver, missing source or evidence, future/past ineffective revision, incomplete manager authorization, unknown category, inconsistent input units, bad amounts, and inability to reconcile rounding or prior postings must lead to **STOP / REVIEW**, not a guessed allocation.
5. **Separate cost components:** material cost and direct labor cost must remain separately evidenced. Verified manufacturing cost of damaged returned goods continues to include all three components (**materials + direct labor + allocated production overhead**); approved supplier/responsible-party recoveries remain separate from gross waste and require case-specific management authorization.

## Actual approval worksheet (NOT FILLED)

Department: **PENDING**  
Comparable job class: **PENDING**  
Cost pool / covered expenses / source: **PENDING**  
Driver and unit proof: **PENDING**  
Allocation rate and rounding rule: **PENDING**  
Manager-selected method and business justification: **PENDING**  
Approval ID and independent evidence: **PENDING**  
Policy version and future effective dates: **PENDING**  
Other registered methods overlap check: **NOT PERFORMED**  
Independent review / manager authentication: **NOT PERFORMED**  
Actual unit/job cost acceptance: **NOT PERFORMED**  
Real Cloudflare Worker / D1 or printshop execution: **NOT AUTHORIZED**

## Source-only evidence and current blocker

On TrendOS branch `test/acc187-owner-department-overhead-fair-policy-no-go-20261012`, source-only tests exercise synthetic departmental policy records, consistent per-class method revisions, prospective change and rejection of overlapping conflicting fake registers. The GitHub PR creation action was blocked, so that branch **has not been qualified by exact-head GitHub Actions PR CI**. Local in-memory V8 checks are not a substitute for Node/GitHub CI and do not authenticate managers or calculate real production overhead. The source branch is **not deployed, merged or accepted**.

`ACC187_REAL_DRIVER_CHOSEN=NO`  
`ACC187_REAL_MANAGER_REGISTER=NOT_IMPLEMENTED`  
`ACC187_REAL_MANUFACTURING_COST_ALLOCATION=NOT_IMPLEMENTED`  
`ACC187_FINANCE_AND_INVENTORY_POSTING=NOT_IMPLEMENTED`  
`G1=OPEN G2=OPEN G3=OPEN G4=OPEN G5=OPEN FINANCE_RELEASE=NO_GO`

This is a management-decision template, NOT the official stage completion record. All execution/evidence history is to be appended only to the original EasyStore `EASYSTORE_ACCOUNTING_MASTER_BOOK.md`; never to the generic TrendOS book.
