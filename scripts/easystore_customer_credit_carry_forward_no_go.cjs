'use strict';

/**
 * EasyStore positive customer credit / customer advance deterministic REVIEW planner.
 *
 * This module does NOT execute a financial command, verify evidence or sessions,
 * issue a refund, allocate old invoice debt, or change a database. It is an
 * executable source-only specification for owner decision 2026-10-16.
 * All values are non-negative integer EGP piastres (NOT floating point EGP).
 *
 * Accounting convention:
 *  - debtCents: amount customer owes us (non-negative)
 *  - creditCents: money we owe customer (non-negative LIABILITY, never sales)
 *  - displayBalanceCents = creditCents - debtCents
 *    positive means FOR the customer; negative means customer debt.
 *
 * Debt and credit simultaneously positive is a data-integrity exception: do not
 * net silently; recover from authoritative customer ledger evidence first.
 */
const VERSION='EASYSTORE_CUSTOMER_POSITIVE_CREDIT_PREVIEW_V1';
const deny=(code)=>Object.freeze({
  success:false,code,version:VERSION,
  postingAllowed:false,financeRelease:'NO_GO'
});
const isCents=n=>Number.isSafeInteger(n)&&n>=0;
const safeAdd=(a,b)=>{
  if(!isCents(a)||!isCents(b)||a>Number.MAX_SAFE_INTEGER-b)
    return null;
  return a+b;
};
const debtOrCredit=(debt,credit)=>{
  if(!isCents(debt)||!isCents(credit))return 'INVALID_OPENING_BALANCE';
  if(debt>0&&credit>0)return 'MIXED_DEBT_AND_CREDIT_NEEDS_RECONCILIATION';
  return '';
};
const asDisplay=(debt,credit)=>credit-debt;
function previewCustomerCollectionV1(input){
  if(!input||typeof input!=='object')return deny('INVALID_INPUT');
  const {debtCents,creditCents,cashReceivedCents}=input;
  const invalid=debtOrCredit(debtCents,creditCents);
  if(invalid)return deny(invalid);
  if(!isCents(cashReceivedCents)||cashReceivedCents===0)return deny('INVALID_CASH_RECEIPT');
  const paidAgainstDebtCents=Math.min(debtCents,cashReceivedCents);
  const createdCreditCents=cashReceivedCents-paidAgainstDebtCents;
  const creditAfterCents=safeAdd(creditCents,createdCreditCents);
  if(creditAfterCents===null)return deny('UNSAFE_AMOUNT_OVERFLOW');
  const debtAfterCents=debtCents-paidAgainstDebtCents;
  return Object.freeze({
    success:true,code:'CUSTOMER_CREDIT_COLLECTION_PREVIEW',
    version:VERSION,
    before:{debtCents,creditCents,displayBalanceCents:asDisplay(debtCents,creditCents)},
    collection:{
      cashReceivedCents,
      appliedAgainstAggregateDebtCents:paidAgainstDebtCents,
      createdCustomerCreditCents:createdCreditCents,
      invoiceAllocation:'NONE_UNDECIDED',
      cashboxReceiptCents:cashReceivedCents
    },
    after:{
      debtCents:debtAfterCents,
      creditCents:creditAfterCents,
      displayBalanceCents:asDisplay(debtAfterCents,creditAfterCents)
    },
    postingAllowed:false,financeRelease:'NO_GO'
  });
}
function previewNextCustomerInvoiceV1(input){
  if(!input||typeof input!=='object')return deny('INVALID_INPUT');
  const {debtCents,creditCents,invoiceTotalCents,cashReceivedCents}=input;
  const invalid=debtOrCredit(debtCents,creditCents);
  if(invalid)return deny(invalid);
  if(!isCents(invoiceTotalCents)||invoiceTotalCents===0||
    !isCents(cashReceivedCents))return deny('INVALID_INVOICE_OR_RECEIPT');
  const appliedCustomerCreditCents=Math.min(creditCents,invoiceTotalCents);
  const invoiceAfterCreditCents=invoiceTotalCents-appliedCustomerCreditCents;
  const cashAppliedToNewInvoiceCents=Math.min(cashReceivedCents,invoiceAfterCreditCents);
  const invoiceRemainingCents=invoiceAfterCreditCents-cashAppliedToNewInvoiceCents;
  const cashRemainingAfterInvoiceCents=cashReceivedCents-cashAppliedToNewInvoiceCents;
  const cashAppliedToOldAggregateDebtCents=Math.min(debtCents,cashRemainingAfterInvoiceCents);
  const createdCustomerCreditCents=cashRemainingAfterInvoiceCents-cashAppliedToOldAggregateDebtCents;
  const debtAfterCents=safeAdd(debtCents-cashAppliedToOldAggregateDebtCents,invoiceRemainingCents);
  const creditAfterCents=safeAdd(creditCents-appliedCustomerCreditCents,createdCustomerCreditCents);
  if(debtAfterCents===null||creditAfterCents===null)return deny('UNSAFE_AMOUNT_OVERFLOW');
  if(debtAfterCents>0&&creditAfterCents>0)return deny('INTERNAL_CREDIT_DEBT_CONFLICT');
  return Object.freeze({
    success:true,code:'CUSTOMER_NEXT_INVOICE_CREDIT_PREVIEW',
    version:VERSION,
    before:{debtCents,creditCents,displayBalanceCents:asDisplay(debtCents,creditCents)},
    invoice:{
      invoiceTotalCents,
      appliedCustomerCreditCents,
      cashAppliedToNewInvoiceCents,
      invoiceRemainingCents,
      cashAppliedToOldAggregateDebtCents,
      createdCustomerCreditCents,
      cashboxReceiptCents:cashReceivedCents,
      oldInvoiceAllocation:'NONE_UNDECIDED',
      // Financial ledger must record a transfer from CUSTOMER_CREDIT liability,
      // NOT a second cash receipt. Persisted invoice-level creditAppliedCents
      // and explicit immutable liability evidence are REQUIRED for integration.
      requiresCustomerCreditLiabilityJournal:true
    },
    after:{
      debtCents:debtAfterCents,creditCents:creditAfterCents,
      displayBalanceCents:asDisplay(debtAfterCents,creditAfterCents)
    },
    postingAllowed:false,financeRelease:'NO_GO'
  });
}
module.exports={VERSION,previewCustomerCollectionV1,previewNextCustomerInvoiceV1};
