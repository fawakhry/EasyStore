'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {previewCustomerCollectionV1:collect,previewNextCustomerInvoiceV1:invoice}=require('../scripts/easystore_customer_credit_carry_forward_no_go.cjs');
const valid=r=>{assert.equal(r.success,true,JSON.stringify(r));assert.equal(r.postingAllowed,false);assert.equal(r.financeRelease,'NO_GO');assert.equal(r.after.displayBalanceCents,r.after.creditCents-r.after.debtCents);assert.ok(!(r.after.debtCents>0&&r.after.creditCents>0));return r;};
const rejected=r=>{assert.equal(r.success,false);assert.equal(r.postingAllowed,false);assert.equal(r.financeRelease,'NO_GO');};
test('01 customer owes 97 EGP, pays 100 -> +3 EGP customer credit',()=>{
 const r=valid(collect({debtCents:9700,creditCents:0,cashReceivedCents:10000}));
 assert.equal(r.collection.appliedAgainstAggregateDebtCents,9700);
 assert.equal(r.collection.createdCustomerCreditCents,300);
 assert.deepEqual(r.after,{debtCents:0,creditCents:300,displayBalanceCents:300});
 assert.equal(r.collection.cashboxReceiptCents,10000);
});
test('02 next invoice 20 EGP applies previous +3 -> 17 due',()=>{
 const p=valid(collect({debtCents:9700,creditCents:0,cashReceivedCents:10000}));
 const r=valid(invoice({...p.after,invoiceTotalCents:2000,cashReceivedCents:0}));
 assert.equal(r.invoice.appliedCustomerCreditCents,300);
 assert.equal(r.invoice.invoiceRemainingCents,1700);
 assert.equal(r.invoice.cashboxReceiptCents,0);
 assert.deepEqual(r.after,{debtCents:1700,creditCents:0,displayBalanceCents:-1700});
 assert.equal(r.invoice.requiresCustomerCreditLiabilityJournal,true);
});
test('03 prepayment with no invoice -> full positive liability, not revenue',()=>{
 const r=valid(collect({debtCents:0,creditCents:0,cashReceivedCents:1050}));
 assert.equal(r.collection.createdCustomerCreditCents,1050);assert.equal(r.after.displayBalanceCents,1050);
});
test('04 existing credit plus prepaid cash accumulates',()=>{
 const r=valid(collect({debtCents:0,creditCents:300,cashReceivedCents:250}));assert.equal(r.after.creditCents,550);
});
test('05 invoice smaller than existing advance: invoice settled, unused credit retained',()=>{
 const r=valid(invoice({debtCents:0,creditCents:15000,invoiceTotalCents:10000,cashReceivedCents:0}));
 assert.equal(r.invoice.invoiceRemainingCents,0);assert.equal(r.invoice.appliedCustomerCreditCents,10000);
 assert.equal(r.after.creditCents,5000);assert.equal(r.after.displayBalanceCents,5000);
});
test('06 cash at invoice greater than invoice price creates positive credit',()=>{
 const r=valid(invoice({debtCents:0,creditCents:0,invoiceTotalCents:9750,cashReceivedCents:10000}));
 assert.equal(r.invoice.cashAppliedToNewInvoiceCents,9750);
 assert.equal(r.invoice.createdCustomerCreditCents,250);
 assert.equal(r.invoice.cashboxReceiptCents,10000);
 assert.equal(r.after.creditCents,250);assert.equal(r.after.debtCents,0);
});
test('07 prior credit and excess cash do not double count the same payment',()=>{
 const r=valid(invoice({debtCents:0,creditCents:300,invoiceTotalCents:2000,cashReceivedCents:2000}));
 assert.equal(r.invoice.appliedCustomerCreditCents,300);assert.equal(r.invoice.cashAppliedToNewInvoiceCents,1700);
 assert.equal(r.invoice.createdCustomerCreditCents,300);
 assert.equal(r.invoice.cashboxReceiptCents,2000);assert.equal(r.after.creditCents,300);
});
test('08 older debt consumes surplus current cash before new credit is created',()=>{
 const r=valid(invoice({debtCents:500,creditCents:0,invoiceTotalCents:2000,cashReceivedCents:3000}));
 assert.equal(r.invoice.cashAppliedToNewInvoiceCents,2000);
 assert.equal(r.invoice.cashAppliedToOldAggregateDebtCents,500);
 assert.equal(r.invoice.createdCustomerCreditCents,500);
 assert.deepEqual(r.after,{debtCents:0,creditCents:500,displayBalanceCents:500});
 assert.equal(r.invoice.oldInvoiceAllocation,'NONE_UNDECIDED');
});
test('09 no cash and no credit means new invoice increases aggregate debt',()=>{
 const r=valid(invoice({debtCents:1000,creditCents:0,invoiceTotalCents:5000,cashReceivedCents:0}));
 assert.equal(r.invoice.invoiceRemainingCents,5000);assert.equal(r.after.debtCents,6000);
});
test('10 exact settlement clears debt, no fictitious customer advance',()=>{
 const r=valid(collect({debtCents:250,creditCents:0,cashReceivedCents:250}));
 assert.equal(r.after.displayBalanceCents,0);assert.equal(r.after.creditCents,0);
});
test('11 1 piastre surplus is exact; reject floating-point EGP amounts',()=>{
 const r=valid(collect({debtCents:9999,creditCents:0,cashReceivedCents:10000}));
 assert.equal(r.after.creditCents,1);
 rejected(collect({debtCents:9999,creditCents:0,cashReceivedCents:100.01}));
});
test('12 reject nonreconciled simultaneous debt and positive credit',()=>{
 rejected(collect({debtCents:100,creditCents:200,cashReceivedCents:1}));
 rejected(invoice({debtCents:100,creditCents:200,invoiceTotalCents:200,cashReceivedCents:0}));
});
test('13 reject invalid, negative and unsafe money values',()=>{
 for(const v of [-1,NaN,Infinity,'100',null,1.1,Number.MAX_SAFE_INTEGER+1]){
  rejected(collect({debtCents:v,creditCents:0,cashReceivedCents:100}));
  rejected(invoice({debtCents:0,creditCents:v,invoiceTotalCents:100,cashReceivedCents:0}));
 }
 rejected(collect({debtCents:0,creditCents:0,cashReceivedCents:0}));
 rejected(invoice({debtCents:0,creditCents:0,invoiceTotalCents:0,cashReceivedCents:0}));
});
test('14 arithmetic overflow rejects cumulative advance/debt',()=>{
 rejected(collect({debtCents:0,creditCents:Number.MAX_SAFE_INTEGER,cashReceivedCents:1}));
 rejected(invoice({debtCents:Number.MAX_SAFE_INTEGER,creditCents:0,invoiceTotalCents:2000,cashReceivedCents:0}));
});
test('15 preview never authorizes financial POST, refund, ledger or real cashbox writes',()=>{
 for(const r of [
  collect({debtCents:0,creditCents:0,cashReceivedCents:100}),
  invoice({debtCents:0,creditCents:300,invoiceTotalCents:200,cashReceivedCents:0})
 ]){
  valid(r);assert.equal(Object.hasOwn(r,'authoritativeLedgerPosted'),false);
 }
});
test('16 fake in-memory SQLite: no duplicate cash; advance liability consumed on later invoice',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE fake_customer_balances(customer_id TEXT PRIMARY KEY,debt_cents INTEGER NOT NULL CHECK(debt_cents>=0),credit_cents INTEGER NOT NULL CHECK(credit_cents>=0),CHECK(NOT(debt_cents>0 AND credit_cents>0)))');
  db.exec('CREATE TABLE fake_cashbox(request_id TEXT PRIMARY KEY,cents INTEGER NOT NULL CHECK(cents>=0))');
  db.exec('CREATE TABLE fake_customer_credit_liability_event(event_id TEXT PRIMARY KEY,delta_cents INTEGER NOT NULL)');
  const id='FAKE_ONLY_CUSTOMER_1';
  db.prepare('INSERT INTO fake_customer_balances VALUES(?,?,?)').run(id,9700,0);
  const p=valid(collect({debtCents:9700,creditCents:0,cashReceivedCents:10000}));
  db.exec('BEGIN IMMEDIATE');
  db.prepare('UPDATE fake_customer_balances SET debt_cents=?,credit_cents=? WHERE customer_id=?').run(p.after.debtCents,p.after.creditCents,id);
  db.prepare('INSERT INTO fake_cashbox VALUES(?,?)').run('FAKE_RECEIPT_1',p.collection.cashboxReceiptCents);
  db.prepare('INSERT INTO fake_customer_credit_liability_event VALUES(?,?)').run('FAKE_ADVANCE_1',p.collection.createdCustomerCreditCents);
  db.exec('COMMIT');
  assert.throws(()=>db.prepare('INSERT INTO fake_cashbox VALUES(?,?)').run('FAKE_RECEIPT_1',10000));
  assert.equal(db.prepare('SELECT SUM(cents) AS s FROM fake_cashbox').get().s,10000);
  const next=valid(invoice({debtCents:0,creditCents:300,invoiceTotalCents:2000,cashReceivedCents:0}));
  db.prepare('UPDATE fake_customer_balances SET debt_cents=?,credit_cents=? WHERE customer_id=?').run(next.after.debtCents,next.after.creditCents,id);
  db.prepare('INSERT INTO fake_customer_credit_liability_event VALUES(?,?)').run('FAKE_ADVANCE_APPLY_1',-next.invoice.appliedCustomerCreditCents);
  assert.equal(db.prepare('SELECT SUM(delta_cents) AS s FROM fake_customer_credit_liability_event').get().s,0);
  assert.equal(db.prepare('SELECT debt_cents FROM fake_customer_balances').get().debt_cents,1700);
  assert.equal(db.prepare('SELECT credit_cents FROM fake_customer_balances').get().credit_cents,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fake_cashbox').get().n,1);
 }finally{db.close()}
});
