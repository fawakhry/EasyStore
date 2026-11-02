'use strict';
/**
 * ACC216/ACC217 cross-Cloud Finance Intake — deliberately offline, READONLY,
 * caller-supplied evidence preflight. Not a signature check, trusted read,
 * financial posting, production release or substitute for real order FK.
 * TrendOS supplies operational events; EasyStore exclusively owns ledgers.
 */
const VERSION='ACCOUNTING_CONNECTOR_CONTRACT_V1';
// Existing V1 connector has a SINGULAR approval event, scoped to one source line.
const EVENT='order_line_approved';
const forbiddenKeys=new Set(['password','session_token','api_key','raw_secret','access_token','authorization','secret']);
function plain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function ref(s){return typeof s==='string'&&s.length>0&&s.length<=160&&s===s.trim()&&s===s.normalize('NFC')&&!/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069]/u.test(s);}
function natural(n){return Number.isSafeInteger(n)&&n>=0;}
function utcTimestamp(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s.replace('Z','.000Z');}
function inspectSecrets(x,depth=0){
  if(depth>9)return true;
  if(!plain(x)&&!Array.isArray(x))return false;
  for(const [key,value] of Object.entries(x)){
    if(forbiddenKeys.has(key.toLowerCase()))return true;
    if(inspectSecrets(value,depth+1))return true;
  }
  return false;
}
function stop(code,extra={}){
  return {status:'STOP',code,financeRelease:'NO_GO',postingAllowed:false,
    financialAuthority:'EASYSTORE_ONLY',liveAuthorityVerified:false,
    realOrderCustomerBindingVerified:false,idempotencyLedgerVerified:false,
    actualCloudVerified:false,...extra};
}
function review(code,extra={}){
  return {...stop(code,extra),status:'REVIEW_REQUIRED'};
}
/**
 * packet = {envelope,sourceOrder,officialCustomer,financeSnapshot}
 * All four objects are untrusted caller-supplied snapshots. Even coherent
 * packets never qualify real funds or order ownership.
 */
function previewInvoiceIntake(packet){
  if(!plain(packet)||inspectSecrets(packet))return stop('INVALID_OR_SECRET_BEARING_PACKET');
  const {envelope:e,sourceOrder:o,officialCustomer:c,financeSnapshot:f}=packet;
  if(!plain(e)||!plain(o)||!plain(c)||!plain(f))return stop('MISSING_REQUIRED_SNAPSHOTS');
  if(e.contract_version!==VERSION||e.source_system!=='TrendOS'||e.event_type!==EVENT||
     e.source_entity_type!=='order_line'||!ref(e.event_id)||!ref(e.correlation_id)||
     !ref(e.idempotency_key)||!ref(e.source_entity_id)||!utcTimestamp(e.occurred_at)||
     !Array.isArray(e.evidence_refs)||e.evidence_refs.length===0||e.evidence_refs.length>50||
     e.evidence_refs.some(x=>!ref(x))||!plain(e.payload)||!ref(e.payload.line_id)||
     !ref(e.payload.order_id)||!ref(e.payload.customer_id)||!natural(e.payload.order_revision))
    return stop('INVALID_SOURCE_ENVELOPE');
  if(!ref(o.order_id)||!ref(o.customer_id)||!ref(c.customer_id)||!ref(f.customer_id)||
     !ref(f.order_id)||e.payload.order_id!==o.order_id||
     e.payload.customer_id!==o.customer_id||
     c.customer_id!==o.customer_id||f.customer_id!==o.customer_id||f.order_id!==o.order_id)
    return stop('ORDER_CUSTOMER_IDENTITY_CONFLICT');
  if(c.status!=='ACTIVE')return stop('CUSTOMER_NOT_ACTIVE');
  if(!Number.isSafeInteger(o.revision)||o.revision<1||
     !Number.isSafeInteger(f.order_revision)||f.order_revision!==o.revision||
     e.payload.order_revision!==o.revision)
    return stop('STALE_OR_UNVERIFIED_ORDER_REVISION');
  if(!natural(o.expected_line_count)||o.expected_line_count===0||
     o.expected_line_count>100||!Array.isArray(o.lines)||o.lines.length!==o.expected_line_count)
    return stop('MISSING_OR_PARTIAL_ORDER_LINES');
  if(!Array.isArray(f.existing_invoice_ids))return stop('INVOICE_COVERAGE_UNKNOWN');
  if(f.existing_invoice_ids.some(x=>!ref(x)))return stop('INVALID_EXISTING_INVOICE_ID');
  if(f.existing_invoice_ids.length)return stop('POSSIBLE_DUPLICATE_FINAL_INVOICE');
  const allowed=new Set(['طباعة','ليزر']);
  const seen=new Set();let total=0;
  for(const line of o.lines){
    if(!plain(line)||!ref(line.line_id)||seen.has(line.line_id)||!ref(line.order_id)||
       !ref(line.customer_id)||line.order_id!==o.order_id||
       line.customer_id!==o.customer_id)return stop('CROSS_ORDER_CUSTOMER_OR_DUPLICATE_LINE');
    seen.add(line.line_id);
    if(!allowed.has(line.department))return stop('UNSUPPORTED_DEPARTMENT');
    if(line.approval_status!=='APPROVED')return stop('UNAPPROVED_ORDER_LINE');
    if(!Number.isSafeInteger(line.total_cents)||line.total_cents<0)
      return stop('INVALID_LINE_AMOUNT');
    total+=line.total_cents;
    if(!Number.isSafeInteger(total))return stop('AMOUNT_OVERFLOW');
  }
  if(!seen.has(e.source_entity_id)||e.source_entity_id!==e.payload.line_id)
    return stop('SOURCE_APPROVAL_LINE_NOT_IN_ORDER');
  // ACC231: the original T12 at-create reader returns an OPERATIONAL preview,
  // not an order/customer ownership proof or an approved financial line. For
  // a claimed T12 order, compare the exact complete operational line set with
  // this synthetic finance packet; NEVER upgrade a caller-supplied preview to
  // a signed V1 event, customer consent, pricing or posting authorization.
  const claimsT12=o.source_system==='TrendOS_T12';
  if(claimsT12||Object.prototype.hasOwnProperty.call(packet,'t12OperationalCandidate')){
    const t=packet.t12OperationalCandidate;
    if(!claimsT12||!plain(t)||t.success!==true||
       t.source!=='original-t12-at-create-source-only'||
       t.operationalSourceShapeVerified!==true||
       t.sourceOnly!==true||t.readOnly!==true||
       t.officialCustomerOwnershipAttested!==false||
       t.financeAuthorized!==false||t.canRequestInvoice!==false||
       t.departmentApprovalsVerified!==false||t.connectorEventPublished!==false||
       t.posted!==false||t.orderId!==o.order_id||
       t.officialCustomerId!==o.customer_id||
       !Number.isSafeInteger(t.lineCount)||t.lineCount<1||t.lineCount>2||
       !Array.isArray(t.lines)||t.lines.length!==t.lineCount||
       t.lineCount!==o.expected_line_count)
      return stop('T12_OPERATIONAL_CANDIDATE_UNTRUSTED_OR_INCOMPLETE');
    const byId=new Map(o.lines.map(line=>[line.line_id,line]));
    const originalIds=new Set();
    for(let i=0;i<t.lines.length;i++){
      const l=t.lines[i];
      if(!plain(l)||!ref(l.lineId)||originalIds.has(l.lineId)||
         !Number.isSafeInteger(l.ordinal)||l.ordinal!==i+1||
         !['طباعة','ليزر'].includes(l.department)||
         !byId.has(l.lineId)||byId.get(l.lineId).department!==l.department)
        return stop('T12_OPERATIONAL_LINE_SET_CONFLICT');
      originalIds.add(l.lineId);
    }
    if(originalIds.size!==byId.size||
       (t.lineCount===2&&new Set(t.lines.map(l=>l.department)).size!==2))
      return stop('T12_OPERATIONAL_LINE_SET_CONFLICT');
  }
  if(total<=0)return stop('NONPOSITIVE_INVOICE_TOTAL');
  return review('STRUCTURALLY_COHERENT_BUT_UNVERIFIED',{
    order_id:o.order_id,customer_id:o.customer_id,revision:o.revision,
    lineCount:seen.size,invoiceCandidateTotalCents:total,currency:'EGP',
    nextRequiredProof:'INDEPENDENT_SOURCE_SIGNED_ORDER_CUSTOMER_FK_AND_EASYSTORE_LEDGER_SNAPSHOT',
    note:'Only a real authenticated Cloud-to-Cloud connector plus immutable official records can attest ownership; no invoice or cash command generated.'
  });
}
module.exports={previewInvoiceIntake};
