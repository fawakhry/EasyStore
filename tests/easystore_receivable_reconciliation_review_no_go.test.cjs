'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {reconcileCustomerReceivables:R}=require('../scripts/easystore_receivable_reconciliation_review_no_go.cjs');
function packet(){
  return {
    customerRef:'FAKE_CUST_1',currency:'EGP',openingBalanceCents:0,
    coverageRef:'UNVERIFIED_FAKE_COVERAGE_NOTE',reportedInvoiceCreditCents:12000,
    reportedCustomerBalanceCents:7000,
    invoiceSnapshots:[{invoiceRef:'FAKE_INV_1',customerRef:'FAKE_CUST_1',currency:'EGP',totalCents:20000,paidAtInvoiceCents:8000}],
    ledgerEvents:[
      {eventRef:'FAKE_INVOICE_EVENT_1',customerRef:'FAKE_CUST_1',currency:'EGP',
        invoiceRef:'FAKE_INV_1',operation:'invoice',amountCents:20000,occurredAt:'2026-08-10T09:00:00Z'},
      {eventRef:'FAKE_PAYMENT_EVENT_1',customerRef:'FAKE_CUST_1',currency:'EGP',
        invoiceRef:'FAKE_INV_1',operation:'payment_received',paymentOrigin:'invoice_initial',amountCents:8000,occurredAt:'2026-08-10T09:01:00Z'},
      {eventRef:'FAKE_PAYMENT_EVENT_2',customerRef:'FAKE_CUST_1',currency:'EGP',
        invoiceRef:'FAKE_INV_1',operation:'payment_received',paymentOrigin:'later_collection',amountCents:5000,occurredAt:'2026-08-10T12:00:00Z'}
    ]
  };
}
const check=(change)=>{const p=packet();change(p);return R(p)};
test('01 original fake purchase/sale/collection: 120 EGP invoice credit is NOT 70 EGP current outstanding',()=>{
  const result=R(packet());
  assert.equal(result.code,'STRUCTURALLY_COHERENT');
  assert.equal(result.state,'REVIEW_REQUIRED');
  assert.equal(result.invoiceTimeCreditCents,12000);
  assert.equal(result.currentCustomerOutstandingCents,7000);
  assert.equal(result.invoiceCreditMinusOutstandingCents,5000);
  assert.deepEqual(result.findings.includes('INVOICE_TIME_CREDIT_IS_NOT_CURRENT_RECEIVABLE'),true);
});
test('02 financial, stock, manager authority always forbidden for coherent fake data',()=>{
  const r=R(packet());
  assert.equal(r.financeRelease,'NO_GO');
  for(const k of ['authoritativeLedgerVerified','managerApprovalVerified','allowsCashMovement','allowsCustomerCredit','allowsStockMovement','allowsProductionClose'])assert.equal(r[k],false,k);
});
test('03 missing invoice lineage is STOP',()=>{const r=check(p=>p.ledgerEvents.splice(0,1));assert.equal(r.state,'STOP');});
test('04 invoice gross mismatch cannot be disguised as closing balance',()=>{const r=check(p=>p.invoiceSnapshots[0].totalCents=21000);assert.equal(r.code,'MISSING_OR_MISMATCHED_INVOICE_DEBIT');});
test('05 incomplete initial payment event cannot match the invoice',()=>{const r=check(p=>p.ledgerEvents[1].amountCents=7000);assert.equal(r.code,'INITIAL_INVOICE_PAYMENT_MISMATCH');});
test('06 unmatched collection against invoice is denied',()=>{const r=check(p=>p.ledgerEvents[2].invoiceRef='FAKE_DIFFERENT_INVOICE');assert.equal(r.code,'COLLECTION_ALLOCATION_UNPROVEN');});
test('07 unknown customer-level unallocated collection requires management allocation decision',()=>{const r=check(p=>delete p.ledgerEvents[2].invoiceRef);assert.equal(r.code,'COLLECTION_ALLOCATION_UNPROVEN');});
test('08 duplicate idempotency event reference is denied',()=>{const r=check(p=>p.ledgerEvents[2].eventRef=p.ledgerEvents[1].eventRef);assert.equal(r.code,'INVALID_OR_DUPLICATE_LEDGER_EVENT');});
test('09 extra customer event outside scope is refused',()=>{const r=check(p=>p.ledgerEvents[2].customerRef='FAKE_CUST_2');assert.equal(r.state,'STOP');});
test('10 unexpected currency is refused',()=>{const r=check(p=>p.ledgerEvents[2].currency='USD');assert.equal(r.state,'STOP');});
test('11 payment from the future cannot appear ahead of earlier events',()=>{const r=check(p=>p.ledgerEvents[2].occurredAt='2026-08-10T08:00:00Z');assert.equal(r.code,'OUT_OF_ORDER_EVENTS');});
test('12 impossible overcollection stops before releasing any account authority',()=>{const r=check(p=>p.ledgerEvents[2].amountCents=20001);assert.equal(r.code,'OVER_COLLECTION_OR_MISSING_DEBIT');});
test('13 unknown refund and customer credit operations are not silently interpreted as payments',()=>{for(const op of ['refund','customer_credit_issued','void','sale_reversal','payment_paid']){const r=check(p=>p.ledgerEvents[2].operation=op);assert.equal(r.code,'INVALID_OR_DUPLICATE_LEDGER_EVENT',op);}});
test('14 fake manager approval field cannot turn structural review into GO',()=>{const r=check(p=>{p.managerApproved=true;p.serverVerified=true;p.ledgerEvents[2].serverVerified=true});assert.equal(r.financeRelease,'NO_GO');assert.equal(r.authoritativeLedgerVerified,false);});
test('15 report invoice snapshot mismatch is distinguished from closing customer balance mismatch',()=>{
  const a=check(p=>p.reportedInvoiceCreditCents=11000),b=check(p=>p.reportedCustomerBalanceCents=7100);
  assert.equal(a.code,'INVOICE_CREDIT_SNAPSHOT_MISMATCH');assert.equal(a.expectedInvoiceCreditCents,12000);
  assert.equal(b.code,'CUSTOMER_BALANCE_RECONCILIATION_MISMATCH');assert.equal(b.computedClosingBalanceCents,7000);
});
test('16 duplicate invoice snapshots cannot inflate reported credit',()=>{const r=check(p=>p.invoiceSnapshots.push({...p.invoiceSnapshots[0]}));assert.equal(r.code,'INVALID_OR_DUPLICATE_INVOICE_SNAPSHOT');});
test('17 missing scope/currency/coverage is STOP',()=>{
  for(const prop of ['customerRef','currency','coverageRef']){
    const r=check(p=>delete p[prop]);assert.equal(r.state,'STOP',prop);
  }
});
test('18 negative, fractional and overflowing cent amounts are denied',()=>{
  for(const n of [-1,0.2,Number.MAX_SAFE_INTEGER+1,NaN,Infinity]){
    const r=check(p=>p.ledgerEvents[2].amountCents=n);assert.equal(r.code,'INVALID_OR_DUPLICATE_LEDGER_EVENT',String(n));
  }
});
test('19 invalid date strings and missing event ids fail-closed',()=>{
  for(const value of ['tomorrow','2026-08-10','2026-99-99T88:88:88Z','']){
    const r=check(p=>p.ledgerEvents[2].occurredAt=value);assert.equal(r.code,'INVALID_OR_DUPLICATE_LEDGER_EVENT',value);
  }
  assert.equal(check(p=>p.ledgerEvents[2].eventRef='').code,'INVALID_OR_DUPLICATE_LEDGER_EVENT');
});
test('20 introduced adjustment without evidence is STOP; supported adjustment needs distinct proof',()=>{
  const a=check(p=>p.ledgerEvents[2]={eventRef:'ADJ',customerRef:'FAKE_CUST_1',currency:'EGP',operation:'adjustment_decrease',amountCents:5000,occurredAt:'2026-08-10T12:00:00Z'});
  assert.equal(a.code,'ADJUSTMENT_PROOF_MISSING');
  const b=check(p=>{p.ledgerEvents[2]={eventRef:'ADJ',customerRef:'FAKE_CUST_1',currency:'EGP',operation:'adjustment_decrease',amountCents:5000,occurredAt:'2026-08-10T12:00:00Z',adjustmentProofRef:'FAKE_UNVERIFIED_MANAGER_CASE'};});
  assert.equal(b.code,'STRUCTURALLY_COHERENT');assert.equal(b.managerApprovalVerified,false);assert.equal(b.financeRelease,'NO_GO');
});
test('21 opening receivable is reconciled separately from invoiced credit, cannot misstate it',()=>{
  const r=check(p=>{p.openingBalanceCents=2000;p.reportedCustomerBalanceCents=9000;});
  assert.equal(r.code,'STRUCTURALLY_COHERENT');
  assert.equal(r.invoiceTimeCreditCents,12000);assert.equal(r.currentCustomerOutstandingCents,9000);
});
test('22 no ledger rows and oversized fabricated event sets are rejected',()=>{
  assert.equal(check(p=>p.ledgerEvents=[]).code,'INVALID_ROW_COUNTS');
  assert.equal(check(p=>p.ledgerEvents=Array(1001).fill(p.ledgerEvents[0])).code,'INVALID_ROW_COUNTS');
});
test('23 explicit identical reopening of same invoice cannot silently duplicate debt',()=>{
  const r=check(p=>p.ledgerEvents.push({...p.ledgerEvents[0],eventRef:'FAKE_REOPENED_INVOICE',occurredAt:'2026-08-10T15:00:00Z'}));
  assert.equal(r.code,'MISSING_OR_MISMATCHED_INVOICE_DEBIT');
});
test('24 baseline EasyStore legacy daily report credit is derived from invoice remaining, not subsequent receipts',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','Code.gs'),'utf8');
  const start=source.indexOf('function accountingDailyReportV1920_('),end=source.indexOf('\nfunction ',start+10);
  const implementation=source.slice(start,end);
  assert.ok(start>0&&end>start);
  assert.match(implementation,/report\.credit\+=remain/);
  assert.match(implementation,/report\.credit\+=allocatedCredit/);
  assert.match(implementation,/report\.receipts\+=amount/);
  assert.doesNotMatch(implementation,/report\.credit\s*-=amount/);
  // The joined fake-handler test proves the invoice/collection amounts;
  // this static boundary confirms why credit !== current ledger balance.
});
test('25 no actual D1 persistence or permission implementation present in pure helper',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','scripts/easystore_receivable_reconciliation_review_no_go.cjs'),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|\bquery\s*\(|\bprepare\s*\(|\bexec\s*\(/);
  assert.doesNotMatch(source,/require\(['"](?:node:)?(?:http|https|sqlite3|child_process|fs)/);
});
