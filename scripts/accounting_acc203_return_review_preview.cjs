'use strict';

/**
 * ACC203 / EasyStore original accounting: source-only return review arithmetic.
 *
 * NOT a refund executor, payment authorizer, production cost calculator or
 * evidence verifier. All caller-provided amounts and reason codes are
 * UNVERIFIED review assumptions. No HTTP, database, stock, DOM or ledger IO.
 *
 * The owner approved bounded POLICY choices, not individual case approvals:
 * case-by-case timing; independently verified evidence for personalized
 * name/photo exceptions; combined cash + credit limited to actual money paid
 * attributable to returned items after ALL prior cash/credit compensation;
 * excess requires a distinct manager decision; quarantined returned goods;
 * actual manufacturing cost for waste (materials + labor + overhead), with
 * separately authorized third-party recovery. No real drivers/rates chosen.
 */

const MODES = Object.freeze(['CASH_REFUND', 'CUSTOMER_CREDIT', 'BOTH']);
const PERSONALIZATION = Object.freeze(['NONE', 'CUSTOM_NAME', 'CUSTOM_PHOTO']);
const REASONS = Object.freeze([
  'MANUFACTURING_DEFECT', 'TREND_MALL_ERROR', 'CUSTOMER_CHANGED_MIND',
  'CUSTOMER_SUPPLIED_ERROR', 'OTHER', 'UNSPECIFIED'
]);
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

function nonemptyRef(value, code, issues) {
  if(typeof value !== 'string' || !value.trim() || value.length > 256) {
    issues.push(code);
    return null;
  }
  return value.trim();
}

function cents(obj, key, issues) {
  if(!own(obj, key)) {
    issues.push('MISSING_' + key);
    return null;
  }
  const value = obj[key];
  if(typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    issues.push('INVALID_NONNEGATIVE_INTEGER_' + key);
    return null;
  }
  return value;
}
function addSafe(a, b, code, issues) {
  if(a === null || b === null) return null;
  const value = a + b;
  if(!Number.isSafeInteger(value)) {
    issues.push('UNSAFE_INTEGER_SUM_' + code);
    return null;
  }
  return value;
}
function uniqueItems(items, issues) {
  if(!Array.isArray(items) || items.length < 1 || items.length > 100) {
    issues.push('RETURNED_ITEM_REFERENCES_REQUIRED');
    return [];
  }
  const result = [];
  const seen = new Set();
  for(const item of items) {
    const value = nonemptyRef(item, 'INVALID_RETURNED_ITEM_REFERENCE', issues);
    if(value !== null) {
      if(seen.has(value)) issues.push('DUPLICATE_RETURNED_ITEM_REFERENCE');
      else {seen.add(value);result.push(value);}
    }
  }
  return result;
}
function evaluateReturnReview(raw) {
  const issues = [];
  const input = object(raw);
  if(input !== raw) issues.push('INVALID_REVIEW_CASE');
  const caseRef = nonemptyRef(input.caseRef, 'RETURN_CASE_REFERENCE_REQUIRED', issues);
  const invoiceRef = nonemptyRef(input.invoiceRef, 'ORIGINAL_INVOICE_REFERENCE_REQUIRED', issues);
  const returnedItemRefs = uniqueItems(input.returnedItemRefs, issues);
  const personalization = input.personalization;
  if(!PERSONALIZATION.includes(personalization)) issues.push('PERSONALIZATION_CLASSIFICATION_REQUIRED');
  const reportedReason = input.reportedReason;
  if(!REASONS.includes(reportedReason)) issues.push('REPORTED_REASON_CLASSIFICATION_REQUIRED');

  // Values are hypothetical until independently sourced/allocated by backend.
  // Never use the sale price, gross invoice or client-side flags as payment proof.
  const paid = cents(input, 'actualPaidForReturnedItemsCents', issues);
  const pastCash = cents(input, 'previousCashRefundCents', issues);
  const pastCredit = cents(input, 'previousCustomerCreditCents', issues);
  const wantCash = cents(input, 'proposedCashRefundCents', issues);
  const wantCredit = cents(input, 'proposedCustomerCreditCents', issues);
  const past = addSafe(pastCash, pastCredit, 'PREVIOUS_COMPENSATION', issues);
  const proposed = addSafe(wantCash, wantCredit, 'PROPOSED_COMPENSATION', issues);

  if(paid !== null && past !== null && past > paid) {
    issues.push('PREVIOUS_COMPENSATION_EXCEEDS_ATTRIBUTABLE_PAYMENT_RECONCILE');
  }
  const normalCeiling = paid !== null && past !== null && past <= paid ? paid - past : null;
  const overLimit = normalCeiling !== null && proposed !== null ? Math.max(0, proposed - normalCeiling) : null;

  if(proposed === 0) issues.push('NO_COMPENSATION_PROPOSED');
  if(normalCeiling === null) issues.push('NORMAL_COMPENSATION_CEILING_NOT_DETERMINED');
  if(overLimit !== null && overLimit > 0) issues.push('SEPARATE_EXCESS_COMPENSATION_MANAGEMENT_DECISION_REQUIRED');

  // A reported defect/error is never independently VERIFIED by a caller flag.
  // Never deny statutory remedies by treating this internal preview as legal advice.
  let productReviewRoute = 'MANUAL_RETURN_REVIEW_REQUIRED';
  if(personalization === 'CUSTOM_NAME' || personalization === 'CUSTOM_PHOTO') {
    if(reportedReason === 'MANUFACTURING_DEFECT' || reportedReason === 'TREND_MALL_ERROR') {
      productReviewRoute = 'CUSTOMIZED_EXCEPTION_INDEPENDENT_EVIDENCE_REQUIRED';
      issues.push('CUSTOMIZED_EXCEPTION_REQUIRES_INDEPENDENT_VERIFICATION');
    } else {
      productReviewRoute = 'CUSTOMIZED_RETURN_POLICY_EXCEPTION_NOT_DEMONSTRATED';
      issues.push('CUSTOMIZED_REASON_NOT_WITHIN_ORDINARY_POLICY_EXCEPTION_LEGAL_REVIEW_REQUIRED');
    }
  }

  // Every outcome stays NO_GO even if input includes managerApproved,
  // verifiedDefect, independentEvidence, overrideApproved, stockApproved etc.
  // This module has NO way to authenticate a manager or verify records.
  return Object.freeze({
    stage: 'ACC203_SOURCE_REVIEW_ONLY',
    financeRelease: 'NO_GO',
    status: 'REVIEW_ONLY_NO_GO',
    sourceTrust: 'UNVERIFIED_CALLER_ASSUMPTIONS',
    payoutAuthorized: false,
    customerCreditAuthorized: false,
    inventoryWriteAuthorized: false,
    ledgerWriteAuthorized: false,
    managerApprovalAuthenticated: false,
    caseRef,
    invoiceRef,
    returnedItemRefs: Object.freeze(returnedItemRefs),
    productReviewRoute,
    reportedReason: REASONS.includes(reportedReason) ? reportedReason : null,
    timing: 'CASE_BY_CASE_MANAGEMENT_REVIEW_REQUIRED_NO_AUTO_DAY_CUTOFF',
    normalCompensationCeilingCents: normalCeiling,
    proposedCashRefundCents: wantCash,
    proposedCustomerCreditCents: wantCredit,
    proposedTotalCompensationCents: proposed,
    proposedExcessCents: overLimit,
    additionalExcessApprovalRequired: overLimit === null ? null : overLimit > 0,
    allowedSettlementMethodsInPrinciple: MODES,
    returnedGoodsDisposition: 'QUARANTINE_PENDING_INDEPENDENT_PHYSICAL_INSPECTION',
    saleableRestockAuthorized: false,
    wastePosted: false,
    actualManufacturingWasteCostCents: null,
    overheadAllocationMethod: 'NOT_SELECTED_BY_MANAGEMENT',
    thirdPartyRecoveryPosted: false,
    issues: Object.freeze([...new Set(issues)]),
    mandatoryReviewGates: Object.freeze([
      'INDEPENDENT_PAYMENT_AND_PRIOR_COMPENSATION_LEDGER_RECONCILIATION',
      'INDEPENDENT_PRODUCT_REASON_EVIDENCE_AND_LEGAL_RIGHTS_REVIEW',
      'CASE_SPECIFIC_RETURN_TIMING_MANAGEMENT_DECISION',
      'AUTHENTICATED_CASE_AND_SETTLEMENT_SPLIT_MANAGEMENT_APPROVAL',
      'SEPARATE_EXCESS_APPROVAL_WHEN_ABOVE_NORMAL_CEILING',
      'INDEPENDENT_PHYSICAL_RECEIPT_AND_QUALITY_INSPECTION_BEFORE_STOCK_OR_WASTE',
      'INDEPENDENT_REAL_MATERIAL_LABOR_AND_SELECTED_OVERHEAD_PROOF_BEFORE_WASTE_COST',
      'SEPARATE_AUTHENTICATED_APPROVAL_FOR_THIRD_PARTY_RECOVERY',
      'SERVER_SIDE_IDEMPOTENCY_AUDIT_AND_FINANCIAL_RELEASE'
    ])
  });
}

module.exports = Object.freeze({evaluateReturnReview});
