#!/usr/bin/env python3
"""ACC200: offline source-document consistency guard, never a finance authority.

This checker reads only three checked-in EasyStore documents. It cannot authenticate
management, approve a return, select a costing method, or touch financial storage.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "EASYSTORE_ACCOUNTING_MASTER_BOOK.md"
POLICY = ROOT / "docs/accounting/ACC187_CUSTOMER_REFUND_OWNER_DECISION_PENDING_NO_GO_20261012.md"
REGISTER = ROOT / "docs/accounting/ACC187_DEPARTMENT_OVERHEAD_POLICY_REGISTER_TEMPLATE_NO_GO_20261012.md"

HEADINGS = (
    "## Owner's actual decision — method and management approval only",
    "## Owner's personalized-product eligibility decision",
    "## Owner's return timing decision",
    "## Owner's actual-paid compensation ceiling decision",
    "## Owner's returned-goods stock and waste handling decision",
    "## Owner's gross waste cost and separate third-party recovery decision",
    "## Owner's complete actual-manufacturing-cost components decision",
    "## Eighth owner decision — department-specific",
)

REQUIRED_FLAGS = {
    "ACC187_OWNER_SETTLEMENT_METHODS": "CASH_REFUND_OR_CUSTOMER_CREDIT_OR_BOTH_TOGETHER",
    "ACC187_METHOD_REQUIRES_CASE_MANAGEMENT_APPROVAL": "YES",
    "ACC187_TOTAL_NORMAL_COMPENSATION": "ACTUAL_PAID_FOR_RETURNED_ITEMS_MINUS_ALL_PREVIOUS_CASH_AND_STORE_CREDIT",
    "ACC187_PERSONALIZED_NAME_PHOTO_RETURN": "ONLY_VERIFIED_MANUFACTURING_DEFECT_OR_TREND_MALL_ERROR",
    "ACC187_RETURN_TIME_LIMIT": "NO_FIXED_DAYS_CASE_SPECIFIC_MANAGEMENT_REVIEW",
    "ACC187_DAMAGED_RETURN": "WASTE_NOT_SALEABLE_STOCK",
    "ACC187_OWNER_WASTE_GROSS_VALUATION": "VERIFIED_ACTUAL_MANUFACTURING_COST_NOT_SALE_PRICE",
    "ACC187_OWNER_COST_COMPONENTS": "RAW_MATERIALS_PLUS_DIRECT_LABOR_PLUS_ALLOCATED_PRODUCTION_OVERHEAD",
    "ACC187_RECOVERY_REQUIRES_SEPARATE_CASE_MANAGER_APPROVAL": "YES",
    "ACC187_GROSS_WASTE_AND_RECOVERY": "SEPARATE_RECORDS_NO_AUTOMATIC_NETTING",
    "ACC187_DEPARTMENT_OVERHEAD_DRIVER_SELECTION_PRINCIPLE": "MANAGEMENT_CHOOSES_AND_DOCUMENTS_BY_DEPARTMENT",
    "ACC187_SIMILAR_PRODUCTION_JOBS": "CONSISTENT_DOCUMENTED_METHOD_ACTIVE_VERSION",
    "ACC187_ALLOCATION_METHOD_CHANGE": "DOCUMENTED_PROSPECTIVE_MANAGEMENT_APPROVAL",
    "ACC187_SPECIFIC_LIVE_DEPARTMENT_DRIVERS_AND_RATES": "PENDING",
    "ACC187_OVERHEAD_SOURCE_ONLY_BRANCH_CI": "EXACT_HEAD_PR118_SUCCESS_UNMERGED",
    "ACC187_FINISHED_GOODS_RETURN_RESTOCK_WASTE_HANDLERS": "NOT_IMPLEMENTED",
    "ACC187_REAL_MANUFACTURING_COST_ALLOCATION_AND_RECOVERY_HANDLER": "NOT_IMPLEMENTED",
    "ACC187_CUSTOMER_CASH_REFUNDS": "UNSUPPORTED_FAIL_CLOSED",
    "ACC187_CUSTOMER_CREDIT_POSTING": "UNSUPPORTED_FAIL_CLOSED",
    "ACC198_FULL_ACCEPTANCE": "BLOCKED",
    "ACC199_RELEASE_HANDOFF": "DRAFT",
    "FINANCE_RELEASE": "NO_GO",
    **{f"G{i}": "OPEN" for i in range(1, 6)},
}

TEMPLATE_ROWS = {
    "Printing / طباعة",
    "Laser / ليزر",
    "Other / أقسام أخرى",
}
PENDING_CELLS = (
    "NOT_DEFINED",
    "PENDING_MANAGEMENT_SELECTION",
    "NOT_VERIFIED",
    "NOT_SET",
    "NOT_GRANTED",
    "NOT_VERIFIED",
    "NO_GO",
)
WORKSHEET_FIELDS = (
    "Department: **PENDING**",
    "Comparable job class: **PENDING**",
    "Driver and unit proof: **PENDING**",
    "Allocation rate and rounding rule: **PENDING**",
    "Manager-selected method and business justification: **PENDING**",
    "Approval ID and independent evidence: **PENDING**",
    "Policy version and future effective dates: **PENDING**",
    "Independent review / manager authentication: **NOT PERFORMED**",
    "Actual unit/job cost acceptance: **NOT PERFORMED**",
    "Real Cloudflare Worker / D1 or printshop execution: **NOT AUTHORIZED**",
)

class PolicyStop(ValueError):
    """Nonproduction document disagreement; fail closed, not finance approval."""


def verify(policy: str, register: str, book: str) -> dict[str, object]:
    for heading in HEADINGS:
        if policy.count(heading) != 1:
            raise PolicyStop("OWNER_DECISION_SECTION_MISSING_OR_REPEATED")

    blocks = re.findall(r"```ini\s*\n(.*?)```", policy, re.S)
    if not blocks:
        raise PolicyStop("POLICY_CURRENT_STATUS_BLOCK_MISSING")
    flags: dict[str, str] = {}
    for raw_line in blocks[-1].splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if "=" not in line:
            raise PolicyStop("POLICY_CURRENT_STATUS_MALFORMED")
        key, value = line.split("=", 1)
        if key in flags:
            raise PolicyStop("POLICY_DUPLICATE_CURRENT_STATUS")
        flags[key] = value
    for key, required in REQUIRED_FLAGS.items():
        if flags.get(key) != required:
            raise PolicyStop("POLICY_STATUS_MISMATCH:" + key)

    anchor = "## Register status — no live method selected"
    if register.count(anchor) != 1:
        raise PolicyStop("REGISTER_TABLE_MISSING")
    table_text = register.split(anchor, 1)[1].lstrip("\n").split("\n\n", 1)[0]
    rows = [line.strip() for line in table_text.splitlines() if line.strip().startswith("|")]
    if len(rows) != 5:
        raise PolicyStop("REGISTER_ROW_COUNT_MISMATCH")
    seen: set[str] = set()
    for line in rows[2:]:
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) != 8:
            raise PolicyStop("REGISTER_COLUMN_COUNT_MISMATCH")
        department = cells[0]
        if department not in TEMPLATE_ROWS or department in seen:
            raise PolicyStop("REGISTER_UNEXPECTED_OR_DUPLICATE_DEPARTMENT")
        seen.add(department)
        if tuple(cells[1:]) != PENDING_CELLS:
            raise PolicyStop("REGISTER_LIVE_METHOD_OR_APPROVAL_NOT_AUTHORIZED")
    if seen != TEMPLATE_ROWS:
        raise PolicyStop("REGISTER_REQUIRED_DEPARTMENT_MISSING")
    for line in WORKSHEET_FIELDS:
        if register.count(line) != 1:
            raise PolicyStop("REGISTER_WORKSHEET_NOT_EMPTY_OR_MISSING")
    for marker in (
        "ACC187_REAL_DRIVER_CHOSEN=NO",
        "ACC187_REAL_MANAGER_REGISTER=NOT_IMPLEMENTED",
        "ACC187_REAL_MANUFACTURING_COST_ALLOCATION=NOT_IMPLEMENTED",
        "ACC187_FINANCE_AND_INVENTORY_POSTING=NOT_IMPLEMENTED",
        "FINANCE_RELEASE=NO_GO",
    ):
        if marker not in register:
            raise PolicyStop("REGISTER_NO_GO_BOUNDARY_MISSING")
    if "### ACC-187 eighth owner decision" not in book:
        raise PolicyStop("CANONICAL_BOOK_EIGHTH_OWNER_DECISION_MISSING")
    if "ACC199 owner confirms no second trusted GitHub code reviewer" not in book:
        raise PolicyStop("CANONICAL_BOOK_REVIEW_BOUNDARY_MISSING")
    if "FINANCE_RELEASE=NO_GO" not in book[-6000:]:
        raise PolicyStop("CANONICAL_BOOK_FINAL_NO_GO_MISSING")
    return {
        "owner_decisions_recorded": 8,
        "empty_department_templates": sorted(TEMPLATE_ROWS),
        "real_overhead_method_approved": False,
        "authenticated_manager_verified": False,
        "financial_mutations": 0,
        "source_only_guard": "PASS",
        "finance_release": "NO_GO",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline EasyStore accounting policy consistency check")
    parser.parse_args()
    report = verify(POLICY.read_text(encoding="utf-8"),
                    REGISTER.read_text(encoding="utf-8"),
                    BOOK.read_text(encoding="utf-8"))
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
