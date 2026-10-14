'use strict';
/**
 * Offline receivables reconciliation gate for fabricated, CALLER-SUPPLIED rows.
 * Not a Worker/D1 source of truth, permission check, posting or financial release.
 * Invoice-time credit and customer closing outstanding are DISTINCT measures.
 * All outputs remain NO_GO even for internally consistent unverified evidence.
 */
const OPS=Object.freeze({
  invoice:1,
  opening_debt:1,
  adjustment_increase:1,
  payment_received:-1,
  adjustment_decrease:-1
});
const MAX_ROWS=1000;
function nonempty(value){return typeof value==='string'&&value.trim()!==''&&value.length<=180;}
function cents(value){return Number.isSafeInteger(value)&&value>=0;}
// Date.parse can normalize impossible calendar dates (e.g. February 30).
// Reject these dates rather than silently changing accounting chronology.
function validUtcCalendarTimestamp(value){
  const ms=Date.parse(value);
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,19)===value.slice(0,19);
}
function base(code,details={}){
  return {
    state:code==='STRUCTURALLY_COHERENT'?'REVIEW_REQUIRED':'STOP',
    code, financeRelease:'NO_GO', authoritativeLedgerVerified:false,
    managerApprovalVerified:false, allowsCashMovement:false,
    allowsCustomerCredit:false, allowsStockMovement:false,
    allowsProductionClose:false, ...details
  };
}
function reconcileCustomerReceivables(packet){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))return base('INVALID_PACKET');
  const {customerRef,currency,openingBalanceCents,reportedInvoiceCreditCents,
    reportedCustomerBalanceCents,coverageRef,invoiceSnapshots,ledgerEvents}=packet;
  if(!nonempty(customerRef)||!nonempty(coverageRef)||currency!=='EGP')return base('MISSING_SCOPE_OR_UNVERIFIED_COVERAGE');
  if(!cents(openingBalanceCents)||!cents(reportedInvoiceCreditCents)||!cents(reportedCustomerBalanceCents))
    return base('INVALID_MONEY_FIELDS');
  if(!Array.isArray(invoiceSnapshots)||!invoiceSnapshots.length||invoiceSnapshots.length>MAX_ROWS||
      !Array.isArray(ledgerEvents)||!ledgerEvents.length||ledgerEvents.length>MAX_ROWS)
    return base('INVALID_ROW_COUNTS');

  const seenInvoices=new Map(),seenEvents=new Set(),invoiced=new Map(),initialPayments=new Map();
  const allocatedPayments=new Map(),laterCollections=new Set(),seenAdjustmentProofs=new Set();
  let creditSnapshot=0;
  for(const row of invoiceSnapshots){
    if(!row||!nonempty(row.invoiceRef)||row.customerRef!==customerRef||
       row.currency!==currency||!cents(row.totalCents)||!cents(row.paidAtInvoiceCents)||
       row.paidAtInvoiceCents>row.totalCents||seenInvoices.has(row.invoiceRef))
      return base('INVALID_OR_DUPLICATE_INVOICE_SNAPSHOT');
    const amount=row.totalCents-row.paidAtInvoiceCents;
    creditSnapshot+=amount;
    if(!Number.isSafeInteger(creditSnapshot))return base('AMOUNT_OVERFLOW');
    seenInvoices.set(row.invoiceRef,row);
    initialPayments.set(row.invoiceRef,0);
    allocatedPayments.set(row.invoiceRef,0);
  }
  let closing=openingBalanceCents,invoiceDebits=0,collections=0,adjustments=0;
  let previousTime='';
  for(const event of ledgerEvents){
    if(!event||!nonempty(event.eventRef)||seenEvents.has(event.eventRef)||
       event.customerRef!==customerRef||event.currency!==currency||
       !Object.hasOwn(OPS,event.operation)||!cents(event.amountCents)||
       !nonempty(event.occurredAt)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(event.occurredAt)||
       !validUtcCalendarTimestamp(event.occurredAt))
      return base('INVALID_OR_DUPLICATE_LEDGER_EVENT');
    // Caller order must be chronological; do not silently infer posting order.
    if(previousTime&&Date.parse(event.occurredAt)<Date.parse(previousTime))return base('OUT_OF_ORDER_EVENTS');
    previousTime=event.occurredAt;
    seenEvents.add(event.eventRef);
    // A nonzero opening snapshot plus opening_debt can count the same pre-period
    // liability twice. Distinct lineage requires an explicit owner policy.
    if(event.operation==='opening_debt'&&openingBalanceCents!==0)
      return base('OPENING_BALANCE_EVENT_DOUBLE_COUNT_RISK');
    const change=OPS[event.operation]*event.amountCents;
    closing+=change;
    if(!Number.isSafeInteger(closing))return base('AMOUNT_OVERFLOW');
    if(closing<0)return base('OVER_COLLECTION_OR_MISSING_DEBIT');
    if(event.operation==='invoice'){
      if(!nonempty(event.invoiceRef)||!seenInvoices.has(event.invoiceRef)||invoiced.has(event.invoiceRef)||
         seenInvoices.get(event.invoiceRef).totalCents!==event.amountCents)
        return base('MISSING_OR_MISMATCHED_INVOICE_DEBIT');
      invoiced.set(event.invoiceRef,event.amountCents);
      invoiceDebits+=event.amountCents;
    }else if(event.operation==='payment_received'){
      // Current legacy customer collection can omit refNo: reject that evidence
      // for invoice-level allocation until owner has chosen an allocation rule.
      if(!nonempty(event.invoiceRef)||!seenInvoices.has(event.invoiceRef)||
          !['invoice_initial','later_collection'].includes(event.paymentOrigin))
        return base('COLLECTION_ALLOCATION_UNPROVEN');
      if(!invoiced.has(event.invoiceRef))return base('PAYMENT_BEFORE_INVOICE');
      if(event.paymentOrigin==='later_collection'&&event.amountCents===0)
        return base('ZERO_AMOUNT_LATER_COLLECTION_NOT_EVIDENCE');
      const invoice=seenInvoices.get(event.invoiceRef);
      const allocated=allocatedPayments.get(event.invoiceRef)+event.amountCents;
      if(!Number.isSafeInteger(allocated))return base('AMOUNT_OVERFLOW');
      if(allocated>invoice.totalCents)return base('INVOICE_ALLOCATION_OVERPAYMENT');
      if(event.paymentOrigin==='invoice_initial'){
        if(laterCollections.has(event.invoiceRef))return base('INITIAL_PAYMENT_AFTER_LATER_COLLECTION');
        const total=initialPayments.get(event.invoiceRef)+event.amountCents;
        if(!Number.isSafeInteger(total))return base('AMOUNT_OVERFLOW');
        if(total>invoice.paidAtInvoiceCents)return base('INITIAL_INVOICE_PAYMENT_MISMATCH');
        initialPayments.set(event.invoiceRef,total);
      }else{
        laterCollections.add(event.invoiceRef);
      }
      allocatedPayments.set(event.invoiceRef,allocated);
      collections+=event.amountCents;
    }else if(event.operation==='opening_debt'||event.operation==='adjustment_increase'||
             event.operation==='adjustment_decrease'){
      // These are not allocated by invoice: separately evidenced adjustment
      // identities required before receipt-level proof can be asserted.
      if(!nonempty(event.adjustmentProofRef))return base('ADJUSTMENT_PROOF_MISSING');
      // Distinct event IDs do not establish distinct supporting documents.
      // A multi-line document requires a separate owner-approved lineage rule.
      if(event.adjustmentProofRef!==event.adjustmentProofRef.trim()||
         event.adjustmentProofRef!==event.adjustmentProofRef.normalize('NFC'))
        return base('ADJUSTMENT_PROOF_NONCANONICAL');
      if(seenAdjustmentProofs.has(event.adjustmentProofRef))return base('DUPLICATE_ADJUSTMENT_PROOF');
      seenAdjustmentProofs.add(event.adjustmentProofRef);
      adjustments+=change;
    }
    if(!Number.isSafeInteger(invoiceDebits)||!Number.isSafeInteger(collections)||
       !Number.isSafeInteger(adjustments))return base('AMOUNT_OVERFLOW');
  }
  if(invoiced.size!==seenInvoices.size)return base('INVOICE_LEDGER_COVERAGE_MISSING');
  for(const [invoiceRef,row] of seenInvoices){
    if(initialPayments.get(invoiceRef)!==row.paidAtInvoiceCents)
      return base('INITIAL_INVOICE_PAYMENT_MISMATCH');
  }
  if(creditSnapshot!==reportedInvoiceCreditCents)return base('INVOICE_CREDIT_SNAPSHOT_MISMATCH',{
    expectedInvoiceCreditCents:creditSnapshot, reportedInvoiceCreditCents
  });
  if(closing!==reportedCustomerBalanceCents)return base('CUSTOMER_BALANCE_RECONCILIATION_MISMATCH',{
    computedClosingBalanceCents:closing, reportedCustomerBalanceCents
  });
  return base('STRUCTURALLY_COHERENT',{
    customerRef,currency,openingBalanceCents,
    invoiceDebitsCents:invoiceDebits, collectionsCents:collections, adjustmentsNetCents:adjustments,
    invoiceTimeCreditCents:creditSnapshot, currentCustomerOutstandingCents:closing,
    invoiceCreditMinusOutstandingCents:creditSnapshot-closing,
    invoiceCount:seenInvoices.size,eventCount:seenEvents.size,
    findings:[
      ...(creditSnapshot!==closing?['INVOICE_TIME_CREDIT_IS_NOT_CURRENT_RECEIVABLE']:[]),
      'CALLER_LEDGER_COMPLETENESS_NOT_INDEPENDENTLY_VERIFIED',
      'NATIVE_D1_BACKEND_AND_REAL_COSTING_NOT_TESTED'
    ],
    nextRequiredProof:'AUTHENTIC_D1_LEDGER_SNAPSHOT_AND_ACCOUNTING_ALLOCATION_METHOD'
  });
}
module.exports={reconcileCustomerReceivables};
