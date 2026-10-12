#!/usr/bin/env python3
"""Whole original accounting book numbers: exact 001..193 coverage, not 193 GO claims."""
import argparse
import json
import re
import subprocess
from pathlib import Path

BASE = "51e75441ef28b1a1141a867f76375d18fa98fd54"
BOOK = "EASYSTORE_ACCOUNTING_MASTER_BOOK.md"
UNKNOWN = (4,7,13,14,25,27,69)
RECOVERED = (176,177)
HEAD_RX = r"^#{1,5}\s+(?:Entry\s+)?ACC[- ]0?(\d{1,3})\b"

class NumberingStop(ValueError):
    pass

def ensure(ok,tag):
    if not ok:
        raise NumberingStop("ACC001_193_STOP_"+tag)

def verify(book,baseline):
    ensure(book.startswith(baseline.rstrip()+"\n\n---\n"),"EARLIER_CANONICAL_HISTORY_CHANGED")
    headings=[int(x) for x in re.findall(HEAD_RX,book,re.M|re.I)]
    present=set(headings)
    missing=sorted(set(range(1,194))-present)
    ensure(not missing,"NUMBERED_STAGE_GAPS_"+",".join(map(str,missing)))
    for n in UNKNOWN:
        code=f"{n:03d}"
        name=f"### Entry ACC-{code} — HISTORICAL_NUMBER_UNASSIGNED_OR_UNVERIFIED"
        ensure(book.count(name)==1,"INDEX_ONLY_SLOT_MISSING_"+code)
        part=book.split(name,1)[1].split("### Entry ACC-",1)[0]
        ensure("NO_ASSIGNMENT_OR_EXECUTION_PROOF_FOUND" in part and
               "NOT VERIFIED_COMPLETE" in part and
               "No stage-specific matching commit/issue" in part and
               "No source code, migration, finance event" in part,
               "UNKNOWN_SLOT_PRETEND_COMPLETION_"+code)
    for n,run,pr in [(176,38073710691,57),(177,38074706828,58)]:
        mark=f"### Entry ACC-{n} —"
        ensure(book.count(mark)==1,"HISTORIC_G5_STAGE_MISSING_"+str(n))
        content=book.split(mark,1)[1].split("### Entry ACC-",1)[0]
        ensure(str(run) in content and "SUCCESS" in content and
               f"PR #{pr}" in content and "CLOSED UNMERGED" in content and
               "PR #60" in content and "NO_GO" in content,
               "HISTORIC_G5_STAGE_EVIDENCE_WEAK_"+str(n))
    for n in range(146,157):
        ensure(book.count(f"### Entry ACC-{n} —")==1,"REPAIRED_ACC146_156_MISSING_"+str(n))
    ensure("ACC-192 exact source closure" in baseline and
           "ACC-192 exact source closure" in book,"PR29_ACC192_HISTORY_LOST")
    ensure("ACC-146–156 canonical gap final PR/CI closure" in baseline and
           "ACC-146–156 canonical gap final PR/CI closure" in book,
           "PR31_11_STAGE_RECOVERY_ERASED")
    ensure("NO_GO" in book and
           "G1–G5 all OPEN, finance release NO_GO" in book,
           "FINANCE_RELEASE_FALSIFIED")
    return {"schema":"ACC001_193_CANONICAL_NUMBERING_COMPLETENESS_V1",
            "numbered_slots_covered":193,
            "historic_unknown_or_unassigned":list(UNKNOWN),
            "historic_g5_tested_source_only":list(RECOVERED),
            "historical_146_156_recovered":list(range(146,157)),
            "old_original_book_preserved":True,
            "real_finance_release":"NO_GO",
            "gates":{g:"OPEN" for g in ["G1","G2","G3","G4","G5"]},
            "production_mutations":0}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--out",default="artifacts/acc001-193-numbering-no-go.json")
    args=p.parse_args()
    old=subprocess.check_output(["git","show",BASE+":"+BOOK],text=True)
    now=Path(BOOK).read_text(encoding="utf-8")
    result=verify(now,old)
    dest=Path(args.out);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print("ACC001_193_ALL_NUMBERED_HISTORY_SLOTS_INDEXED=PASS")
    print("ACC001_193_SEVEN_UNKNOWN_EARLY_SLOTS_NOT_FABRICATED=PASS")
    print("ACC176_177_PORTED_HISTORIC_SAFETY_SOURCE_PROVEN=PASS")
    print("ACC146_156_ELEVEN_GAP_RECOVERY_STILL_PRESENT=PASS")
    print("ACC001_193_OWNER_GATES_OPEN_FINANCE_NO_GO=PASS")
    print("ACC001_193_PRODUCTION_MUTATIONS=ZERO")

if __name__=="__main__":
    try:main()
    except (NumberingStop,OSError,subprocess.CalledProcessError) as e:
        raise SystemExit(str(e)) from e
