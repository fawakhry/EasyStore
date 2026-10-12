'use strict';

/**
 * ACC204 / EasyStore: isolated, source-only reconciliation of fabricated
 * RETURNED ITEM payment/compensation allocations to fabricated parent events.
 *
 * No account or payment truth follows from matching references provided by
 * one untrusted caller. It is a structural consistency checker, NOT a ledger
 * reader, approval service, refund engine, manager verifier, proof authenticator
 * or financial acceptance test. Never issues a GO.
 */
const {evaluateReturnReview} = require('./accounting_acc203_return_review_preview.cjs');
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const TYPES = Object.freeze(['PAYMENT_CAPTURED','CASH_REFUND','CUSTOMER_CREDIT_ISSUED']);
const MAX_ROWS = 500;
const REF = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const MONEY = /^[A-Z]{3}$/;
function ref(value, issue, errors) {
  if(typeof value !== 'string' || !REF.test(value)) {errors.push(issue);return null;}
  return value;
}
function cents(value, issue, errors) {
  if(typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    errors.push(issue);return null;
  }
  return value;
}
function sum(a,b,issue,errors) {
  if(a === null || b === null) return null;
  const result = a+b;
  if(!Number.isSafeInteger(result)) {errors.push(issue);return null;}
  return result;
}
function rows(input,name,errors,nonempty=false) {
  if(!Array.isArray(input) || input.length > MAX_ROWS || (nonempty && !input.length)) {
    errors.push('INVALID_'+name+'_ROW_COUNT');
    return [];
  }
  return input;
}
function inspectReturnLedgerLineage(raw) {
  const errors=[];
  const input = isObj(raw) ? raw : {};
  if(input!==raw) errors.push('CASE_OBJECT_REQUIRED');
  const caseRef=ref(input.caseRef,'CASE_REF_REQUIRED',errors);
  const invoiceRef=ref(input.invoiceRef,'INVOICE_REF_REQUIRED',errors);
  const currency = typeof input.currency==='string' && MONEY.test(input.currency) ? input.currency : null;
  if(!currency) errors.push('ISO_CURRENCY_REQUIRED');

  const itemRefs = rows(input.returnedItemRefs,'RETURNED_ITEMS',errors,true);
  const uniqueItems = new Set();
  itemRefs.forEach(item => {
    const k=ref(item,'INVALID_RETURNED_ITEM_REF',errors);
    if(k && uniqueItems.has(k)) errors.push('DUPLICATE_RETURNED_ITEM_REF');
    if(k) uniqueItems.add(k);
  });

  // Coverage references only assert that the requester CLAIMS to have looked
  // at both ledgers. Never treat these refs as authenticated completeness.
  const coverage=rows(input.coverage,'COVERAGE',errors,true);
  const covered = new Set();
  for(const row of coverage) {
    if(!isObj(row)){errors.push('INVALID_COVERAGE_ROW');continue;}
    const item=ref(row.itemRef,'COVERAGE_ITEM_REF_REQUIRED',errors);
    ref(row.paymentSnapshotRef,'PAYMENT_SNAPSHOT_REF_REQUIRED',errors);
    ref(row.compensationSnapshotRef,'COMPENSATION_SNAPSHOT_REF_REQUIRED',errors);
    if(item){
      if(covered.has(item))errors.push('DUPLICATE_ITEM_LEDGER_COVERAGE');
      if(!uniqueItems.has(item))errors.push('COVERAGE_FOR_NON_RETURNED_ITEM');
      covered.add(item);
    }
  }
  for(const item of uniqueItems) {
    if(!covered.has(item)) errors.push('MISSING_ITEM_LEDGER_COVERAGE');
  }

  const transactions=rows(input.transactions,'PARENT_TRANSACTIONS',errors);
  const parentById = new Map();
  for(const row of transactions) {
    if(!isObj(row)){errors.push('INVALID_PARENT_TRANSACTION_ROW');continue;}
    const transactionRef=ref(row.transactionRef,'INVALID_PARENT_TRANSACTION_REF',errors);
    const kind=row.kind;
    if(!TYPES.includes(kind))errors.push('UNSUPPORTED_PARENT_TRANSACTION_KIND');
    const amount=cents(row.amountCents,'INVALID_PARENT_TRANSACTION_CENTS',errors);
    if(row.currency!==currency)errors.push('PARENT_CURRENCY_MISMATCH');
    if(row.invoiceRef!==invoiceRef)errors.push('PARENT_INVOICE_MISMATCH');
    if(transactionRef){
      if(parentById.has(transactionRef)) errors.push('DUPLICATE_PARENT_TRANSACTION_REF');
      else parentById.set(transactionRef,{kind,amount,allocatedCents:0,allocationRows:0});
    }
  }

  const allocations=rows(input.allocations,'ITEM_ALLOCATIONS',errors,true);
  const allocationIds=new Set();
  const totals=new Map();
  for(const item of uniqueItems) totals.set(item,{paid:0,cash:0,credit:0,paymentRows:0});
  for(const row of allocations){
    if(!isObj(row)){errors.push('INVALID_ALLOCATION_ROW');continue;}
    const allocationRef=ref(row.allocationRef,'INVALID_ALLOCATION_REF',errors);
    const transactionRef=ref(row.transactionRef,'INVALID_ALLOCATION_TRANSACTION_REF',errors);
    const itemRef=ref(row.itemRef,'INVALID_ALLOCATION_ITEM_REF',errors);
    const value=cents(row.amountCents,'INVALID_ALLOCATION_CENTS',errors);
    if(allocationRef) {
      if(allocationIds.has(allocationRef)) errors.push('DUPLICATE_ALLOCATION_REF');
      allocationIds.add(allocationRef);
    }
    if(row.invoiceRef!==invoiceRef)errors.push('ALLOCATION_INVOICE_MISMATCH');
    if(row.currency!==currency)errors.push('ALLOCATION_CURRENCY_MISMATCH');
    if(itemRef && !uniqueItems.has(itemRef))errors.push('ALLOCATION_FOR_NON_RETURNED_ITEM');
    const parent=parentById.get(transactionRef);
    if(!parent){errors.push('ALLOCATION_PARENT_TRANSACTION_MISSING');continue;}
    if(value===null || !itemRef || !totals.has(itemRef))continue;
    const entry=totals.get(itemRef);
    parent.allocationRows++;
    const previousAllocated=parent.allocatedCents;
    parent.allocatedCents=sum(previousAllocated,value,'UNSAFE_PARENT_ALLOCATION_SUM',errors);
    let key;
    if(parent.kind==='PAYMENT_CAPTURED'){key='paid';entry.paymentRows++;}
    else if(parent.kind==='CASH_REFUND')key='cash';
    else if(parent.kind==='CUSTOMER_CREDIT_ISSUED')key='credit';
    if(key){
      entry[key]=sum(entry[key],value,'UNSAFE_RETURNED_ITEM_'+key.toUpperCase()+'_SUM',errors);
    }
  }
  for(const [transactionRef,parent] of parentById) {
    if(parent.allocatedCents===null || parent.amount===null)continue;
    if(parent.allocatedCents>parent.amount)errors.push('ITEM_ALLOCATIONS_EXCEED_PARENT_TRANSACTION_AMOUNT');
    if(parent.allocationRows===0)errors.push('UNREFERENCED_PARENT_TRANSACTION');
  }

  let paid=0,cash=0,credit=0;
  for(const [item,summary] of totals) {
    if(summary.paymentRows===0)errors.push('MISSING_PAYMENT_ALLOCATION_FOR_RETURNED_ITEM');
    const past=sum(summary.cash,summary.credit,'UNSAFE_ITEM_PRIOR_COMPENSATION_SUM',errors);
    if(past!==null && summary.paid!==null && past>summary.paid)errors.push('ITEM_PRIOR_COMPENSATION_EXCEEDS_ITEM_PAID');
    paid=sum(paid,summary.paid,'UNSAFE_TOTAL_PAYMENT_SUM',errors);
    cash=sum(cash,summary.cash,'UNSAFE_TOTAL_CASH_SUM',errors);
    credit=sum(credit,summary.credit,'UNSAFE_TOTAL_CREDIT_SUM',errors);
  }

  // Even fully reconciled caller records remain untrusted. Do not accept
  // 'verified', 'approved', managerRole, signedBy, replayed proof, or GO flags.
  const proposedCash=cents(input.proposedCashRefundCents,'PROPOSED_CASH_REQUIRED_IN_CENTS',errors);
  const proposedCredit=cents(input.proposedCustomerCreditCents,'PROPOSED_CREDIT_REQUIRED_IN_CENTS',errors);
  const structurallyConsistent=errors.length===0;
  const review=structurallyConsistent ? evaluateReturnReview({
    caseRef,invoiceRef,returnedItemRefs:[...uniqueItems],
    personalization:input.personalization,reportedReason:input.reportedReason,
    actualPaidForReturnedItemsCents:paid,
    previousCashRefundCents:cash,
    previousCustomerCreditCents:credit,
    proposedCashRefundCents:proposedCash,
    proposedCustomerCreditCents:proposedCredit
  }) : null;

  return Object.freeze({
    stage:'ACC204_SYNTHETIC_LEDGER_LINEAGE_REVIEW',
    status:'REVIEW_ONLY_NO_GO',
    financeRelease:'NO_GO',
    sourceTrust:'UNAUTHENTICATED_CALLER_SUPPLIED_RECORDS',
    structurallyConsistent,
    realTransactionVerified:false,
    realCoverageVerified:false,
    managerApprovalAuthenticated:false,
    payoutAuthorized:false,
    customerCreditAuthorized:false,
    stockOrWasteWriteAuthorized:false,
    productionOverheadMethod:'NOT_SELECTED_BY_MANAGEMENT',
    caseRef,invoiceRef,currency,
    returnedItemRefs:Object.freeze([...uniqueItems]),
    hypotheticalPaidCents:structurallyConsistent?paid:null,
    hypotheticalPreviousCashRefundCents:structurallyConsistent?cash:null,
    hypotheticalPreviousCustomerCreditIssuedCents:structurallyConsistent?credit:null,
    policyPreview:review,
    issues:Object.freeze([...new Set(errors)]),
    neededIndependentEvidence:Object.freeze([
      'AUTHENTIC_INVOICE_AND_RETURNED_LINE_IDENTIFIERS',
      'SERVER_READ_ONLY_PAYMENT_ALLOCATION_SOURCE_AND_RECONCILED_PARENT_TRANSACTIONS',
      'COMPLETE_SERVER_READ_ONLY_PRIOR_REFUND_AND_ISSUED_CREDIT_LEDGER',
      'DISCOUNT_PARTIAL_PAYMENT_AND_CROSS_RETURN_ALLOCATION_ACCOUNTING_DECISION',
      'VERIFIABLE_CASE_SPECIFIC_MANAGER_IDENTITY_METHOD_SPLIT_AND_EXCESS_APPROVAL',
      'DEFECT_AND_LEGAL_REVIEW_AND_PHYSICAL_INSPECTION_BEFORE_INVENTORY',
      'SERVER_SIDE_IDEMPOTENCY_TRANSACTION_AUDIT_AND_FINANCE_GO',
      'ACTUAL_PRODUCTION_COSTING_AND_SEPARATE_RECOVERY_APPROVAL_WHEN_APPLICABLE'
    ])
  });
}
module.exports=Object.freeze({inspectReturnLedgerLineage});
