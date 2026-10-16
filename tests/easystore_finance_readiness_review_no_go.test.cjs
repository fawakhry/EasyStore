'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {assessFinanceReadiness:r,required}=require('../scripts/easystore_finance_readiness_review_no_go.cjs');
const evidence=()=>Object.fromEntries(required.map(g=>[g,{verified:true,evidenceRef:'FAKE_'+g,verifiedBy:'FAKE_REVIEWER'}]));
test('missing all evidence blocked',()=>{let x=r({});assert.equal(x.failedGates.length,6);assert.equal(x.financeRelease,'NO_GO')});
test('one missing gate blocked',()=>{let x=evidence();delete x.serverAuthVerified;assert.deepEqual(r(x).failedGates,['serverAuthVerified'])});
test('unverified evidence blocked',()=>{let x=evidence();x.ciVerifiedOnExactHead.verified=false;assert.deepEqual(r(x).failedGates,['ciVerifiedOnExactHead'])});
test('missing reviewer blocked',()=>{let x=evidence();x.openingBalancesOwnerApproved.verifiedBy='';assert.deepEqual(r(x).failedGates,['openingBalancesOwnerApproved'])});
test('missing reference blocked',()=>{let x=evidence();x.inventoryEvidenceIntegrated.evidenceRef='';assert.deepEqual(r(x).failedGates,['inventoryEvidenceIntegrated'])});
test('even all supplied evidence cannot authorize release',()=>{let x=r(evidence());assert.equal(x.code,'EVIDENCE_REVIEW_REQUIRED');assert.equal(x.financeRelease,'NO_GO');assert.equal(x.allowsPosting,false);assert.equal(x.allowsDeployment,false);assert.equal(x.approvalAuthority,false)});
