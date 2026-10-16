'use strict';
/** Readiness assessment only; no approval, release, or deployment authority. */
const required=['serverAuthVerified','customerLedgerIntegrated','inventoryEvidenceIntegrated','openingBalancesOwnerApproved','endToEndFinanceAccepted','ciVerifiedOnExactHead'];
function assessFinanceReadiness(evidence){
 const failed=[];
 for(const gate of required){
  const e=evidence&&evidence[gate];
  if(!e||e.verified!==true||typeof e.evidenceRef!=='string'||!e.evidenceRef.trim()||typeof e.verifiedBy!=='string'||!e.verifiedBy.trim())failed.push(gate);
 }
 return {code:failed.length?'RELEASE_BLOCKED':'EVIDENCE_REVIEW_REQUIRED',failedGates:failed,financeRelease:'NO_GO',allowsPosting:false,allowsDeployment:false,approvalAuthority:false};
}
module.exports={assessFinanceReadiness,required};
