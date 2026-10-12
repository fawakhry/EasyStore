'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {evaluateReturnReview} = require('../scripts/accounting_acc203_return_review_preview.cjs');

function fake(overrides = {}) {
  return {
    caseRef: 'FAKE_CASE_1', invoiceRef: 'FAKE_INVOICE_1',
    returnedItemRefs: ['FAKE_ITEM_1'], personalization:'NONE',
    reportedReason:'OTHER',
    actualPaidForReturnedItemsCents: 10000,
    previousCashRefundCents: 1000,
    previousCustomerCreditCents: 2000,
    proposedCashRefundCents: 3000,
    proposedCustomerCreditCents: 4000,
    ...overrides
  };
}
function preview(input=fake()) {const r=evaluateReturnReview(input);assert.equal(r.financeRelease,'NO_GO');assert.equal(r.status,'REVIEW_ONLY_NO_GO');assert.equal(r.sourceTrust,'UNVERIFIED_CALLER_ASSUMPTIONS');assert.equal(r.payoutAuthorized,false);assert.equal(r.customerCreditAuthorized,false);assert.equal(r.ledgerWriteAuthorized,false);assert.equal(r.managerApprovalAuthenticated,false);return r;}
const has = (r, marker) => assert.ok(r.issues.includes(marker),marker+' is missing in '+JSON.stringify(r.issues));
test('01 exact aggregate 3000 cash + 4000 credit fits hypothetical 7000 balance only',()=>{
  const r=preview();assert.equal(r.normalCompensationCeilingCents,7000);assert.equal(r.proposedTotalCompensationCents,7000);assert.equal(r.proposedExcessCents,0);assert.equal(r.additionalExcessApprovalRequired,false);
});
test('02 credit only is available in policy without granting actual credit',()=>{
  const r=preview(fake({proposedCashRefundCents:0,proposedCustomerCreditCents:7000}));
  assert.equal(r.proposedExcessCents,0);assert.equal(r.customerCreditAuthorized,false);
});
test('03 cash only is available in policy without granting actual payment',()=>{
  const r=preview(fake({proposedCashRefundCents:7000,proposedCustomerCreditCents:0}));
  assert.equal(r.proposedExcessCents,0);assert.equal(r.payoutAuthorized,false);
});
test('04 cash-plus-credit combined overdraw requires separate exception decision',()=>{
  const r=preview(fake({proposedCashRefundCents:4000,proposedCustomerCreditCents:4000}));
  assert.equal(r.proposedExcessCents,1000);assert.equal(r.additionalExcessApprovalRequired,true);
  has(r,'SEPARATE_EXCESS_COMPENSATION_MANAGEMENT_DECISION_REQUIRED');
});
test('05 past customer credit counts even if not redeemed',()=>{
  const r=preview(fake({previousCashRefundCents:0,previousCustomerCreditCents:9900,proposedCashRefundCents:50,proposedCustomerCreditCents:50}));
  assert.equal(r.normalCompensationCeilingCents,100);
});
test('06 previous cash and credit above paid triggers reconciliation (never negative allowance)',()=>{
  const r=preview(fake({previousCashRefundCents:7000,previousCustomerCreditCents:4000}));
  assert.equal(r.normalCompensationCeilingCents,null);has(r,'PREVIOUS_COMPENSATION_EXCEEDS_ATTRIBUTABLE_PAYMENT_RECONCILE');
});
test('07 past cash missing is not silently treated as zero',()=>{
  const x=fake();delete x.previousCashRefundCents;const r=preview(x);
  assert.equal(r.normalCompensationCeilingCents,null);has(r,'MISSING_previousCashRefundCents');
});
test('08 past credit missing is not silently treated as zero',()=>{
  const x=fake();delete x.previousCustomerCreditCents;const r=preview(x);
  assert.equal(r.normalCompensationCeilingCents,null);has(r,'MISSING_previousCustomerCreditCents');
});
test('09 actual paid for returned lines missing refuses calculation',()=>{
  const x=fake();delete x.actualPaidForReturnedItemsCents;const r=preview(x);
  assert.equal(r.normalCompensationCeilingCents,null);has(r,'MISSING_actualPaidForReturnedItemsCents');
});
test('10 gross invoice total never replaces attributed paid',()=>{
  const x=fake({grossInvoiceCents:9999999});delete x.actualPaidForReturnedItemsCents;
  assert.equal(preview(x).normalCompensationCeilingCents,null);
});
test('11 selling price never increases compensation limit',()=>{
  const r=preview(fake({salePriceCents:999999,invoiceGrossCents:999999,proposedCashRefundCents:7001,proposedCustomerCreditCents:0}));
  assert.equal(r.proposedExcessCents,1);
});
test('12 monetary decimals are not rounded or accepted',()=>{
  const r=preview(fake({actualPaidForReturnedItemsCents:9999.9}));
  assert.equal(r.normalCompensationCeilingCents,null);has(r,'INVALID_NONNEGATIVE_INTEGER_actualPaidForReturnedItemsCents');
});
test('13 monetary strings are not parsed',()=>{
  const r=preview(fake({previousCashRefundCents:'1000'}));
  assert.equal(r.normalCompensationCeilingCents,null);has(r,'INVALID_NONNEGATIVE_INTEGER_previousCashRefundCents');
});
test('14 negative previous credit is rejected',()=>{
  has(preview(fake({previousCustomerCreditCents:-1})),'INVALID_NONNEGATIVE_INTEGER_previousCustomerCreditCents');
});
test('15 NaN proposed refund never gets silently normalized',()=>{
  const r=preview(fake({proposedCashRefundCents:NaN}));
  assert.equal(r.proposedTotalCompensationCents,null);has(r,'INVALID_NONNEGATIVE_INTEGER_proposedCashRefundCents');
});
test('16 infinite proposed credit fails closed',()=>{
  const r=preview(fake({proposedCustomerCreditCents:Infinity}));
  assert.equal(r.proposedTotalCompensationCents,null);has(r,'INVALID_NONNEGATIVE_INTEGER_proposedCustomerCreditCents');
});
test('17 prior total integer overflow is not accepted',()=>{
  const r=preview(fake({actualPaidForReturnedItemsCents:Number.MAX_SAFE_INTEGER,previousCashRefundCents:Number.MAX_SAFE_INTEGER,previousCustomerCreditCents:1}));
  assert.equal(r.normalCompensationCeilingCents,null);has(r,'UNSAFE_INTEGER_SUM_PREVIOUS_COMPENSATION');
});
test('18 proposed total integer overflow is not accepted',()=>{
  const r=preview(fake({proposedCashRefundCents:Number.MAX_SAFE_INTEGER,proposedCustomerCreditCents:1}));
  assert.equal(r.proposedTotalCompensationCents,null);has(r,'UNSAFE_INTEGER_SUM_PROPOSED_COMPENSATION');
});
test('19 zero actual paid never permits normal positive compensation',()=>{
  const r=preview(fake({actualPaidForReturnedItemsCents:0,previousCashRefundCents:0,previousCustomerCreditCents:0,proposedCashRefundCents:1,proposedCustomerCreditCents:0}));
  assert.equal(r.normalCompensationCeilingCents,0);assert.equal(r.proposedExcessCents,1);
});
test('20 missing returned item identity is never silently allowed',()=>{
  has(preview(fake({returnedItemRefs:[]})),'RETURNED_ITEM_REFERENCES_REQUIRED');
});
test('21 duplicate returned items cannot be presented as distinct',()=>{
  has(preview(fake({returnedItemRefs:['FAKE_ITEM_1','FAKE_ITEM_1']})),'DUPLICATE_RETURNED_ITEM_REFERENCE');
});
test('22 large returned-item batches require review',()=>{
  has(preview(fake({returnedItemRefs:Array.from({length:101},(_,i)=>'FAKE_'+i)})),'RETURNED_ITEM_REFERENCES_REQUIRED');
});
test('23 invalid invoice reference is flagged',()=>{
  has(preview(fake({invoiceRef:''})),'ORIGINAL_INVOICE_REFERENCE_REQUIRED');
});
test('24 invalid case reference is flagged',()=>{
  has(preview(fake({caseRef:42})),'RETURN_CASE_REFERENCE_REQUIRED');
});
test('25 name-customized defect only prompts independent evidence review',()=>{
  const r=preview(fake({personalization:'CUSTOM_NAME',reportedReason:'MANUFACTURING_DEFECT',verifiedDefect:true}));
  assert.equal(r.productReviewRoute,'CUSTOMIZED_EXCEPTION_INDEPENDENT_EVIDENCE_REQUIRED');has(r,'CUSTOMIZED_EXCEPTION_REQUIRES_INDEPENDENT_VERIFICATION');
});
test('26 photo-customized reported seller error also needs independent proof',()=>{
  const r=preview(fake({personalization:'CUSTOM_PHOTO',reportedReason:'TREND_MALL_ERROR',independentEvidence:true}));
  assert.equal(r.productReviewRoute,'CUSTOMIZED_EXCEPTION_INDEPENDENT_EVIDENCE_REQUIRED');
});
test('27 personalized customer changed mind lacks ordinary policy exception; legal review retained',()=>{
  const r=preview(fake({personalization:'CUSTOM_NAME',reportedReason:'CUSTOMER_CHANGED_MIND'}));
  assert.equal(r.productReviewRoute,'CUSTOMIZED_RETURN_POLICY_EXCEPTION_NOT_DEMONSTRATED');
  has(r,'CUSTOMIZED_REASON_NOT_WITHIN_ORDINARY_POLICY_EXCEPTION_LEGAL_REVIEW_REQUIRED');
});
test('28 personalized customer-supplied typo or photo error does not become independent defect',()=>{
  const r=preview(fake({personalization:'CUSTOM_PHOTO',reportedReason:'CUSTOMER_SUPPLIED_ERROR'}));
  assert.equal(r.productReviewRoute,'CUSTOMIZED_RETURN_POLICY_EXCEPTION_NOT_DEMONSTRATED');
});
test('29 unsupported personalization category is not silently treated as ordinary',()=>{
  has(preview(fake({personalization:'CUSTOM_OTHER'})),'PERSONALIZATION_CLASSIFICATION_REQUIRED');
});
test('30 unsupported reported reason is flagged',()=>{
  has(preview(fake({reportedReason:'FREE_REFUND'})),'REPORTED_REASON_CLASSIFICATION_REQUIRED');
});
test('31 365-day-old fake case cannot be auto-denied by an invented return deadline',()=>{
  const r=preview(fake({daysSincePurchase:365,autoReturnDeadlineDays:14}));
  assert.equal(r.timing,'CASE_BY_CASE_MANAGEMENT_REVIEW_REQUIRED_NO_AUTO_DAY_CUTOFF');
  assert.equal(r.financeRelease,'NO_GO');
});
test('32 fake manager approval, requested admin role and exception override never authorize extra',()=>{
  const r=preview(fake({managerApproved:true,role:'admin',exceptionApproved:true,proposedCashRefundCents:9000,proposedCustomerCreditCents:0}));
  assert.equal(r.proposedExcessCents,2000);assert.equal(r.additionalExcessApprovalRequired,true);assert.equal(r.managerApprovalAuthenticated,false);
});
test('33 returned goods stay quarantined despite forged physical inspection and restock flags',()=>{
  const r=preview(fake({stockApproved:true,inspectionApproved:true,physicalReceived:true}));
  assert.equal(r.returnedGoodsDisposition,'QUARANTINE_PENDING_INDEPENDENT_PHYSICAL_INSPECTION');
  assert.equal(r.inventoryWriteAuthorized,false);assert.equal(r.saleableRestockAuthorized,false);
});
test('34 damaged return does not fabricate cost or post waste from sale price',()=>{
  const r=preview(fake({damaged:true,salePriceCents:200000,manufacturingCostCents:999}));
  assert.equal(r.actualManufacturingWasteCostCents,null);assert.equal(r.wastePosted,false);
  assert.equal(r.overheadAllocationMethod,'NOT_SELECTED_BY_MANAGEMENT');
});
test('35 requested supplier recovery is never netted into gross waste nor posted',()=>{
  const r=preview(fake({supplierRecoveryCents:199999,managerApprovedRecovery:true}));
  assert.equal(r.thirdPartyRecoveryPosted,false);
  assert.equal(r.actualManufacturingWasteCostCents,null);
});
test('36 zero proposed compensation is review-only, not an implicit approved refund',()=>{
  const r=preview(fake({proposedCashRefundCents:0,proposedCustomerCreditCents:0}));
  has(r,'NO_COMPENSATION_PROPOSED');
});
test('37 fake input promises cannot turn output finance gate into GO',()=>{
  const r=preview(fake({financeRelease:'GO',payoutAuthorized:true,ledgerWriteAuthorized:true,status:'APPROVED'}));
  assert.equal(r.financeRelease,'NO_GO');assert.equal(r.ledgerWriteAuthorized,false);
});
test('38 no automatic legal waivers, manager authentication, or real money authority',()=>{
  const r=preview();const gates=r.mandatoryReviewGates.join(' ');
  assert.match(gates,/LEGAL_RIGHTS/);assert.match(gates,/AUTHENTICATED/);assert.match(gates,/IDEMPOTENCY/);
  assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.issues));assert.ok(Object.isFrozen(r.returnedItemRefs));
});
test('39 nonobject input and missing proof cannot produce a paid entitlement',()=>{
  const r=preview(null);has(r,'INVALID_REVIEW_CASE');
  assert.equal(r.normalCompensationCeilingCents,null);
});
test('40 script contains zero network/db/payment side-effect primitives',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../scripts/accounting_acc203_return_review_preview.cjs'),'utf8');
  assert.doesNotMatch(code,/\bfetch\s*\(|\bXMLHttpRequest\b|\.prepare\s*\(|\.run\s*\(|\brequire\s*\(/);
  assert.match(code,/module\.exports/);
  assert.equal(preview().status,'REVIEW_ONLY_NO_GO');
});
