#!/usr/bin/env python3
import importlib.util
import subprocess
from pathlib import Path

p="scripts/accounting_complete_number_001_193_audit.py"
spec=importlib.util.spec_from_file_location("numbering",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
book=Path(m.BOOK).read_text(encoding="utf-8")
original=subprocess.check_output(["git","show",m.BASE+":"+m.BOOK],text=True)
out=m.verify(book,original)
assert out["numbered_slots_covered"]==193
assert out["historic_unknown_or_unassigned"]==[4,7,13,14,25,27,69]

def fails(changed,expected):
    try:m.verify(changed,original)
    except m.NumberingStop as e:assert expected in str(e),(expected,str(e))
    else:raise AssertionError("ACC001_193_INVALID_BOOK_ACCEPTED_"+expected)

fails("tamper\n"+book,"EARLIER_CANONICAL_HISTORY_CHANGED")
fails(book.replace("### Entry ACC-004 —","### Missing Entry ACC-004 —",1),"NUMBERED_STAGE_GAPS_4")
fails(book.replace("### Entry ACC-069 —","### Missing Entry ACC-069 —",1),"NUMBERED_STAGE_GAPS_69")
fails(book.replace("NO_ASSIGNMENT_OR_EXECUTION_PROOF_FOUND","VERIFIED_COMPLETE",1),"UNKNOWN_SLOT_PRETEND_COMPLETION_004")
fails(book.replace("### Entry ACC-176 —","### Missing Entry ACC-176 —",1),"NUMBERED_STAGE_GAPS_176")
fails(book.replace("### Entry ACC-177 —","### Missing Entry ACC-177 —",1),"NUMBERED_STAGE_GAPS_177")
fails(book.replace("38073710691","INVALID_RUN",1),"HISTORIC_G5_STAGE_EVIDENCE_WEAK_176")
fails(book.replace("38074706828","INVALID_RUN",1),"HISTORIC_G5_STAGE_EVIDENCE_WEAK_177")
fails(book.replace("PR #60","UNVERIFIED_SOURCE",1),"HISTORIC_G5_STAGE_EVIDENCE_WEAK_176")
print("ACC001_193_NINE_ADVERSARIAL_NUMBERING_AUDITS=PASS")
print("ACC001_193_UNKNOWN_SLOTS_NEVER_MARKED_FINISHED=PASS")
