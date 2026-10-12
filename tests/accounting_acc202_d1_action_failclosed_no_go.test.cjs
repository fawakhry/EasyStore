'use strict';
// ACC202: test actual EasyStore API routing extracted verbatim from app.js.
// Entirely synthetic endpoints/users/tokens. Never calls network, Cloudflare or business storage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = app.indexOf('  const D1_ACCOUNTING_READ_ACTIONS = ');
const end = app.indexOf('  function requestFingerprint(', start);
assert.ok(start > 0 && end > start, 'ORIGINAL_EASYSTORE_API_ROUTER_NOT_FOUND');
const source = app.slice(start, end) + '\nglobalThis.__acc202Api = api;';

function fixture(override = {}) {
  const win = {
    EASYSTORE_ACCOUNTING_D1_READONLY: true,
    EASYSTORE_ACCOUNTING_D1_WRITES: false,
    EASYSTORE_ACCOUNTING_D1_WRITE_MODE: 'OFF',
    EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS: [],
    EASYSTORE_ACCOUNTING_D1_URL: 'https://fake-d1.example.invalid/accounting',
    TREND_API_URL: 'https://fake-legacy.example.invalid/script',
    MATBAGY_SECURE_API_PROXY_URL: '',
    ...(override.config || {})
  };
  const calls = [];
  let browserSession = override.session !== false;
  const sandbox = {
    window: win,
    user: {name: 'FAKE CLERK', username: 'fake_clerk', token: 'FAKE_TEST_ONLY'},
    ensureTrendosSso: async () => browserSession,
    AbortController,
    setTimeout: () => 1, clearTimeout() {},
    Date, String, Set, Array, JSON,
    fetch: async (endpoint, options) => {
      calls.push({endpoint, options});
      if (override.networkError) throw new Error('MOCK_NETWORK_DOWN');
      if (override.rejectResponse) return {ok:true,status:200,text:async()=>JSON.stringify({success:false,message:'MOCK_DENIED'})};
      return {ok:true,status:200,text:async()=>JSON.stringify({success:true, data:'SYNTHETIC_ONLY'})};
    },
  };
  vm.runInNewContext(source, sandbox, {filename:'real-easystore-acc202-router.js',timeout:1500});
  return {api:sandbox.__acc202Api,calls,win,setSession(value) {browserSession=value;}};
}

test('01 read-only getAccounting routes ONLY to mock D1, with bearer and original action',async()=>{
  const h=fixture();
  const response=await h.api('getAccounting',{requestedRole:'employee'});
  assert.equal(response.success,true);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].endpoint,h.win.EASYSTORE_ACCOUNTING_D1_URL);
  assert.equal(h.calls[0].options.method,'POST');
  assert.equal(h.calls[0].options.headers.Authorization,'Bearer FAKE_TEST_ONLY');
  assert.equal(h.calls[0].options.credentials,'omit');
  const body=JSON.parse(h.calls[0].options.body);
  assert.equal(body.action,'getAccounting');assert.equal(body.username,'fake_clerk');
});
test('02 uninventoried accounting actions are denied before any fetch',async()=>{
  const h=fixture();await assert.rejects(h.api('getNewUnknownAccountingAction',{action:'getAccounting'}),/عملية الحسابات غير معروفة/);assert.equal(h.calls.length,0);
});
test('03 blank action cannot silently route to fake legacy',async()=>{
  const h=fixture();await assert.rejects(h.api('',{}),/عملية الحسابات غير معروفة/);assert.equal(h.calls.length,0);
});
test('04 retired actions remain denied even with a read override in data',async()=>{
  const h=fixture();await assert.rejects(h.api('reconcileLegacyCustomerDebtsV1914',{action:'getAccounting'}),/إيقاف أداة الترحيل/);assert.equal(h.calls.length,0);
});
test('05 disabling D1 reads cannot reactivate legacy Google fallback',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_READONLY:false}});
  await assert.rejects(h.api('getAccounting',{}),/قراءة الحسابات من D1 غير مفعلة/);assert.equal(h.calls.length,0);
});
test('06 missing D1 read flag is also fail-closed',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_READONLY:undefined}});
  await assert.rejects(h.api('searchCustomers',{}),/قراءة الحسابات من D1 غير مفعلة/);assert.equal(h.calls.length,0);
});
test('07 caller data cannot override routing action or signed-in username',async()=>{
  const h=fixture();
  await h.api('getEasyStoreSuppliers',{action:'saveEasyStoreSupplier',username:'fake_owner',requestedRole:'admin',name:'Supplier Business Field'});
  assert.equal(h.calls.length,1);
  const body=JSON.parse(h.calls[0].options.body);
  assert.equal(body.action,'getEasyStoreSuppliers');
  assert.equal(body.username,'fake_clerk');
  assert.equal(body.name,'Supplier Business Field'); // preserve a business field used by supplier saves.
});
test('08 financial write OFF denies even when deprecated boolean is true',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITES:true,EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'OFF'}});
  await assert.rejects(h.api('saveEasyStoreSaleV2',{action:'getAccounting'}),/كتابة D1 للحسابات غير مفعلة/);
  assert.equal(h.calls.length,0);
});
test('09 missing explicit write mode cannot be resurrected by legacy boolean',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITES:true,EASYSTORE_ACCOUNTING_D1_WRITE_MODE:undefined}});
  await assert.rejects(h.api('saveCustomerAccountMovementV1915',{}),/كتابة D1 للحسابات غير مفعلة/);
  assert.equal(h.calls.length,0);
});
test('10 invalid write mode denies before network',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'TYP0'}});
  await assert.rejects(h.api('saveAccountingMaterial',{}),/وضع كتابة D1 للحسابات غير صالح/);assert.equal(h.calls.length,0);
});
test('11 canary mode with no action selected denies',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'CANARY'}});
  await assert.rejects(h.api('saveAccountingMaterial',{}),/خارج نطاق كاناري/);assert.equal(h.calls.length,0);
});
test('12 canary mode denies non-whitelisted write',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'CANARY',EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS:['saveEasyStoreSupplier']}});
  await assert.rejects(h.api('saveAccountingMaterial',{}),/خارج نطاق كاناري/);assert.equal(h.calls.length,0);
});
test('13 explicitly whitelisted canary checks mock routing only, not finance authorization',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'CANARY',EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS:['saveAccountingMaterial']}});
  await h.api('saveAccountingMaterial',{action:'getAccounting',username:'FAKE_BOSS',materialName:'TEST_ONLY'});
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].endpoint,h.win.EASYSTORE_ACCOUNTING_D1_URL);
  const body=JSON.parse(h.calls[0].options.body);
  assert.equal(body.action,'saveAccountingMaterial');assert.equal(body.username,'fake_clerk');
  assert.equal(body.materialName,'TEST_ONLY');
});
test('14 a configured GENERAL write only reaches mock, never a production endpoint',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'GENERAL'}});
  await h.api('saveAccountingMaterial',{materialName:'TEST_ONLY'});
  assert.equal(h.calls.length,1);
  assert.match(h.calls[0].endpoint,/fake-d1\.example\.invalid/);
});
test('15 SSO unavailable denies D1 reads before fetch',async()=>{
  const h=fixture({session:false});
  await assert.rejects(h.api('getAccounting',{}),/انتهت الجلسة/);
  assert.equal(h.calls.length,0);
});
test('16 D1 server error never falls back to mock legacy',async()=>{
  const h=fixture({networkError:true});
  await assert.rejects(h.api('getAccounting',{}),/MOCK_NETWORK_DOWN/);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].endpoint,h.win.EASYSTORE_ACCOUNTING_D1_URL);
});
test('17 denied response never retries through mock legacy',async()=>{
  const h=fixture({rejectResponse:true});
  await assert.rejects(h.api('getAccounting',{}),/MOCK_DENIED/);
  assert.equal(h.calls.length,1);
});
test('18 supplier business name stays intact; reserved action stays bound',async()=>{
  const h=fixture({config:{EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'CANARY',EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS:['saveEasyStoreSupplier']}});
  await h.api('saveEasyStoreSupplier',{name:'FAKE_TEST_SUPPLIER',action:'getAccounting',username:'FAKE_MANAGER',requestId:'FAKE_REQ'});
  const body=JSON.parse(h.calls[0].options.body);
  assert.equal(body.name,'FAKE_TEST_SUPPLIER');
  assert.equal(body.action,'saveEasyStoreSupplier');
  assert.equal(body.username,'fake_clerk');
  assert.equal(body.requestId,'FAKE_REQ');
});
test('19 known read operations cannot be silently reinterpreted as a write',async()=>{
  for(const action of ['getAccounting','getCustomerAccountV1915','getEasyStoreCustomers']) {
    const h=fixture();
    await h.api(action,{action:'saveCustomerAccountMovementV1915'});
    assert.equal(JSON.parse(h.calls[0].options.body).action,action);
    assert.equal(h.calls.length,1);
  }
});
test('20 default checked-in config requires D1 read only and financial write OFF',()=>{
  const config=fs.readFileSync(path.join(__dirname,'..','config.js'),'utf8');
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
  assert.match(app,/if\(!readActionRequested && !writeActionRequested\)/);
});
