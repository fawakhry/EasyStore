#!/usr/bin/env python3
"""ACC master book migration audit. Read only repository files, never runtime."""
import re
import subprocess
from pathlib import Path

book=Path("EASYSTORE_ACCOUNTING_MASTER_BOOK.md").read_text(encoding="utf-8")
old_sha="c84a86e386ab4b9e5ac37dbebf1e7e4745f4c1cc"
previous=subprocess.check_output(["git","cat-file","blob",old_sha]).decode("utf-8")
assert book.startswith(previous.rstrip()+ "\n\n---\n"), "Existing ACC-001..145 canonical entries changed"
assert "single canonical accounting project book" in previous
assert "Accounting work MUST NOT be logged in" in previous
assert "## Entry ACC-145 " in previous and "## Entry ACC-157 " not in previous
assert "ACC-146–ACC-156" in book
assert "UNKNOWN/REQUIRES_GIT_HISTORY_RECONCILIATION" in book

src=Path("trendos-archive/TrendOS_MASTER_BOOK.md").read_text(encoding="utf-8")
original=src[src.index("### ACC-157 —"):].strip()
base="https://github.com/fawakhry/TrendOs/blob/candidate/easystore-accounting-a2-20261005/"
original=re.sub(r"\]\(((?:docs/trendos/|\.github/|cloudflare-d1/|scripts/|tests/|accounting/)[^)#\s]+)(#[^)]+)?\)",
                lambda m: "]("+base+m.group(1)+(m.group(2) or "")+")",original)
section=book.split("### Preserved accounting progress from the former, incorrect journal\n\n",1)[1].split("\n\n### New canonical checkpoint after ACC-193 merge",1)[0].strip()
assert section==original, "History lost or modified in ACC157..193 copy"
headings=re.findall(r"^### ACC-(\d{3})",section,re.M)
assert len(headings)==34 and headings[0]=="157" and headings[-1]=="193"
assert "ACC-176" in section and "ACC-177" in section
assert "ACC-187 missing refund implementation" in book
assert "ACC-191 limited scope" in book
assert "G1–G5" in book and "NO_GO" in book
assert "2128e79d5920163733602304b142674838bab96b" in book
assert "38187854508" in book and "38187854445" in book
print("EASYSTORE_ORIGINAL_CANONICAL_ACC001_TO145_BYTE_PRESERVED=PASS")
print("EASYSTORE_ACC157_TO193_EXACT_HISTORY_COPIED_WITH_SOURCE_LINKS=PASS")
print("EASYSTORE_ACC146_TO156_GAP_HONESTLY_UNVERIFIED=PASS")
print("EASYSTORE_ACC193_POSTMERGE_AND_OWNER_GATES_NO_GO=PASS")
print("EASYSTORE_CANONICAL_BOOK_PRODUCTION_MUTATIONS=ZERO")
