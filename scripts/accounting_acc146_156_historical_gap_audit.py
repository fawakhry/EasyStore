#!/usr/bin/env python3
"""Offline historical ACC146..156 gap and original canonical book provenance guard."""
import argparse
import json
import re
import subprocess
from pathlib import Path

BASE = "456389d9a55fc546d23cc4d37855bfa440278a49"
AUDIT = "a6e88dcf4675bfd6ce83952e6b5362cee2f69170"
BOOK = "EASYSTORE_ACCOUNTING_MASTER_BOOK.md"
MANIFEST = "docs/accounting/ACC146_156_HISTORICAL_EVIDENCE_INDEX_20261012.json"
RUNS = {146:38047096908,147:38047282560,148:38047615198,
        149:38047828371,152:38048340853,154:38048937400,
        155:38049092622}
NO_RUN = {150,151,153,156}

class GapStop(ValueError):
    pass

def demand(ok,label):
    if not ok:
        raise GapStop("ACC146_156_STOP_" + label)

def validate(book,old,manifest,source):
    demand(book.startswith(old.rstrip()+"\n\n---\n"),"CANONICAL_PREFIX_CHANGED")
    demand("single canonical accounting project book" in book,"CANONICAL_RULE_CHANGED")
    demand("UNKNOWN/REQUIRES_GIT_HISTORY_RECONCILIATION" in old,
           "OLD_GAP_AUDIT_NOTE_ERASED")
    demand("ACC-187" in old and "ACC-193" in old,"OTHER_IMPORTED_HISTORY_REMOVED")
    demand(manifest.get("schema")=="ACC146_156_CANONICAL_GAP_HISTORIC_EVIDENCE_V1",
           "SCHEMA_DRIFT")
    target=manifest.get("target",{})
    demand(target.get("repo")=="fawakhry/EasyStore" and
           target.get("path")==BOOK and
           target.get("previous_book_commit")==BASE,
           "WRONG_CANONICAL_BOOK")
    provenance=manifest.get("source",{})
    demand(provenance.get("audit_commit")==AUDIT and
           provenance.get("audit_pr_state_at_recovery")==
           "OPEN_DRAFT_UNMERGED_DO_NOT_MERGE",
           "OLD_PR39_PROMOTED")
    expected=list(range(146,157))
    all_stages=[int(n) for n in re.findall(r"^### Entry ACC-(\d{3})",book,re.M)]
    demand([n for n in all_stages if 146<=n<=156]==expected,"MISSING_OR_DUPLICATE_STAGE")
    records=manifest.get("entries")
    demand(type(records) is list and [x.get("n") for x in records]==expected,
           "INDEX_NOT_ELEVEN_STAGES")
    for x in records:
        n=x["n"]
        section=book.split("### Entry ACC-"+str(n)+" —",1)[1]
        if n<156:
            section=section.split("### Entry ACC-"+str(n+1)+" —",1)[0]
        else:
            section=section.split("### Reconciliation, outstanding approvals",1)[0]
        demand(x["status"] in section,"STATUS_ABSENT_"+str(n))
        demand(x["description"] in section and x["limitation"] in section,
               "EVIDENCE_OR_LIMIT_MISSING_"+str(n))
        demand(re.fullmatch(r"[0-9a-f]{40}",x.get("commit","")) and
               x["source_git_commit_url"] in section,
               "SHA_PROVENANCE_ABSENT_"+str(n))
        demand("ACC-"+str(n) in source,"NOT_IN_20261010_PINNED_AUDIT_"+str(n))
        if n in RUNS:
            run=x.get("run")
            demand(isinstance(run,dict) and
                   type(run.get("id")) is int and
                   run["id"]==RUNS[n] and
                   re.fullmatch(r"[0-9a-f]{40}",run.get("sha","")) and
                   x.get("run_url") in section,
                   "HISTORIC_CI_EVIDENCE_INVALID_"+str(n))
        else:
            demand(n in NO_RUN and x.get("run") is None and x.get("run_url") is None,
                   "FABRICATED_STAGE_RUN_"+str(n))
        demand(x.get("owner_blocked") is (n==156),
               "OWNER_GATE_MISLABELED_"+str(n))
    prod=manifest.get("production",{})
    demand(prod.get("finance_release")=="NO_GO" and
           type(prod.get("cash_or_d1_business_writes_this_recovery")) is int and
           prod["cash_or_d1_business_writes_this_recovery"]==0 and
           prod.get("employee_grants_changed") is False and
           prod.get("cloudflare_deployed") is False and
           prod.get("historical_canary_replayed") is False and
           prod.get("cutover_date_local") is None,
           "PRODUCTION_GO_FABRICATED")
    demand(prod.get("gates")=={g:"OPEN" for g in ("G1","G2","G3","G4","G5")},
           "GATE_PREMATURELY_CLOSED")
    demand("38047798607" in book and "38047828371" in book,
           "OLD_FAILURE_CONCEALED")
    demand("Issue #40" in book and "OWNER APPROVAL STILL OPEN" in book,
           "REAL_ROLE_SIGNOFF_FABRICATED")
    demand("PR #39" in book and "UNMERGED" in book and
           "must not be merged" in book.lower(),
           "DRAFT_HISTORY_INCORRECTLY_MERGED")
    return {"original_canonical_book_prefix":"BYTE_FOR_BYTE_PRESERVED",
            "numbered_stages":expected,"historical_successful_ci_count":7,
            "document_only_or_owner_gate_count":4,
            "historical_source_pr39":"DRAFT_UNMERGED_DO_NOT_EXECUTE",
            "owner_gates":["G1_OPEN","G2_OPEN","G3_OPEN","G4_OPEN","G5_OPEN"],
            "release_decision":"NO_GO","production_mutations":0}

def main():
    args=argparse.ArgumentParser()
    args.add_argument("--audit-path",default="trendos-historical-audit")
    args.add_argument("--out",default="artifacts/acc146-156-gap-NO_GO.json")
    p=args.parse_args()
    old=subprocess.check_output(["git","show",BASE+":"+BOOK],text=True)
    book=Path(BOOK).read_text(encoding="utf-8")
    index=json.loads(Path(MANIFEST).read_text(encoding="utf-8"))
    src=(Path(p.audit_path)/"docs/trendos/staging/ACC145_D1_READONLY_RESUME_PREPARE_20261010.md").read_text(encoding="utf-8")
    proof=validate(book,old,index,src)
    dest=Path(p.out);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(proof,indent=2)+"\n",encoding="utf-8")
    print("ACC146_156_ELEVEN_NUMBERED_ACCOUNTING_STAGES_RESTORED=PASS")
    print("ACC146_156_ORIGINAL_EASYSTORE_BOOK_BYTES_PRESERVED=PASS")
    print("ACC146_156_SEVEN_HISTORICAL_SUCCESSFUL_CI_REFERENCES=PASS")
    print("ACC146_156_G2_OWNER_APPROVAL_OPEN_AND_FINANCE_NO_GO=PASS")
    print("ACC146_156_PRODUCTION_MUTATIONS=ZERO")

if __name__=="__main__":
    try:
        main()
    except (GapStop,OSError,subprocess.CalledProcessError) as exc:
        raise SystemExit(str(exc)) from exc
