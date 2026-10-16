'use strict';
/** Owner-approved waste request review; offline, deterministic, NO posting authority. */
const valid=s=>typeof s==='string'&&s.trim().length>0&&s.length<=180;
function reviewWasteRequest(request,decision){
 const deny=(code)=>({code,state:'BLOCKED',stockPosted:false,ledgerPosted:false,financeRelease:'NO_GO'});
 if(!request||!valid(request.requestRef)||!valid(request.department)||!valid(request.materialRef)||!valid(request.employeeRef)||!valid(request.reason)||!Number.isSafeInteger(request.quantity)||request.quantity<=0)return deny('INVALID_WASTE_REQUEST');
 if(!decision)return {code:'AWAITING_OWNER_APPROVAL',state:'PENDING',stockPosted:false,ledgerPosted:false,financeRelease:'NO_GO'};
 if(!valid(decision.actorRef)||!valid(decision.ownerRef)||decision.actorRef!==decision.ownerRef||decision.actorRef===request.employeeRef)return deny('OWNER_APPROVAL_REQUIRED');
 if(decision.requestRef!==request.requestRef||!['APPROVE','REJECT'].includes(decision.action)||!valid(decision.evidenceRef))return deny('INVALID_DECISION_EVIDENCE');
 return {code:decision.action==='APPROVE'?'OWNER_APPROVED_SOURCE_ONLY':'OWNER_REJECTED_SOURCE_ONLY',state:'REVIEWED',stockPosted:false,ledgerPosted:false,financeRelease:'NO_GO'};
}
module.exports={reviewWasteRequest};
