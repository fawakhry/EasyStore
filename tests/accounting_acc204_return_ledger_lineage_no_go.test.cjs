'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {inspectReturnLedgerLineage:inspect}=require('../scripts/accounting_acc204_return_ledger_lineage_no_go.cjs');

function fake(changes={}){
  return {
    caseRef:'FAKE_CASE_A',invoiceRef:'FAKE_INV_A',currency:'EGP',
    returnedItemRefs:['FAKE_ITEM_A','FAKE_ITEM_B'],
    personalization:'NONE',reportedReason:'OTHER',
    coverage:[
      {itemRef:'FAKE_ITEM_A',paymentSnapshotRef:'FAKE_PAY_LEDGER_A',compensationSnapshotRef:'FAKE_COMP_LEDGER_A'},
      {itemRef:'FAKE_ITEM_B',paymentSnapshotRef:'FAKE_PAY_LEDGER_B',compensationSnapshotRef:'FAKE_COMP_LEDGER_B'}
    ],
    transactions:[
      {transactionRef:'FAKE_PAY_PARENT',invoiceRef:'FAKE_INV_A',kind:'PAYMENT_CAPTURED',amountCents:9000,currency:'EGP'},
      {transactionRef:'FAKE_CASH_PARENT',invoiceRef:'FAKE_INV_A',kind:'CASH_REFUND',amountCents:1200,currency:'EGP'},
      {transactionRef:'FAKE_CREDIT_PARENT',invoiceRef:'FAKE_INV_A',kind:'CUSTOMER_CREDIT_ISSUED',amountCents:800,currency:'EGP'}
    ],
    allocations:[
      {allocationRef:'P1',transactionRef:'FAKE_PAY_PARENT',invoiceRef:'FAKE_INV_A',itemRef:'FAKE_ITEM_A',amountCents:6000,currency:'EGP'},
      {allocationRef:'P2',transactionRef:'FAKE_PAY_PARENT',invoiceRef:'FAKE_INV_A',itemRef:'FAKE_ITEM_B',amountCents:3000,currency:'EGP'},
      {allocationRef:'C1',transactionRef:'FAKE_CASH_PARENT',invoiceRef:'FAKE_INV_A',itemRef:'FAKE_ITEM_A',amountCents:1000,currency:'EGP'},
      {allocationRef:'C2',transactionRef:'FAKE_CASH_PARENT',invoiceRef:'FAKE_INV_A',itemRef:'FAKE_ITEM_B',amountCents:200,currency:'EGP'},
      {allocationRef:'S1',transactionRef:'FAKE_CREDIT_PARENT',invoiceRef:'FAKE_INV_A',itemRef:'FAKE_ITEM_A',amountCents:500,currency:'EGP'},
      {allocationRef:'S2',transactionRef:'FAKE_CREDIT_PARENT',invoiceRef:'FAKE_INV_A',itemRef:'FAKE_ITEM_B',amountCents:300,currency:'EGP'}
    ],
    proposedCashRefundCents:4000,proposedCustomerCreditCents:3000,
    ...changes
  };
}
const clone=x=>structuredClone(x);
function patch(fn){const x=fake();fn(x);return x;}
function result(x=fake()){
  const r=inspect(x);
  assert.equal(r.financeRelease,'NO_GO');
  assert.equal(r.status,'REVIEW_ONLY_NO_GO');
  assert.equal(r.realTransactionVerified,false);
  assert.equal(r.realCoverageVerified,false);
  assert.equal(r.managerApprovalAuthenticated,false);
  assert.equal(r.payoutAuthorized,false);
  assert.equal(r.customerCreditAuthorized,false);
  assert.equal(r.stockOrWasteWriteAuthorized,false);
  assert.equal(r.sourceTrust,'UNAUTHENTICATED_CALLER_SUPPLIED_RECORDS');
  return r;
}
function fault(input,code){
  const r=result(input);assert.equal(r.structurallyConsistent,false);
  assert.ok(r.issues.includes(code),code+' was not found in '+JSON.stringify(r.issues));
  assert.equal(r.policyPreview,null);
  assert.equal(r.hypotheticalPaidCents,null);
  return r;
}
test('01 fully structured fake lineage computes only a hypothetical paid ceiling',()=>{
  const r=result();assert.equal(r.structurallyConsistent,true);
  assert.deepEqual(r.issues,[]);assert.equal(r.hypotheticalPaidCents,9000);
  assert.equal(r.hypotheticalPreviousCashRefundCents,1200);
  assert.equal(r.hypotheticalPreviousCustomerCreditIssuedCents,800);
  assert.equal(r.policyPreview.normalCompensationCeilingCents,7000);
  assert.equal(r.policyPreview.proposedExcessCents,0);
  assert.equal(r.policyPreview.payoutAuthorized,false);
});
test('02 combined cash and issued credit consume the same net-paid ceiling',()=>{
  const r=result(fake({proposedCashRefundCents:5000,proposedCustomerCreditCents:2500}));
  assert.equal(r.policyPreview.proposedExcessCents,500);
  assert.equal(r.policyPreview.additionalExcessApprovalRequired,true);
});
test('03 prior issued credit counts even when fake client marks credit unused',()=>{
  const r=result(fake({creditRedeemedCents:0,previousCustomerCreditCents:0}));
  assert.equal(r.hypotheticalPreviousCustomerCreditIssuedCents,800);
});
test('04 forged paid headline cannot override item-bound allocations',()=>{
  const r=result(fake({actualPaidForReturnedItemsCents:1000000,invoiceGrossCents:1000000}));
  assert.equal(r.hypotheticalPaidCents,9000);
});
test('05 forged compensation headline cannot hide prior cash or credit',()=>{
  const r=result(fake({previousCashRefundCents:0,previousCustomerCreditCents:0}));
  assert.equal(r.hypotheticalPreviousCashRefundCents,1200);
  assert.equal(r.hypotheticalPreviousCustomerCreditIssuedCents,800);
});
test('06 unchanged fake reviewer role/approval flags cannot grant money',()=>{
  const r=result(fake({role:'admin',managerApproved:true,creditApproved:true,financeRelease:'GO',verified:true,authorized:true}));
  assert.equal(r.managerApprovalAuthenticated,false);
  assert.equal(r.policyPreview.managerApprovalAuthenticated,false);
});
test('07 one fake parent payment may be split across returned items under a common reference',()=>{
  const r=result();assert.equal(r.hypotheticalPaidCents,9000);assert.equal(r.structurallyConsistent,true);
});
test('08 a parent payment can include other invoice items, but unallocated balance cannot count toward refund',()=>{
  const r=result(patch(x=>{x.transactions[0].amountCents=13000;}));
  assert.equal(r.hypotheticalPaidCents,9000);
});
test('09 duplicate returned-item ID denied before preview',()=>{
  fault(patch(x=>x.returnedItemRefs.push('FAKE_ITEM_A')),'DUPLICATE_RETURNED_ITEM_REF');
});
test('10 missing returned item array denied',()=>{
  fault(fake({returnedItemRefs:undefined}),'INVALID_RETURNED_ITEMS_ROW_COUNT');
});
test('11 zero returned items denied',()=>{
  fault(fake({returnedItemRefs:[]}),'INVALID_RETURNED_ITEMS_ROW_COUNT');
});
test('12 third returned item without its own coverage and payment cannot pass',()=>{
  const r=fault(patch(x=>x.returnedItemRefs.push('FAKE_ITEM_C')),'MISSING_ITEM_LEDGER_COVERAGE');
  assert.ok(r.issues.includes('MISSING_PAYMENT_ALLOCATION_FOR_RETURNED_ITEM'));
});
test('13 coverage missing for returned item is a hard stop',()=>{
  fault(patch(x=>x.coverage.pop()),'MISSING_ITEM_LEDGER_COVERAGE');
});
test('14 compensation history snapshot ref is required even when client says zero outstanding',()=>{
  fault(patch(x=>delete x.coverage[0].compensationSnapshotRef),'COMPENSATION_SNAPSHOT_REF_REQUIRED');
});
test('15 payment snapshot ref is required',()=>{
  fault(patch(x=>delete x.coverage[0].paymentSnapshotRef),'PAYMENT_SNAPSHOT_REF_REQUIRED');
});
test('16 duplicate ledger coverage item is rejected',()=>{
  fault(patch(x=>x.coverage.push({...x.coverage[0]})),'DUPLICATE_ITEM_LEDGER_COVERAGE');
});
test('17 coverage for an unrelated item is rejected',()=>{
  fault(patch(x=>x.coverage[0].itemRef='FAKE_ITEM_OTHER'),'COVERAGE_FOR_NON_RETURNED_ITEM');
});
test('18 a missing payment allocation is not treated as zero paid',()=>{
  const r=fault(patch(x=>x.allocations=x.allocations.filter(v=>v.allocationRef!=='P2')),'MISSING_PAYMENT_ALLOCATION_FOR_RETURNED_ITEM');
  assert.equal(r.hypotheticalPaidCents,null);
});
test('19 an allocation for a nonreturned item cannot be silently counted',()=>{
  fault(patch(x=>x.allocations[0].itemRef='FAKE_ITEM_OTHER'),'ALLOCATION_FOR_NON_RETURNED_ITEM');
});
test('20 mixed-invoice allocated transaction prohibited',()=>{
  fault(patch(x=>x.allocations[0].invoiceRef='FAKE_INV_B'),'ALLOCATION_INVOICE_MISMATCH');
});
test('21 mixed-invoice parent payment prohibited',()=>{
  fault(patch(x=>x.transactions[0].invoiceRef='FAKE_INV_B'),'PARENT_INVOICE_MISMATCH');
});
test('22 missing parent transaction rejected',()=>{
  fault(patch(x=>x.allocations[0].transactionRef='FAKE_MISSING_PAYMENT'),'ALLOCATION_PARENT_TRANSACTION_MISSING');
});
test('23 duplicate parent transaction reference rejected',()=>{
  fault(patch(x=>x.transactions.push({...x.transactions[0]})),'DUPLICATE_PARENT_TRANSACTION_REF');
});
test('24 duplicate allocation reference across any entry kind rejected',()=>{
  fault(patch(x=>x.allocations[4].allocationRef='P1'),'DUPLICATE_ALLOCATION_REF');
});
test('25 same parent transaction allocated more than its stated total denied',()=>{
  fault(patch(x=>x.allocations[0].amountCents=7000),'ITEM_ALLOCATIONS_EXCEED_PARENT_TRANSACTION_AMOUNT');
});
test('26 one prior compensation event allocated more than parent amount denied',()=>{
  fault(patch(x=>x.allocations[2].amountCents=1100),'ITEM_ALLOCATIONS_EXCEED_PARENT_TRANSACTION_AMOUNT');
});
test('27 unsupported parent transaction kind rejected',()=>{
  fault(patch(x=>x.transactions[0].kind='PENDING_OR_UNSETTLED'),'UNSUPPORTED_PARENT_TRANSACTION_KIND');
});
test('28 unknown or malformed currency rejected, never default to EGP',()=>{
  fault(fake({currency:'bitcoin'}),'ISO_CURRENCY_REQUIRED');
});
test('29 cross-currency allocation cannot enter EGP refund ceiling',()=>{
  fault(patch(x=>x.allocations[0].currency='USD'),'ALLOCATION_CURRENCY_MISMATCH');
});
test('30 cross-currency parent transaction cannot enter EGP refund ceiling',()=>{
  fault(patch(x=>x.transactions[0].currency='USD'),'PARENT_CURRENCY_MISMATCH');
});
test('31 a string amount is rejected rather than coerced',()=>{
  fault(patch(x=>x.allocations[0].amountCents='6000'),'INVALID_ALLOCATION_CENTS');
});
test('32 floating-point payment amount is not rounded',()=>{
  fault(patch(x=>x.allocations[0].amountCents=6000.1),'INVALID_ALLOCATION_CENTS');
});
test('33 negative cash refund is rejected',()=>{
  fault(patch(x=>x.allocations[2].amountCents=-1000),'INVALID_ALLOCATION_CENTS');
});
test('34 nonexistent amount is rejected',()=>{
  fault(patch(x=>delete x.allocations[0].amountCents),'INVALID_ALLOCATION_CENTS');
});
test('35 negative parent payment is rejected',()=>{
  fault(patch(x=>x.transactions[0].amountCents=-9000),'INVALID_PARENT_TRANSACTION_CENTS');
});
test('36 overflow when summing item allocation amounts is an unconditional stop',()=>{
  fault(patch(x=>{x.transactions[0].amountCents=Number.MAX_SAFE_INTEGER; x.allocations[0].amountCents=Number.MAX_SAFE_INTEGER; x.allocations[1].amountCents=2;}),'UNSAFE_PARENT_ALLOCATION_SUM');
});
test('37 safe integer boundary is accepted only as a hypothetical value',()=>{
  const r=result(patch(x=>{x.transactions[0].amountCents=Number.MAX_SAFE_INTEGER; x.allocations[0].amountCents=Number.MAX_SAFE_INTEGER-3000; x.allocations[1].amountCents=3000;}));
  assert.equal(r.hypotheticalPaidCents,Number.MAX_SAFE_INTEGER);
  assert.equal(r.payoutAuthorized,false);
});
test('38 proposed cash missing causes review to fail closed',()=>{
  const x=fake();delete x.proposedCashRefundCents;
  fault(x,'PROPOSED_CASH_REQUIRED_IN_CENTS');
});
test('39 proposed customer credit decimal denied',()=>{
  fault(fake({proposedCustomerCreditCents:13.25}),'PROPOSED_CREDIT_REQUIRED_IN_CENTS');
});
test('40 projected credit is not an issued credit event until independent posting',()=>{
  const r=result(fake({expectedSupplierRecoveryCents:9999,customerStoreCreditRequestCents:9999}));
  assert.equal(r.hypotheticalPreviousCustomerCreditIssuedCents,800);
  assert.equal(r.policyPreview.customerCreditAuthorized,false);
});
test('41 personalized name defect remains an independent evidence request only',()=>{
  const r=result(fake({personalization:'CUSTOM_NAME',reportedReason:'MANUFACTURING_DEFECT',evidenceVerified:true}));
  assert.equal(r.policyPreview.productReviewRoute,'CUSTOMIZED_EXCEPTION_INDEPENDENT_EVIDENCE_REQUIRED');
  assert.equal(r.policyPreview.managerApprovalAuthenticated,false);
});
test('42 photo customization with customer error is not auto eligible under internal exception',()=>{
  const r=result(fake({personalization:'CUSTOM_PHOTO',reportedReason:'CUSTOMER_SUPPLIED_ERROR'}));
  assert.equal(r.policyPreview.productReviewRoute,'CUSTOMIZED_RETURN_POLICY_EXCEPTION_NOT_DEMONSTRATED');
});
test('43 return timing remains manager case by case, regardless of claimed age',()=>{
  const r=result(fake({daysSincePurchase:365,customerLegalWaiver:true}));
  assert.match(r.policyPreview.timing,/CASE_BY_CASE/);
});
test('44 physical damage and owner reimbursement flags cannot restock or post write-off',()=>{
  const r=result(fake({inspectionApproved:true,wasteCents:9999,supplierRecoveryApproved:true,manualOverheadRate:999}));
  assert.equal(r.stockOrWasteWriteAuthorized,false);
  assert.equal(r.productionOverheadMethod,'NOT_SELECTED_BY_MANAGEMENT');
});
test('45 review returns frozen output and frozen consistency issues',()=>{
  const r=result();assert.equal(Object.isFrozen(r),true);assert.equal(Object.isFrozen(r.issues),true);
  assert.equal(Object.isFrozen(r.neededIndependentEvidence),true);
});
test('46 invalid null case rejected rather than accepted as empty',()=>{
  fault(null,'CASE_OBJECT_REQUIRED');
});
test('47 too many synthetic allocation records rejected without calculating paid',()=>{
  fault(fake({allocations:Array.from({length:501},(_,i)=>({allocationRef:'A'+i}))}),'INVALID_ITEM_ALLOCATIONS_ROW_COUNT');
});
test('48 missing parent transaction list never silently creates a payment',()=>{
  const x=fake();delete x.transactions;
  fault(x,'INVALID_PARENT_TRANSACTIONS_ROW_COUNT');
});
test('49 zero refunded and zero issued credit still need caller coverage refs',()=>{
  const r=result(patch(x=>{
    x.transactions=x.transactions.filter(z=>z.kind==='PAYMENT_CAPTURED');
    x.allocations=x.allocations.filter(z=>z.transactionRef==='FAKE_PAY_PARENT');
  }));
  assert.equal(r.hypotheticalPreviousCashRefundCents,0);
  assert.equal(r.hypotheticalPreviousCustomerCreditIssuedCents,0);
  assert.equal(r.realCoverageVerified,false);
});
test('50 duplicate source reference and forged managerial signature still no GO',()=>{
  const r=result(fake({managerSignature:'FAKE_APPROVAL_SIGNATURE',sourceVerified:true,financeRelease:'GO',staffRole:'OWNER'}));
  assert.equal(r.financeRelease,'NO_GO');assert.equal(r.managerApprovalAuthenticated,false);
});
test('51 computed preview never has posting capabilities',()=>{
  const r=result();assert.equal(r.policyPreview.wastePosted,false);
  assert.equal(r.policyPreview.thirdPartyRecoveryPosted,false);
  assert.equal(r.policyPreview.actualManufacturingWasteCostCents,null);
});
test('52 module is unconnected to production backend or browser IO',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../scripts/accounting_acc204_return_ledger_lineage_no_go.cjs'),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\.prepare\s*\(|\.run\s*\(|\.execute\s*\(|\bD1Database\b/);
  assert.match(source,/evaluateReturnReview/);
});
