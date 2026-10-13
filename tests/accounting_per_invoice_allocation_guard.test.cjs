'use strict';
/**
 * FAIL-CLOSED desired-behavior regression cases against fabricated caller rows.
 * This test intentionally exposes an existing reconciliation bug; it does not
 * modify runtime, post finance, read D1, approve allocation policy or imply GO.
 * Keep the PR draft/red until the source guard is independently reviewed.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const {reconcileCustomerReceivables:R}=require('../scripts/easystore_receivable_reconciliation_review_no_go.cjs');
const inv=(id,total,paid)=>({invoiceRef:id,customerRef:'FAKE_CUST',currency:'EGP',totalCents:total,paidAtInvoiceCents:paid});
const ev=(id,ref,op,amount,time,extra={})=>({eventRef:id,invoiceRef:ref,customerRef:'FAKE_CUST',currency:'EGP',operation:op,amountCents:amount,occurredAt:time,...extra});
function packet(){return {customerRef:'FAKE_CUST',currency:'EGP',openingBalanceCents:0,coverageRef:'FAKE_ONLY',
 reportedInvoiceCreditCents:22000,reportedCustomerBalanceCents:17000,
 invoiceSnapshots:[inv('A',20000,8000),inv('B',10000,0)],
 ledgerEvents:[ev('I_A','A','invoice',20000,'2026-08-10T09:00:00Z'),
 ev('P_A','A','payment_received',8000,'2026-08-10T09:01:00Z',{paymentOrigin:'invoice_initial'}),
 ev('I_B','B','invoice',10000,'2026-08-10T10:00:00Z'),
 ev('L_A','A','payment_received',5000,'2026-08-10T12:00:00Z',{paymentOrigin:'later_collection'})]};}
const cases=[
 ['baseline',p=>{},'STRUCTURALLY_COHERENT'],
 ['per-invoice excess hidden by other customer debt',p=>{p.ledgerEvents[3].amountCents=12100;p.reportedCustomerBalanceCents=9900},'INVOICE_ALLOCATION_OVERPAYMENT'],
 ['exact invoice ceiling',p=>{p.ledgerEvents[3].amountCents=12000;p.reportedCustomerBalanceCents=10000},'STRUCTURALLY_COHERENT'],
 ['split receipts exact',p=>{p.ledgerEvents[3].amountCents=6000;p.ledgerEvents.push(ev('L2','A','payment_received',6000,'2026-08-10T13:00:00Z',{paymentOrigin:'later_collection'}));p.reportedCustomerBalanceCents=10000},'STRUCTURALLY_COHERENT'],
 ['split receipts one cent over',p=>{p.ledgerEvents[3].amountCents=6000;p.ledgerEvents.push(ev('L2','A','payment_received',6001,'2026-08-10T13:00:00Z',{paymentOrigin:'later_collection'}));p.reportedCustomerBalanceCents=9999},'INVOICE_ALLOCATION_OVERPAYMENT'],
 ['initial receipt posted after later collection',p=>{p.ledgerEvents[3].occurredAt='2026-08-10T09:00:30Z';p.ledgerEvents.splice(1,0,p.ledgerEvents.pop())},'INITIAL_PAYMENT_AFTER_LATER_COLLECTION'],
 ['incomplete initial receipt',p=>{p.ledgerEvents[1].amountCents=7000;p.reportedCustomerBalanceCents=18000},'INITIAL_INVOICE_PAYMENT_MISMATCH'],
 ['initial receipt exceeds snapshot',p=>{p.ledgerEvents[1].amountCents=8100;p.reportedCustomerBalanceCents=16900},'INITIAL_INVOICE_PAYMENT_MISMATCH'],
 ['aggregate closing mismatch',p=>{p.reportedCustomerBalanceCents=17001},'CUSTOMER_BALANCE_RECONCILIATION_MISMATCH']
];
for(const [name,mutate,expected] of cases)test(name,()=>{
 const p=packet();mutate(p);const r=R(p);
 assert.equal(r.code,expected);
 assert.equal(r.financeRelease,'NO_GO');
 assert.equal(r.authoritativeLedgerVerified,false);
 assert.equal(r.allowsCashMovement,false);
 assert.equal(r.allowsProductionClose,false);
});
