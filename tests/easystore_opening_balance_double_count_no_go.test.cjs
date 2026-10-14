'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {reconcileCustomerReceivables:R}=require('../scripts/easystore_receivable_reconciliation_review_no_go.cjs');

function packet(){
  const customerRef='FAKE_CUSTOMER',invoiceRef='FAKE_INVOICE',currency='EGP';
  return {
    customerRef,coverageRef:'FAKE_UNVERIFIED_COVERAGE',currency,
    openingBalanceCents:500,reportedInvoiceCreditCents:12000,reportedCustomerBalanceCents:8000,
    invoiceSnapshots:[{invoiceRef,customerRef,currency,totalCents:20000,paidAtInvoiceCents:8000}],
    ledgerEvents:[
      {eventRef:'FAKE_OPEN',customerRef,currency,operation:'opening_debt',
        adjustmentProofRef:'FAKE_OPEN_PROOF',amountCents:500,occurredAt:'2026-08-10T08:00:00Z'},
      {eventRef:'FAKE_SALE',customerRef,currency,operation:'invoice',invoiceRef,
        amountCents:20000,occurredAt:'2026-08-10T09:00:00Z'},
      {eventRef:'FAKE_INITIAL_PAYMENT',customerRef,currency,operation:'payment_received',
        paymentOrigin:'invoice_initial',invoiceRef,amountCents:8000,occurredAt:'2026-08-10T09:01:00Z'},
      {eventRef:'FAKE_LATER_COLLECTION',customerRef,currency,operation:'payment_received',
        paymentOrigin:'later_collection',invoiceRef,amountCents:5000,occurredAt:'2026-08-10T12:00:00Z'}
    ]
  };
}

test('ambiguous opening snapshot plus opening_debt event fails closed',()=>{
  const r=R(packet());
  assert.equal(r.code,'OPENING_BALANCE_EVENT_DOUBLE_COUNT_RISK');
  assert.equal(r.state,'STOP');
  assert.equal(r.financeRelease,'NO_GO');
  assert.equal(r.allowsCashMovement,false);
});
test('single opening_debt event with zero opening snapshot stays review-only',()=>{
  const p=packet();p.openingBalanceCents=0;p.reportedCustomerBalanceCents=7500;
  const r=R(p);
  assert.equal(r.code,'STRUCTURALLY_COHERENT');
  assert.equal(r.state,'REVIEW_REQUIRED');
  assert.equal(r.financeRelease,'NO_GO');
});
test('opening snapshot without opening_debt event stays review-only',()=>{
  const p=packet();p.ledgerEvents.shift();p.reportedCustomerBalanceCents=7500;
  const r=R(p);
  assert.equal(r.code,'STRUCTURALLY_COHERENT');
  assert.equal(r.state,'REVIEW_REQUIRED');
  assert.equal(r.financeRelease,'NO_GO');
});
