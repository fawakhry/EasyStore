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
test('ACC278 supplier master zero balance also routes to original D1 with financial posting OFF',async()=>{
  const h=fixture({EASYSTORE_OPENING_DRAFT_INTAKE_V1:true});
  await h.api('saveEasyStoreSupplier',{name:'FAKE SUPPLIER',opening:0,requestId:'ACC278-SUP-ZERO-FAKE-001'});
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].endpoint,h.win.EASYSTORE_ACCOUNTING_D1_URL);
  assert.equal(JSON.parse(h.calls[0].options.body).action,'saveEasyStoreSupplier');
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
  await assert.rejects(h.api('saveEasyStoreSupplier',{opening:0}),/منع مسار السيرفر القديم/);
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


// ACC279: prove matching totals alone cannot trigger a 'saved and verified' banner.
// The real original UI helper is extracted, not reimplemented in the fixture.
const acc279Start=source.indexOf('  function acc279OpeningDraftReadbackMatches(');
const acc279End=source.indexOf('  function acc278OpeningDraftCard()',acc279Start);
assert.ok(acc279Start>0&&acc279End>acc279Start,'original ACC279 exact-readback guard absent');
const acc279Ctx={Map,Set,Number,Array};
vm.runInNewContext(source.slice(acc279Start,acc279End)+
  '\nglobalThis.__acc279Match=acc279OpeningDraftReadbackMatches;',acc279Ctx,{timeout:1500});
const exactMatch=acc279Ctx.__acc279Match;
const submitted=()=>({batchId:'SYNTH-BATCH-ACC279',cutoverDate:'2026-10-31',
  currency:'EGP',sourceEvidenceRef:'SYNTH-SIGNED-SOURCE-REF',
  suppliers:[{supplierId:'SUP-SYNTH-001',balanceCents:125000,evidenceRef:'SYNTH-SUP-REF'}],
  installments:[{contractId:'CONTRACT-SYNTH-001',creditorRef:'SUP-SYNTH-001',
    supplierId:'SUP-SYNTH-001',liabilityTreatment:'INCLUDED_IN_SUPPLIER_OPENING',
    contractTotalCents:100000,paidToCutoverCents:40000,remainingCents:60000,
    installmentCents:15000,frequency:'monthly',nextDueDate:'2026-11-15',
    evidenceRef:'SYNTH-CONTRACT-REF'},
    {contractId:'CONTRACT-SYNTH-002',creditorRef:'CREDITOR-SYNTH-EXTERNAL',
    supplierId:'',liabilityTreatment:'SEPARATE_CREDITOR',contractTotalCents:90000,
    paidToCutoverCents:30000,remainingCents:60000,installmentCents:10000,
    frequency:'monthly',nextDueDate:'2026-11-20',evidenceRef:'SYNTH-EXT-REF'}]
});
const readback=(b=submitted())=>({...b,success:true,status:'DRAFT',posted:false,
  postingAllowed:false,financeRelease:'NO_GO',supplierTotalCents:125000,
  separateInstallmentTotalCents:60000,includedInSupplierCents:60000,
  totalLiabilityCents:185000});
test('ACC279 full supplier and installment row readback, order independent',()=>{
  const e=submitted(),a=readback();
  assert.equal(exactMatch(e,a),true);
  assert.equal(exactMatch(e,{...a,installments:[...a.installments].reverse()}),true);
});
test('ACC279 same totals and counts but changed creditor IDs, evidence or contract details MUST fail',()=>{
  const e=submitted();
  for(const altered of [
    {...readback(),suppliers:[{...e.suppliers[0],supplierId:'SUP-SYNTH-DIFFERENT'}]},
    {...readback(),suppliers:[{...e.suppliers[0],evidenceRef:'SYNTH-WRONG-REF'}]},
    {...readback(),installments:e.installments.map((v,i)=>i?{...v,creditorRef:'CREDITOR-SYNTH-WRONG'}:v)},
    {...readback(),installments:e.installments.map((v,i)=>i?{...v,nextDueDate:'2026-12-20'}:v)},
    {...readback(),installments:e.installments.map((v,i)=>i?{...v,installmentCents:9999}:v)},
    {...readback(),installments:e.installments.map((v,i)=>i?{...v,evidenceRef:'SYNTH-WRONG'}:v)},
    {...readback(),cutoverDate:'2026-10-30'},
    {...readback(),sourceEvidenceRef:'SYNTH-OTHER-SOURCE'},
    {...readback(),postingAllowed:true},
    {...readback(),financeRelease:'GO'},
    {...readback(),posted:true},
    {...readback(),totalLiabilityCents:185001},
    {...readback(),installments:[e.installments[0],e.installments[0]]}
  ])assert.equal(exactMatch(e,altered),false,JSON.stringify(altered));
});
test('ACC279 UI saves snapshot and requires exact D1 readback before success',()=>{
  assert.match(source,/suppliers:d\.suppliers\.map\(s=>\(\{\.\.\.s\}\)\)/);
  assert.match(source,/acc279OpeningDraftReadbackMatches\(payload,verified\)/);
  assert.match(source,/if\(!acc279OpeningDraftReadbackMatches/);
  assert.match(config,/EASYSTORE_OPENING_DRAFT_INTAKE_V1\s*=\s*false/);
});
console.log('ACC279_EXACT_ORIGINAL_D1_DRAFT_ROW_READBACK=PASS');
console.log('ACC279_FALSE_SAME_TOTALS_SUCCESS_BLOCKED=PASS');
console.log('ACC279_NO_FINANCIAL_POSTING=PASS');
