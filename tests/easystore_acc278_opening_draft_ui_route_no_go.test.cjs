'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8'),config=fs.readFileSync('config.js','utf8');
const start=source.indexOf('  const D1_ACCOUNTING_READ_ACTIONS = '),end=source.indexOf('  function requestFingerprint(',start);
assert.ok(start>0&&end>start);
const route=source.slice(start,end)+'\nglobalThis.__testApi=api;';
function fixture(changes={},session=true){
  const win={
    EASYSTORE_ACCOUNTING_D1_READONLY:true,
    EASYSTORE_ACCOUNTING_D1_WRITES:false,
    EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'OFF',
    EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS:[],
    EASYSTORE_OPENING_DRAFT_INTAKE_V1:false,
    EASYSTORE_ACCOUNTING_D1_URL:'https://synthetic-d1.invalid/accounting',
    TREND_API_URL:'https://synthetic-old-script.invalid',
    MATBAGY_SECURE_API_PROXY_URL:'',...changes
  };
  const calls=[];
  const x={window:win,user:{name:'FAKE',username:'FAKE_ACC278',token:'FAKE'},
    ensureTrendosSso:async()=>session,AbortController,
    setTimeout:()=>1,clearTimeout(){},Date,Set,Array,JSON,
    fetch:async(endpoint,options)=>{
      calls.push({endpoint,options});
      return {ok:true,status:200,text:async()=>JSON.stringify({success:true,status:'DRAFT',posted:false})};
    }
  };
  vm.runInNewContext(route,x,{timeout:1500});
  return {api:x.__testApi,calls,win};
}
const open='saveEasyStoreOpeningDraftV1',read='getEasyStoreOpeningDraftV1';
test('ACC278 public original UI opening-draft feature defaults OFF',()=>{
  assert.match(config,/window\.EASYSTORE_OPENING_DRAFT_INTAKE_V1\s*=\s*false/);
  assert.match(config,/window\.EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
  assert.match(config,/window\.EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
  assert.match(source,/acc278OpeningDraftCard\(\)/);
  assert.match(source,/window\.EASYSTORE_OPENING_DRAFT_INTAKE_V1!==true \|\| !isAdmin\(\)/);
});
test('ACC278 feature OFF blocks drafts before D1 or Google',async()=>{
  const h=fixture();await assert.rejects(h.api(open,{}),/غير معتمد/);
  await assert.rejects(h.api(read,{}),/غير معتمد/);
  assert.equal(h.calls.length,0);
});
test('ACC278 ON with finance WRITE OFF uses original D1 ONLY for draft save',async()=>{
  const h=fixture({EASYSTORE_OPENING_DRAFT_INTAKE_V1:true});
  await h.api(open,{batchId:'FAKE-BATCH-1',requestId:'FAKE-REQ-1'});
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].endpoint,h.win.EASYSTORE_ACCOUNTING_D1_URL);
  assert.equal(h.calls[0].options.credentials,'omit');
  assert.equal(h.calls[0].options.headers.Authorization,'Bearer FAKE');
  const b=JSON.parse(h.calls[0].options.body);
  assert.equal(b.action,open);assert.equal(b.username,'FAKE_ACC278');
});
test('ACC278 read goes to D1 and never legacy',async()=>{
  const h=fixture({EASYSTORE_OPENING_DRAFT_INTAKE_V1:true});
  await h.api(read,{batchId:'FAKE-BATCH-1'});
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].endpoint,h.win.EASYSTORE_ACCOUNTING_D1_URL);
  assert.equal(JSON.parse(h.calls[0].options.body).action,read);
});
test('ACC278 D1 read flag missing must NOT send draft to Google',async()=>{
  const h=fixture({EASYSTORE_OPENING_DRAFT_INTAKE_V1:true,EASYSTORE_ACCOUNTING_D1_READONLY:false});
  await assert.rejects(h.api(open,{}),/منع مسار السيرفر القديم/);
  await assert.rejects(h.api(read,{}),/قراءة الحسابات من D1 غير مفعلة/);
  assert.equal(h.calls.length,0);
});
test('ACC278 general financial mode never permits draft route',async()=>{
  for(const mode of ['GENERAL','CANARY']){
    const h=fixture({EASYSTORE_OPENING_DRAFT_INTAKE_V1:true,EASYSTORE_ACCOUNTING_D1_WRITE_MODE:mode});
    await assert.rejects(h.api(open,{}),/متاح فقط بينما الترحيل المالي العام مقفول/);
    assert.equal(h.calls.length,0);
  }
});
test('ACC278 missing employee session denies before network',async()=>{
  const h=fixture({EASYSTORE_OPENING_DRAFT_INTAKE_V1:true},false);
  await assert.rejects(h.api(open,{}),/انتهت الجلسة/);
  assert.equal(h.calls.length,0);
});
test('ACC278 original supplier/debt screens must read original D1 before final success',()=>{
  assert.match(source,/api\('getEasyStoreSuppliers',\{limit:1000\}\)/);
  assert.match(source,/api\('getEasyStoreOpeningDraftV1',\{batchId:d\.header\.batchId\}\)/);
  assert.match(source,/verified\.totalLiabilityCents!==saved\.totalLiabilityCents/);
  assert.match(source,/saved\.posted!==false/);
  assert.match(source,/acc278ToCents\(val\('openSupplierBalance'\)\)/);
  assert.match(source,/acc278ToCents\(val\('openContractTotal'\)\)/);
  assert.match(source,/d\.requestId=newAccountingRequestId\('ODRAFT'\)/);
});
console.log('ACC278_ORIGINAL_EASYSTORE_UI_D1_ONLY_DRAFT=PASS');
console.log('ACC278_21_LEGACY_WRITES_STILL_OFF=PASS');
console.log('ACC278_REAL_MONEY_WRITE_ON=NO');
