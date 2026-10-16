'use strict';
/** Synthetic customer statement preview only. Negative = customer owes the shop. No posting. */
const allowed=new Set(['invoice','payment_received']);
const valid=s=>typeof s==='string'&&s.trim().length>0&&s.length<=180;
function customerStatementPreview(packet){
 const stop=code=>({code,state:'STOP',financeRelease:'NO_GO',allowsPosting:false});
 if(!packet||!valid(packet.customerRef)||packet.currency!=='EGP'||!Number.isSafeInteger(packet.openingDebtCents)||packet.openingDebtCents<0||!Array.isArray(packet.events)||packet.events.length>1000)return stop('INVALID_SCOPE');
 let debt=packet.openingDebtCents,prior='',seen=new Set();const rows=[];
 for(const e of packet.events){
  if(!e||!valid(e.eventRef)||seen.has(e.eventRef)||e.customerRef!==packet.customerRef||!allowed.has(e.type)||!Number.isSafeInteger(e.amountCents)||e.amountCents<=0||!valid(e.actorRef)||!valid(e.documentRef)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(e.occurredAt)||!Number.isFinite(Date.parse(e.occurredAt))||new Date(e.occurredAt).toISOString().replace('.000Z','Z')!==e.occurredAt)return stop('INVALID_EVENT');
  if(prior&&e.occurredAt<prior)return stop('OUT_OF_ORDER');prior=e.occurredAt;seen.add(e.eventRef);
  debt+=e.type==='invoice'?e.amountCents:-e.amountCents;
  if(!Number.isSafeInteger(debt))return stop('AMOUNT_OVERFLOW');
  if(debt<0)return stop('UNALLOCATED_OVERPAYMENT_POLICY_REQUIRED');
  rows.push({eventRef:e.eventRef,type:e.type,documentRef:e.documentRef,actorRef:e.actorRef,occurredAt:e.occurredAt,amountCents:e.amountCents,runningCustomerBalanceCents:-debt});
 }
 return {code:'SYNTHETIC_STATEMENT_PREVIEW',state:'REVIEW_REQUIRED',customerRef:packet.customerRef,currency:'EGP',openingCustomerBalanceCents:-packet.openingDebtCents,closingCustomerBalanceCents:-debt,rows,financeRelease:'NO_GO',allowsPosting:false};
}
module.exports={customerStatementPreview};
