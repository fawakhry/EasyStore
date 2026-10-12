#!/usr/bin/env python3
"""Adversarial, source-only ACC200 checks; fake strings only, no business data."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/accounting_acc200_owner_policy_guard.py"
spec = importlib.util.spec_from_file_location("acc200", SCRIPT)
acc200 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(acc200)

POLICY = acc200.POLICY.read_text(encoding="utf-8")
REGISTER = acc200.REGISTER.read_text(encoding="utf-8")
BOOK = acc200.BOOK.read_text(encoding="utf-8")

class ACC200FailClosedTests(unittest.TestCase):
    def assert_stops(self, label, *, policy=POLICY, register=REGISTER, book=BOOK):
        with self.subTest(label=label):
            with self.assertRaises(acc200.PolicyStop, msg=label):
                acc200.verify(policy, register, book)

    def test_01_valid_checked_in_current_doc_only(self):
        result = acc200.verify(POLICY, REGISTER, BOOK)
        self.assertEqual(result["source_only_guard"], "PASS")
        self.assertEqual(result["finance_release"], "NO_GO")
        self.assertEqual(result["owner_decisions_recorded"], 8)
        self.assertEqual(result["financial_mutations"], 0)
        self.assertFalse(result["real_overhead_method_approved"])

    def test_02_removed_business_decision(self):
        self.assert_stops("decision removed",
            policy=POLICY.replace("## Eighth owner decision —", "## Removed owner decision —", 1))

    def test_03_duplicated_business_decision_heading(self):
        self.assert_stops("duplicated decision",
            policy=POLICY.replace("## Eighth owner decision —",
                "## Eighth owner decision —\n## Eighth owner decision —", 1))

    def test_04_cash_credit_conflation(self):
        self.assert_stops("cash credit option drift",
            policy=POLICY.replace(
                "ACC187_OWNER_SETTLEMENT_METHODS=CASH_REFUND_OR_CUSTOMER_CREDIT_OR_BOTH_TOGETHER",
                "ACC187_OWNER_SETTLEMENT_METHODS=CASH_REFUND_ONLY", 1))

    def test_05_customer_entitlement_inflation(self):
        self.assert_stops("invoice total is not real paid for items",
            policy=POLICY.replace(
                "ACC187_TOTAL_NORMAL_COMPENSATION=ACTUAL_PAID_FOR_RETURNED_ITEMS_MINUS_ALL_PREVIOUS_CASH_AND_STORE_CREDIT",
                "ACC187_TOTAL_NORMAL_COMPENSATION=INVOICE_GROSS_TOTAL", 1))

    def test_06_customized_item_decision_drift(self):
        self.assert_stops("personalized change of mind",
            policy=POLICY.replace(
                "ACC187_PERSONALIZED_NAME_PHOTO_RETURN=ONLY_VERIFIED_MANUFACTURING_DEFECT_OR_TREND_MALL_ERROR",
                "ACC187_PERSONALIZED_NAME_PHOTO_RETURN=ALL_RETURNS", 1))

    def test_07_unapproved_time_limit(self):
        self.assert_stops("automatic time cut-off",
            policy=POLICY.replace(
                "ACC187_RETURN_TIME_LIMIT=NO_FIXED_DAYS_CASE_SPECIFIC_MANAGEMENT_REVIEW",
                "ACC187_RETURN_TIME_LIMIT=7_DAYS", 1))

    def test_08_recovery_netted_against_waste(self):
        self.assert_stops("waste recovery netting",
            policy=POLICY.replace(
                "ACC187_GROSS_WASTE_AND_RECOVERY=SEPARATE_RECORDS_NO_AUTOMATIC_NETTING",
                "ACC187_GROSS_WASTE_AND_RECOVERY=NETTED", 1))

    def test_09_missing_labor_component(self):
        self.assert_stops("silent material-only cost",
            policy=POLICY.replace(
                "ACC187_OWNER_COST_COMPONENTS=RAW_MATERIALS_PLUS_DIRECT_LABOR_PLUS_ALLOCATED_PRODUCTION_OVERHEAD",
                "ACC187_OWNER_COST_COMPONENTS=RAW_MATERIALS_ONLY", 1))

    def test_10_stale_source_pr_status(self):
        self.assert_stops("obsolete PR-creation blocker accidentally current",
            policy=POLICY.replace(
                "ACC187_OVERHEAD_SOURCE_ONLY_BRANCH_CI=EXACT_HEAD_PR118_SUCCESS_UNMERGED",
                "ACC187_OVERHEAD_SOURCE_ONLY_BRANCH_CI=UNVERIFIED_PR_CREATION_BLOCKED", 1))

    def test_11_financial_go_spoof(self):
        self.assert_stops("fake finance release",
            policy=POLICY.replace("FINANCE_RELEASE=NO_GO\nG1=OPEN", "FINANCE_RELEASE=GO\nG1=OPEN", 1))

    def test_12_owner_gate_spoof(self):
        self.assert_stops("fake owner gate closure",
            policy=POLICY.replace("\nG2=OPEN\n", "\nG2=CLOSED\n", 1))

    def test_13_concrete_department_driver_in_template(self):
        self.assert_stops("unapproved live allocation driver",
            register=REGISTER.replace(
                "| Printing / طباعة | NOT_DEFINED | PENDING_MANAGEMENT_SELECTION |",
                "| Printing / طباعة | NOT_DEFINED | MACHINE_MINUTES |", 1))

    def test_14_fake_manager_approval_in_register(self):
        self.assert_stops("forged register approval",
            register=REGISTER.replace("| NOT_SET | NOT_GRANTED | NOT_VERIFIED | NO_GO |",
                                      "| NOT_SET | APPROVED | NOT_VERIFIED | NO_GO |", 1))

    def test_15_missing_department(self):
        line = next(x for x in REGISTER.splitlines() if x.startswith("| Laser /"))
        self.assert_stops("missing laser",register=REGISTER.replace(line+"\n", "", 1))

    def test_16_duplicated_department(self):
        line = next(x for x in REGISTER.splitlines() if x.startswith("| Laser /"))
        self.assert_stops("duplicate laser",register=REGISTER.replace(line+"\n",line+"\n"+line+"\n",1))

    def test_17_added_unapproved_department(self):
        line = next(x for x in REGISTER.splitlines() if x.startswith("| Other /"))
        added = line.replace("Other / أقسام أخرى","Fabrication / تصنيع")
        self.assert_stops("extra department",register=REGISTER.replace(line+"\n",line+"\n"+added+"\n",1))

    def test_18_worksheet_manager_signoff_spoof(self):
        self.assert_stops("worksheet became approved",
            register=REGISTER.replace("Approval ID and independent evidence: **PENDING**",
                                      "Approval ID and independent evidence: **SIGNED**", 1))

    def test_19_no_go_register_state_removed(self):
        self.assert_stops("live driver falsely chosen",
            register=REGISTER.replace("ACC187_REAL_DRIVER_CHOSEN=NO",
                                      "ACC187_REAL_DRIVER_CHOSEN=YES", 1))

    def test_20_book_eighth_rule_removed(self):
        self.assert_stops("book eighth decision removed",
            book=BOOK.replace("### ACC-187 eighth owner decision",
                              "### Missing eighth decision", 1))

    def test_21_book_recent_finance_stop_removed(self):
        # Only mutates the newest segment, not historical markers.
        recent = BOOK[-6000:].replace("FINANCE_RELEASE=NO_GO", "FINANCE_RELEASE=GO")
        self.assert_stops("book no-go absent in latest segment",
                          book=BOOK[:-6000]+recent)

    def test_22_no_approved_runtime_from_green_source(self):
        r=acc200.verify(POLICY,REGISTER,BOOK)
        self.assertFalse(r["authenticated_manager_verified"])
        self.assertFalse(r["real_overhead_method_approved"])
        self.assertEqual(r["financial_mutations"],0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
