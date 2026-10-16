'use strict';
/** Offline fake stock variance preview. No warehouse/financial write. */
const ok=s=>typeof s==='string'&&s.trim().length>0&&s.length<=180;
const qty=n=>Number.isSafeInteger(n)&&n>=0;
function previewInventoryVariance(p){
 const stop=code=>({code,state:'STOP',financeRelease:'NO_GO',allowsStockWrite:false,allowsLedgerWrite:false});
 if(!p||!ok(p.materialRef)||!ok(p.department)||!ok(p.coverageRef)||!qty(p.openingQty)||!qty(p.receivedQty)||!qty(p.jobConsumptionQty)||!qty(p.approvedWasteQty)||!qty(p.pendingWasteQty)||!qty(p.physicalCountQty))return stop('INVALID_INPUT');
 if(!Array.isArray(p.approvedWasteEvidence)||p.approvedWasteEvidence.length>1000)return stop('MISSING_WASTE_APPROVAL_EVIDENCE');
 let sum=0,seen=new Set();
 for(const w of p.approvedWasteEvidence){
  if(!w||!ok(w.requestRef)||seen.has(w.requestRef)||w.department!==p.department||w.materialRef!==p.materialRef||!qty(w.quantity)||w.quantity===0||!ok(w.employeeRef)||!ok(w.ownerRef)||w.ownerRef===w.employeeRef||!ok(w.approvalRef))return stop('INVALID_OWNER_WASTE_APPROVAL');
  seen.add(w.requestRef);sum+=w.quantity;if(!Number.isSafeInteger(sum))return stop('AMOUNT_OVERFLOW');
 }
 if(sum!==p.approvedWasteQty)return stop('APPROVED_WASTE_MISMATCH');
 const expected=p.openingQty+p.receivedQty-p.jobConsumptionQty-p.approvedWasteQty;
 if(!Number.isSafeInteger(expected)||expected<0)return stop('IMPOSSIBLE_STOCK_FLOW');
 const variance=p.physicalCountQty-expected;
 if(!Number.isSafeInteger(variance))return stop('AMOUNT_OVERFLOW');
 return {code:variance===0?'STRUCTURALLY_BALANCED':'DISCREPANCY_REQUIRES_INVESTIGATION',state:'REVIEW_REQUIRED',expectedQty:expected,physicalCountQty:p.physicalCountQty,varianceQty:variance,pendingWasteQty:p.pendingWasteQty,financeRelease:'NO_GO',allowsStockWrite:false,allowsLedgerWrite:false,authoritativeEvidenceVerified:false};
}
module.exports={previewInventoryVariance};
