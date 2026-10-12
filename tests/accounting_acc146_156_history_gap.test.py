#!/usr/bin/env python3
"""Prove eleven historical accounting recovery stages fail closed when tampered."""
import copy
import importlib.util
import json
import subprocess
from pathlib import Path

spec=importlib.util.spec_from_file_location("gap","scripts/accounting_acc146_156_historical_gap_audit.py")
gap=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gap)
book=Path("EASYSTORE_ACCOUNTING_MASTER_BOOK.md").read_text(encoding="utf-8")
old=subprocess.check_output(["git","show",gap.BASE+":"+gap.BOOK],text=True)
index=json.loads(Path(gap.MANIFEST).read_text(encoding="utf-8"))
source=Path("trendos-historical-audit/docs/trendos/staging/ACC145_D1_READONLY_RESUME_PREPARE_20261010.md").read_text(encoding="utf-8")
result=gap.validate(book,old,index,source)
assert result["numbered_stages"]==list(range(146,157))
assert result["release_decision"]=="NO_GO"

def must_stop(book_mod=None,index_mod=None,label=""):
    c=copy.deepcopy(index)
    if index_mod:index_mod(c)
    b=book if book_mod is None else book_mod
    try:gap.validate(b,old,c,source)
    except gap.GapStop as exc:
        assert label in str(exc),(label,str(exc))
    else:
        raise AssertionError("ACC146_156_FAIL_OPEN_"+label)

must_stop(book_mod=book.replace("### Entry ACC-151 —","### Entry GAP-151 —",1),
          label="MISSING_OR_DUPLICATE_STAGE")
must_stop(book_mod=book.replace("### Entry ACC-152 —","### Entry ACC-151 —",1),
          label="MISSING_OR_DUPLICATE_STAGE")
must_stop(book_mod=book.replace("### Entry ACC-156 —","### Entry ACC-157 —",1),
          label="MISSING_OR_DUPLICATE_STAGE")
must_stop(book_mod="BAD HEADER\n"+book,label="CANONICAL_PREFIX_CHANGED")
must_stop(index_mod=lambda x:x["source"].update(audit_pr_state_at_recovery="MERGED"),label="OLD_PR39_PROMOTED")
must_stop(index_mod=lambda x:x["target"].update(path="TrendOS_MASTER_BOOK.md"),label="WRONG_CANONICAL_BOOK")
must_stop(index_mod=lambda x:x["entries"][0].update(run=None),label="HISTORIC_CI_EVIDENCE_INVALID_146")
must_stop(index_mod=lambda x:x["entries"][3].update(run_url="https://invalid.example/run"),label="HISTORIC_CI_EVIDENCE_INVALID_149")
must_stop(index_mod=lambda x:x["entries"][4].update(run={"repo":"TrendOs","id":1}),
          label="FABRICATED_STAGE_RUN_150")
must_stop(index_mod=lambda x:x["entries"][10].update(owner_blocked=False),
          label="OWNER_GATE_MISLABELED_156")
must_stop(index_mod=lambda x:x["production"].update(finance_release="GO"),
          label="PRODUCTION_GO_FABRICATED")
must_stop(index_mod=lambda x:x["production"].update(cutover_date_local="2026-10-12"),
          label="PRODUCTION_GO_FABRICATED")
must_stop(index_mod=lambda x:x["production"]["gates"].update(G2="CLOSED"),
          label="GATE_PREMATURELY_CLOSED")
assert "ACC-187" in book and "ACC-193" in book
print("ACC146_156_THIRTEEN_NEGATIVE_HISTORY_TAMPER_VARIANTS=PASS")
print("ACC146_156_OLD_BOOK_PRESERVED_NO_FAKE_OWNER_GO=PASS")
