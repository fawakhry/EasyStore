'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('app.js','utf8');
const config=fs.readFileSync('config.js','utf8');
const start=src.indexOf('    async saveSupplier(){');
const end=src.indexOf('    editSupplier(i)',start);
assert.ok(start>0&&end>start,'original supplier action absent');
const action=src.slice(start,end);
assert.ok(action.includes("Number(rawOpening)!==0"),'nonzero opening client guard missing');
assert.ok(action.includes("api('saveEasyStoreSupplier',{...s,requestId:state.supplierRequestId})"),
  'missing stable supplier request ID');
assert.ok(action.includes("api('getEasyStoreSuppliers',{limit:1000})"),
  'missing server D1 post-write readback');
assert.ok(action.includes('v.partyId||v.id'),'post-write server proof must have exact party ID');
const write=action.indexOf("api('saveEasyStoreSupplier'");
const read=action.indexOf("api('getEasyStoreSuppliers'");
const cache=action.indexOf('saveLocal()');
const success=action.indexOf("flash('تم حفظ المورد");
assert.ok(write>=0&&read>write&&cache>read&&success>cache,
  'must verify authoritative D1 read before cache and final success');
assert.doesNotMatch(action,/state\.data\.suppliers\.(unshift|push)/,
  'optimistic local supplier insertion forbidden');
assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
console.log('ACC277_SUPPLIER_PERSISTENCE_READBACK_REQUIRED=PASS');
console.log('ACC277_HISTORIC_NONZERO_OPENING_CLIENT_BLOCKED=PASS');
console.log('ACC277_NO_LOCAL_CACHE_FALSE_SUCCESS=PASS');
console.log('ACC277_FINANCE_RELEASE=NO_GO');
