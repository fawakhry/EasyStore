'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {previewInvoiceIntake}=require('../scripts/easystore_finance_intake_preview_no_go.cjs');
function fixture(){
  return {
    envelope:{contract_version:'ACCOUNTING_CONNECTOR_CONTRACT_V1',source_system:'TrendOS',
      event_type:'order_line_approved',event_id:'EVENT-1',correlation_id:'CORR-1',
      idempotency_key:'IDEMP-1',source_entity_type:'order_line',source_entity_id:'L-LASER',
      occurred_at:'2026-10-23T12:00:00Z',evidence_refs:['FAKE-LINE-EVIDENCE-1'],
      payload:{order_id:'ORDER-1',customer_id:'CUSTOMER-1',line_id:'L-LASER',order_revision:4}},
    sourceOrder:{order_id:'ORDER-1',customer_id:'CUSTOMER-1',revision:4,expected_line_count:2,lines:[
      {line_id:'L-PRINT',order_id:'ORDER-1',customer_id:'CUSTOMER-1',department:'طباعة',
       approval_status:'APPROVED',total_cents:15000},
      {line_id:'L-LASER',order_id:'ORDER-1',customer_id:'CUSTOMER-1',department:'ليزر',
       approval_status:'APPROVED',total_cents:5000}
    ]},
    officialCustomer:{customer_id:'CUSTOMER-1',status:'ACTIVE'},
    financeSnapshot:{order_id:'ORDER-1',customer_id:'CUSTOMER-1',order_revision:4,existing_invoice_ids:[]}
  };
}
function verifyLocked(r){
  assert.equal(r.financeRelease,'NO_GO');assert.equal(r.postingAllowed,false);
  assert.equal(r.financialAuthority,'EASYSTORE_ONLY');
  assert.equal(r.actualCloudVerified,false);
  assert.equal(r.liveAuthorityVerified,false);
  assert.equal(r.realOrderCustomerBindingVerified,false);
}
test('both approved print/laser lines: arithmetic coherent but no financial authority',()=>{
  const r=previewInvoiceIntake(fixture());verifyLocked(r);
  assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.invoiceCandidateTotalCents,20000);
  assert.equal(r.lineCount,2);assert.equal(r.code,'STRUCTURALLY_COHERENT_BUT_UNVERIFIED');
});
for(const [name,modify,code] of [
  ['cross-order line',p=>p.sourceOrder.lines[1].order_id='OTHER','CROSS_ORDER_CUSTOMER_OR_DUPLICATE_LINE'],
  ['cross-customer line',p=>p.sourceOrder.lines[1].customer_id='CUSTOMER-2','CROSS_ORDER_CUSTOMER_OR_DUPLICATE_LINE'],
  ['financial/customer directory conflict',p=>p.officialCustomer.customer_id='OTHER','ORDER_CUSTOMER_IDENTITY_CONFLICT'],
  ['finance snapshot wrong customer',p=>p.financeSnapshot.customer_id='OTHER','ORDER_CUSTOMER_IDENTITY_CONFLICT'],
  ['replayed existing invoice',p=>p.financeSnapshot.existing_invoice_ids=['INV-ALREADY'],'POSSIBLE_DUPLICATE_FINAL_INVOICE'],
  ['stale version',p=>p.financeSnapshot.order_revision=3,'STALE_OR_UNVERIFIED_ORDER_REVISION'],
  ['unapproved laser',p=>p.sourceOrder.lines[1].approval_status='PENDING','UNAPPROVED_ORDER_LINE'],
  ['partial invoice subset',p=>p.sourceOrder.lines.pop(),'MISSING_OR_PARTIAL_ORDER_LINES'],
  ['duplicate line identity',p=>p.sourceOrder.lines[1].line_id='L-PRINT','CROSS_ORDER_CUSTOMER_OR_DUPLICATE_LINE'],
  ['negative financial amount',p=>p.sourceOrder.lines[1].total_cents=-100,'INVALID_LINE_AMOUNT'],
  ['unsafe Unicode identifier',p=>p.sourceOrder.order_id='ORDER-\u202e1','ORDER_CUSTOMER_IDENTITY_CONFLICT'],
  ['spoofed source system',p=>p.envelope.source_system='EasyStore','INVALID_SOURCE_ENVELOPE'],
  ['wrong unsupported plural event',p=>p.envelope.event_type='order_lines_approved','INVALID_SOURCE_ENVELOPE'],
  ['untrusted source entity type',p=>p.envelope.source_entity_type='order','INVALID_SOURCE_ENVELOPE'],
  ['missing required evidence references',p=>delete p.envelope.evidence_refs,'INVALID_SOURCE_ENVELOPE'],
  ['empty event evidence references',p=>p.envelope.evidence_refs=[],'INVALID_SOURCE_ENVELOPE'],
  ['invalid event occurrence date',p=>p.envelope.occurred_at='2026-02-30T12:00:00Z','INVALID_SOURCE_ENVELOPE'],
  ['missing payload',p=>delete p.envelope.payload,'INVALID_SOURCE_ENVELOPE'],
  ['payload customer mismatched',p=>p.envelope.payload.customer_id='OTHER','ORDER_CUSTOMER_IDENTITY_CONFLICT'],
  ['payload order mismatched',p=>p.envelope.payload.order_id='OTHER','ORDER_CUSTOMER_IDENTITY_CONFLICT'],
  ['stale event approval revision',p=>p.envelope.payload.order_revision=3,'STALE_OR_UNVERIFIED_ORDER_REVISION'],
  ['event line does not exist in order',p=>p.envelope.source_entity_id='L-MISSING','SOURCE_APPROVAL_LINE_NOT_IN_ORDER'],
  ['event payload line differs from approved source',p=>p.envelope.payload.line_id='L-MISSING','SOURCE_APPROVAL_LINE_NOT_IN_ORDER'],
  ['embedded session credential',p=>p.envelope.session_token='FAKE','INVALID_OR_SECRET_BEARING_PACKET'],
  ['inactive official customer',p=>p.officialCustomer.status='DISABLED','CUSTOMER_NOT_ACTIVE'],
  ['unbounded amount addition',p=>{p.sourceOrder.lines[0].total_cents=Number.MAX_SAFE_INTEGER;p.sourceOrder.lines[1].total_cents=1},'AMOUNT_OVERFLOW']
]){
  test(name,()=>{const p=fixture();modify(p);const r=previewInvoiceIntake(p);verifyLocked(r);
    assert.equal(r.status,'STOP');assert.equal(r.code,code)});
}
test('no caller-provided approval bypass: arbitrarily green flags stay NO_GO',()=>{
 const p=fixture();p.ownerApproved=true;p.liveVerified=true;p.financeSnapshot.approved=true;
 const r=previewInvoiceIntake(p);verifyLocked(r);assert.equal(r.status,'REVIEW_REQUIRED');
});
test('null or incomplete packet denies without exception',()=>{
 for(const p of [null,[],{}, {envelope:{}}]){const r=previewInvoiceIntake(p);verifyLocked(r);assert.equal(r.status,'STOP')}
});
