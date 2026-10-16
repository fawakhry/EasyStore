'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {reviewWasteRequest:r}=require('../scripts/easystore_waste_owner_approval_review_no_go.cjs');
const req={requestRef:'FAKE_W1',department:'laser',materialRef:'FAKE_MDF',employeeRef:'FAKE_EMP',reason:'fake damaged panel',quantity:2};
const ctx={authenticated:true,role:'OWNER',principalRef:'FAKE_OWNER'};
const dec={actorRef:'FAKE_OWNER',ownerRef:'FAKE_OWNER',requestRef:'FAKE_W1',action:'APPROVE',evidenceRef:'FAKE_APPROVAL'};
test('pending waste never posts stock',()=>{let x=r(req);assert.equal(x.state,'PENDING');assert.equal(x.stockPosted,false)});
test('employee self approval denied',()=>assert.equal(r(req,{...dec,actorRef:'FAKE_EMP',ownerRef:'FAKE_EMP'},ctx).code,'OWNER_APPROVAL_REQUIRED'));
test('non-owner approval denied',()=>assert.equal(r(req,{...dec,actorRef:'FAKE_MANAGER'},ctx).code,'OWNER_APPROVAL_REQUIRED'));
test('invalid quantity denied',()=>assert.equal(r({...req,quantity:-1},dec,ctx).code,'INVALID_WASTE_REQUEST'));
test('mismatched request evidence denied',()=>assert.equal(r(req,{...dec,requestRef:'FAKE_OTHER'},ctx).code,'INVALID_DECISION_EVIDENCE'));
test('approved source review still cannot post',()=>{let x=r(req,dec,ctx);assert.equal(x.code,'OWNER_APPROVED_SOURCE_ONLY');assert.equal(x.stockPosted,false);assert.equal(x.financeRelease,'NO_GO')});
test('rejection stays non-posting',()=>assert.equal(r(req,{...dec,action:'REJECT'},ctx).ledgerPosted,false));

test('self-attested owner without trusted context denied',()=>assert.equal(r(req,dec).code,'OWNER_APPROVAL_REQUIRED'));
test('non-owner trusted role denied',()=>assert.equal(r(req,dec,{...ctx,role:'EMPLOYEE'}).code,'OWNER_APPROVAL_REQUIRED'));
test('unauthenticated principal denied',()=>assert.equal(r(req,dec,{...ctx,authenticated:false}).code,'OWNER_APPROVAL_REQUIRED'));
test('principal mismatch denied',()=>assert.equal(r(req,dec,{...ctx,principalRef:'OTHER'}).code,'OWNER_APPROVAL_REQUIRED'));
