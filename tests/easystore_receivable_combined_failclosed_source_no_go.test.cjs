'use strict';
/* Source-only, synthetic. Never financial posting or release. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {reconcileCustomerReceivables:R}=require('../scripts/easystore_receivable_reconciliation_review_no_go.cjs');
function packet(){
 const c='FAKE_C',i='FAKE_INV';
 return {customerRef:c,currency:'EGP',coverageRef:'FAKE_UNVERIFIED',openingBalanceCents:0,
 reportedInvoiceCreditCents:12000,reportedCustomerBalanceCents:7000,
 invoiceSnapshots:[{invoiceRef:i,customerRef:c,currency:'EGP',totalCents:20000,paidAtInvoiceCents:8000}],
 ledgerEvents:[
 {eventRef:'FAKE_I',customerRef:c,currency:'EGP',invoiceRef:i,operation:'invoice',amountCents:20000,occurredAt:'2026-10-15T01:00:00.000Z'},
 {eventRef:'FAKE_P',customerRef:c,currency:'EGP',invoiceRef:i,operation:'payment_received',paymentOrigin:'invoice_initial',amountCents:8000,occurredAt:'2026-10-15T01:00:00.001Z'},
 {eventRef:'FAKE_L',customerRef:c,currency:'EGP',invoiceRef:i,operation:'payment_received',paymentOrigin:'later_collection',amountCents:5000,occurredAt:'2026-10-15T01:00:00.002Z'}]};
}
function safe(result){assert.equal(result.financeRelease,'NO_GO');assert.equal(result.authoritativeLedgerVerified,false);
 for(const k of ['allowsCashMovement','allowsCustomerCredit','allowsStockMovement','allowsProductionClose'])assert.equal(result[k],false,k);
}
function check(name,change,code,state){test(name,()=>{const p=packet();change(p);const r=R(p);assert.equal(r.code,code);assert.equal(r.state,state);safe(r);});}
check('01 normal source-only split invoice credit vs closing receivable',()=>{},'STRUCTURALLY_COHERENT','REVIEW_REQUIRED');
check('02 equivalent timestamps with different lexical forms STOP',p=>{p.ledgerEvents[1].occurredAt='2026-10-15T01:00:00Z'},'AMBIGUOUS_EVENT_ORDER','STOP');
check('03 zero-valued initial receipt is not proof',p=>{p.invoiceSnapshots[0].paidAtInvoiceCents=0;p.ledgerEvents[1].amountCents=0;p.reportedInvoiceCreditCents=20000;p.reportedCustomerBalanceCents=15000},'ZERO_AMOUNT_INITIAL_PAYMENT_NOT_EVIDENCE','STOP');
check('04 opening balance plus opening_debt is ambiguous',p=>{p.openingBalanceCents=10000;p.reportedCustomerBalanceCents=27000;p.ledgerEvents.push({eventRef:'FAKE_OD',customerRef:p.customerRef,currency:'EGP',operation:'opening_debt',amountCents:10000,adjustmentProofRef:'FAKE_PROOF',occurredAt:'2026-10-15T01:00:00.003Z'})},'AMBIGUOUS_OPENING_DEBT_PROVENANCE','STOP');
check('05 opening_debt without opening balance remains review-only',p=>{p.reportedCustomerBalanceCents=17000;p.ledgerEvents.push({eventRef:'FAKE_OD',customerRef:p.customerRef,currency:'EGP',operation:'opening_debt',amountCents:10000,adjustmentProofRef:'FAKE_PROOF',occurredAt:'2026-10-15T01:00:00.003Z'})},'STRUCTURALLY_COHERENT','REVIEW_REQUIRED');
check('06 overlapping anomalies fail closed in chronological priority',p=>{p.openingBalanceCents=10000;p.invoiceSnapshots[0].paidAtInvoiceCents=0;p.reportedInvoiceCreditCents=20000;p.reportedCustomerBalanceCents=35000;p.ledgerEvents[1].amountCents=0;p.ledgerEvents[1].occurredAt='2026-10-15T01:00:00.000Z';p.ledgerEvents.push({eventRef:'FAKE_OD',customerRef:p.customerRef,currency:'EGP',operation:'opening_debt',amountCents:10000,adjustmentProofRef:'FAKE_PROOF',occurredAt:'2026-10-15T01:00:00.003Z'})},'AMBIGUOUS_EVENT_ORDER','STOP');
check('07 earlier timestamp still retains legacy out-of-order error',p=>{p.ledgerEvents[2].occurredAt='2026-10-14T23:59:59.999Z'},'OUT_OF_ORDER_EVENTS','STOP');
