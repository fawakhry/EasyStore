'use strict';
/* EasyStore SOURCE_ONLY: fabricated customer/invoice/receipt refs; NO financial writes. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {reconcileCustomerReceivables:reconcile}=require('../scripts/easystore_receivable_reconciliation_review_no_go.cjs');

function fakePacket(){
  const customerRef='FAKE_CUSTOMER',invoiceRef='FAKE_INVOICE';
  return {
    customerRef,currency:'EGP',coverageRef:'FAKE_UNVERIFIED_COVERAGE',
    openingBalanceCents:0,reportedInvoiceCreditCents:12000,
    reportedCustomerBalanceCents:7000,
    invoiceSnapshots:[{invoiceRef,customerRef,currency:'EGP',totalCents:20000,paidAtInvoiceCents:8000}],
    ledgerEvents:[
      {eventRef:'FAKE_SALE',customerRef,currency:'EGP',invoiceRef,operation:'invoice',amountCents:20000,occurredAt:'2026-10-15T10:00:00.000Z'},
      {eventRef:'FAKE_INITIAL',customerRef,currency:'EGP',invoiceRef,operation:'payment_received',paymentOrigin:'invoice_initial',amountCents:8000,occurredAt:'2026-10-15T10:00:00.001Z'},
      {eventRef:'FAKE_RECEIPT',customerRef,currency:'EGP',invoiceRef,operation:'payment_received',paymentOrigin:'later_collection',amountCents:5000,occurredAt:'2026-10-15T10:00:00.002Z'}
    ]
  };
}
function checkSafety(result){
  assert.equal(result.financeRelease,'NO_GO');
  assert.equal(result.authoritativeLedgerVerified,false);
  assert.equal(result.managerApprovalVerified,false);
  for(const key of ['allowsCashMovement','allowsCustomerCredit','allowsStockMovement','allowsProductionClose']){
    assert.equal(result[key],false,key);
  }
}
function stopCase(name,mutate,expected){
  test(name,()=>{
    const packet=fakePacket();mutate(packet);
    const result=reconcile(packet);
    assert.equal(result.code,expected);
    assert.equal(result.state,'STOP');
    checkSafety(result);
  });
}
test('01 fabricated baseline distinguishes invoice-time credit from closing receivable',()=>{
  const result=reconcile(fakePacket());
  assert.equal(result.state,'REVIEW_REQUIRED');
  assert.equal(result.invoiceTimeCreditCents,12000);
  assert.equal(result.currentCustomerOutstandingCents,7000);
  assert.equal(result.invoiceCreditMinusOutstandingCents,5000);
  checkSafety(result);
});
stopCase('02 invoice snapshot ref with bidi override is denied',p=>{p.invoiceSnapshots[0].invoiceRef='FAKE_INVOICE\u202e'},'INVALID_OR_DUPLICATE_INVOICE_SNAPSHOT');
stopCase('03 event ref containing NUL is denied',p=>{p.ledgerEvents[2].eventRef='FAKE_RECEIPT\u0000'},'INVALID_OR_DUPLICATE_LEDGER_EVENT');
stopCase('04 packet customer ref containing TAB is denied',p=>{p.customerRef='FAKE_CUSTOMER\t'},'MISSING_SCOPE_OR_UNVERIFIED_COVERAGE');
stopCase('05 coverage ref containing newline is denied',p=>{p.coverageRef='FAKE_UNVERIFIED_COVERAGE\n'},'MISSING_SCOPE_OR_UNVERIFIED_COVERAGE');
stopCase('06 payment invoice ref with zero-width space cannot allocate',p=>{p.ledgerEvents[2].invoiceRef='FAKE_INVOICE\u200b'},'COLLECTION_ALLOCATION_UNPROVEN');
stopCase('07 invoice event ref with directional isolate is denied',p=>{p.ledgerEvents[0].eventRef='FAKE_SALE\u2066'},'INVALID_OR_DUPLICATE_LEDGER_EVENT');
stopCase('08 adjustment proof containing bidi override is denied',p=>{
  p.ledgerEvents[2]={eventRef:'FAKE_ADJUSTMENT',customerRef:p.customerRef,currency:'EGP',operation:'adjustment_decrease',amountCents:5000,adjustmentProofRef:'FAKE_PROOF\u202e',occurredAt:'2026-10-15T10:00:00.002Z'};
},'ADJUSTMENT_PROOF_MISSING');
stopCase('09 caller asOf cutoff is never authoritative',p=>{p.asOf='2026-10-15T23:59:59Z'},'UNVERIFIED_AS_OF_SNAPSHOT');
stopCase('10 caller reportPeriodEnd is never authoritative',p=>{p.reportPeriodEnd='2026-10-15'},'UNVERIFIED_AS_OF_SNAPSHOT');
stopCase('11 even undefined caller cutoff is rejected',p=>{p.asOf=undefined},'UNVERIFIED_AS_OF_SNAPSHOT');
