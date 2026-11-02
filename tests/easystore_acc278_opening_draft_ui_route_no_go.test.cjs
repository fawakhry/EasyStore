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
    EASYSTORE_SUPPLIER_MASTER_INTAKE_V1:false,
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
test('ACC281 existing supplier-only feature defaults OFF and original D1 is fail-closed',async()=>{
  assert.match(config,/EASYSTORE_SUPPLIER_MASTER_INTAKE_V1\s*=\s*false/);
  const h=fixture();
  await assert.rejects(h.api('saveEasyStoreSupplier',{
    name:'FAKE VENDOR',opening:0,requestId:'ACC281-SUP-SYNTH-001'
  }),/كتابة D1 للحسابات غير مفعلة/);
  assert.equal(h.calls.length,0);
});
test('ACC281 supplier-only flag routes ONLY supplier zero master to original D1; drafts OFF',async()=>{
  const h=fixture({EASYSTORE_SUPPLIER_MASTER_INTAKE_V1:true});
  await h.api('saveEasyStoreSupplier',{
    name:'FAKE VENDOR',opening:0,requestId:'ACC281-SUP-SYNTH-001'
  });
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].endpoint,h.win.EASYSTORE_ACCOUNTING_D1_URL);
  assert.equal(JSON.parse(h.calls[0].options.body).action,'saveEasyStoreSupplier');
  await assert.rejects(h.api(open,{}),/غير معتمد/);
  await assert.rejects(h.api(read,{}),/غير معتمد/);
  await assert.rejects(h.api('saveEasyStoreSaleV2',{
    customerId:'FAKE',amount:100
  }),/كتابة D1 للحسابات غير مفعلة/);
  assert.equal(h.calls.length,1,'supplier flag cannot enable any other D1 writer');
});
test('ACC281 supplier-only flag cannot fallback to Apps Script or bypass expired SSO',async()=>{
  const f=fixture({EASYSTORE_SUPPLIER_MASTER_INTAKE_V1:true,
    EASYSTORE_ACCOUNTING_D1_READONLY:false});
  await assert.rejects(f.api('saveEasyStoreSupplier',{opening:0}),/منع مسار السيرفر القديم/);
  assert.equal(f.calls.length,0);
  const expired=fixture({EASYSTORE_SUPPLIER_MASTER_INTAKE_V1:true},false);
  await assert.rejects(expired.api('saveEasyStoreSupplier',{opening:0}),/انتهت الجلسة/);
  assert.equal(expired.calls.length,0);
});
test('ACC281 original supplier form visible only in owner-authorized supplier-only mode',()=>{
  const i=source.indexOf('  function screenSuppliers(){');
  const j=source.indexOf('\n  function screenCustomers(){',i);
  assert.ok(i>0&&j>i);
  const body=source.slice(i,j);
  const execute=(flag,isOwner=true)=>vm.runInNewContext(
    '('+body.trim()+')',
    {window:{EASYSTORE_SUPPLIER_MASTER_INTAKE_V1:flag,
      EASYSTORE_ACCOUNTING_D1_READONLY:true,
      EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'OFF'},
     isAdmin:()=>isOwner,state:{data:{suppliers:[]}},
     table:()=>'',acc278OpeningDraftCard:()=>'',esc:String,money:String}
  )();
  assert.match(execute(false),/حفظ المورد — غير مفعل/);
  assert.doesNotMatch(execute(false),/ES27\.saveSupplier\(\)/);
  assert.match(execute(true),/ES27\.saveSupplier\(\)/);
  assert.match(execute(true),/رصيد افتتاحي \(صفر فقط\)/);
  assert.match(execute(true),/id="supOpening" type="number" value="0" disabled/);
  assert.doesNotMatch(execute(true,false),/ES27\.saveSupplier\(\)/);
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


// ACC286 exact finance-local customer readback and stable retry key.
// Execute the ACTUAL original EasyStore action in an offline VM; never POST
// to any live D1, legacy Apps Script, or production finance route.
const acc286HelperStart=source.indexOf('  function acc286StandaloneCustomerReadbackMatches(');
const acc286HelperEnd=source.indexOf('\n  window.ES27 = {',acc286HelperStart);
const acc286ActionStart=source.indexOf('    async saveStandaloneCustomer(){');
const acc286ActionEnd=source.indexOf('\n    captureOpeningDraftHeader(){',acc286ActionStart);
assert.ok(acc286HelperStart>0&&acc286HelperEnd>acc286HelperStart);
assert.ok(acc286ActionStart>acc286HelperEnd&&acc286ActionEnd>acc286ActionStart);
const acc286OriginalHelper=source.slice(acc286HelperStart,acc286HelperEnd);
const acc286OriginalMethod=source.slice(acc286ActionStart,acc286ActionEnd);
function acc286Fixture(readback,opts={}){
  const state={standaloneCustomerRequestId:'',data:{customers:[]}};
  const events=[],requests=[],id='ESC-RETRY-ACC286-STABLE-KEY';
  const customerId='ESC-'+'A'.repeat(20);
  const inputs={esStandaloneCustomerName:'FAKE ACCOUNT CUSTOMER',
    esStandaloneCustomerPhone:'',esStandaloneCustomerAddress:'',
    esStandaloneCustomerNotes:''};
  const getResult=()=>{
    if(readback==='error')throw Error('SYNTHETIC_D1_READBACK_TIMEOUT');
    if(readback==='foreign')return {success:true,
      identitySource:'TRENDOS_SIGNED_INTERNAL',version:'A1_D1_READ_MODEL_V1',
      customers:[{customerId,name:inputs.esStandaloneCustomerName}]};
    if(readback==='missing')return {success:true,
      identitySource:'EASYSTORE_FINANCE_LOCAL',version:'EASYSTORE_STANDALONE_V1',
      customers:[{customerId:'ESC-'+'B'.repeat(20),name:inputs.esStandaloneCustomerName}]};
    if(readback==='other-name')return {success:true,
      identitySource:'EASYSTORE_FINANCE_LOCAL',version:'EASYSTORE_STANDALONE_V1',
      customers:[{customerId,name:'FAKE DIFFERENT CUSTOMER'}]};
    if(readback==='empty')return {success:true,
      identitySource:'EASYSTORE_FINANCE_LOCAL',version:'EASYSTORE_STANDALONE_V1',
      customers:[]};
    return {success:true,
      identitySource:'EASYSTORE_FINANCE_LOCAL',version:'EASYSTORE_STANDALONE_V1',
      customers:[{customerId,name:inputs.esStandaloneCustomerName}]};
  };
  const ctx={
    window:{EASYSTORE_STANDALONE_CUSTOMERS_V1:opts.enabled!==false},
    state,canManageAccounting:()=>opts.manager!==false,
    newAccountingRequestId:()=>id,val:k=>inputs[k]||'',
    saveLocal:()=>events.push('cache'),shell:()=>events.push('shell'),
    flash:(message,bad)=>events.push({message,bad:!!bad}),
    deny:()=>events.push('denied'),
    api:async(action,p)=>{
      requests.push({action,requestId:p&&p.requestId});
      if(action==='saveEasyStoreCustomer')
        return {success:true,customerId,version:'EASYSTORE_STANDALONE_V1'};
      if(action==='getEasyStoreCustomers')return getResult();
      throw Error('Unexpected accounting action');
    }
  };
  const instance=vm.runInNewContext(
    acc286OriginalHelper+'\n({'+acc286OriginalMethod+'\n})',
    ctx,{timeout:1500});
  return {state,requests,events,id,instance};
}
test('ACC286 verified D1 exact customer identity alone permits success and resets retry key',async()=>{
  const h=acc286Fixture('verified');
  await h.instance.saveStandaloneCustomer();
  assert.deepEqual(h.requests.map(x=>x.action),
    ['saveEasyStoreCustomer','getEasyStoreCustomers']);
  assert.equal(h.requests[0].requestId,h.id);
  assert.equal(h.state.standaloneCustomerRequestId,'');
  assert.equal(h.state.data.customers.length,1);
  assert.ok(h.events.includes('cache'));
  assert.ok(h.events.includes('shell'));
  assert.equal(h.events.at(-1).bad,false);
});
test('ACC286 D1 GET timeout is ambiguous; repeat submit MUST keep same idempotency key',async()=>{
  const h=acc286Fixture('error');
  await h.instance.saveStandaloneCustomer();
  await h.instance.saveStandaloneCustomer();
  assert.equal(h.requests.filter(x=>x.action==='saveEasyStoreCustomer').length,2);
  assert.equal(h.requests.filter(x=>x.action==='saveEasyStoreCustomer')[0].requestId,h.id);
  assert.equal(h.requests.filter(x=>x.action==='saveEasyStoreCustomer')[1].requestId,h.id);
  assert.equal(h.state.standaloneCustomerRequestId,h.id);
  assert.deepEqual(h.state.data.customers,[]);
  assert.equal(h.events.filter(x=>x==='cache'||x==='shell').length,0);
  assert.equal(h.events.at(-1).bad,true);
});
test('ACC286 missing, forged source, mismatched id/name never give optimistic success',async()=>{
  for(const response of ['missing','foreign','other-name','empty']){
    const h=acc286Fixture(response);
    await h.instance.saveStandaloneCustomer();
    assert.equal(h.state.standaloneCustomerRequestId,h.id,response);
    assert.deepEqual(h.state.data.customers,[],response);
    assert.equal(h.events.filter(x=>x==='cache'||x==='shell').length,0,response);
    assert.equal(h.events.at(-1).bad,true,response);
  }
});
test('ACC286 OFF customer feature forbids any D1 request',async()=>{
  for(const opts of [{enabled:false},{manager:false}]){
    const h=acc286Fixture('verified',opts);
    await h.instance.saveStandaloneCustomer();
    assert.equal(h.requests.length,0);
    assert.equal(h.state.standaloneCustomerRequestId,'');
  }
  assert.match(config,/EASYSTORE_STANDALONE_CUSTOMERS_V1\s*=\s*false/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
});
console.log('ACC286_CUSTOMER_D1_READBACK_IDEMPOTENT_RETRY_TESTED=PASS');
console.log('ACC286_PRODUCTION_FINANCE_WRITES_STILL_OFF=PASS');


// ACC286 Day-1 viewer mode cannot advertise or trigger live financial posts.
test('ACC286 finance OFF renders operational viewer state and guards invoice save',()=>{
  const start=source.indexOf('  function financePostOff(){');
  const end=source.indexOf('  function screenSales(){',start);
  assert.ok(start>0&&end>start,'original EasyStore finance OFF helper not found');
  function mode(v){
    const ctx={window:{EASYSTORE_ACCOUNTING_D1_WRITE_MODE:v}};
    vm.runInNewContext(source.slice(start,end)+'\nglobalThis.__financeOff=financePostOff();',ctx);
    return ctx.__financeOff;
  }
  assert.equal(mode('OFF'),true);
  assert.equal(mode('off'),true);
  assert.equal(mode(undefined),true);
  assert.equal(mode('CANARY'),false);
  assert.equal(mode('GENERAL'),false);
  assert.match(source,/const movementForm=financeOff\?/);
  assert.match(source,/كشف حساب للقراءة فقط؛ التحصيل والتسويات المالية مقفولة/);
  assert.match(source,/التحصيل والتسويات مقفولة حتى اعتماد التشغيل المالي/);
  assert.match(source,/financeOff\?'disabled aria-disabled="true"':''/);
  assert.match(source,/async saveSale\(\)\{\s*if\(financePostOff\(\)\)return flash/);
  assert.match(source,/const standaloneCustomerCard=window\.EASYSTORE_STANDALONE_CUSTOMERS_V1===true && isAdmin\(\) && !financePostOff\(\)/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
});
console.log('ACC286_READONLY_OPERATOR_UI_DOES_NOT_ADVERTISE_FINANCE_POSTS=PASS');


// ACC288 R0/R2 integration ONLY: reuse published ACC281 supplier directory
// contract with previously qualified ACC281 R2 supplier-only feature OFF.
test('ACC288 R0/R2 integration preserves verified supplier GET and independent OFF default',()=>{
  const start=source.indexOf('  function screenSuppliers(){');
  const end=source.indexOf('\n  function screenCustomers(){',start);
  assert.ok(start>=0&&end>start,'original supplier screen must remain present');
  function screen(status,flag,admin=true){
    let tableCalls=0;
    const ctx={
      window:{EASYSTORE_SUPPLIER_MASTER_INTAKE_V1:flag,
        EASYSTORE_ACCOUNTING_D1_READONLY:true,
        EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'OFF'},
      state:{supplierDirectory:{status,rows:status==='verified'?
        [{partyId:'SUP-VERIFIED-ONLY',name:'FAKE D1 SUPPLIER',phone:'000'}]:[]},
        data:{suppliers:[{partyId:'SUP-STALE-CACHE',name:'FAKE STALE'}]}},
      isAdmin:()=>admin,esc:x=>String(x||''),money:x=>String(x||0),
      table:(rows,headers,render)=>{
        tableCalls++;
        return rows.length?rows.map((v,i)=>render(v,i).join('~')).join('|'):'<div>لا توجد بيانات حتى الآن</div>';
      },acc278OpeningDraftCard:()=>''
    };
    const f=vm.runInNewContext('('+source.slice(start,end)+')',ctx);
    return {html:f(),tableCalls};
  }
  const failed=screen('failed',false);
  assert.match(failed.html,/تعذر التحقق من قراءة الموردين من D1/);
  assert.doesNotMatch(failed.html,/SUP-STALE-CACHE|SUP-VERIFIED-ONLY/);
  assert.equal(failed.tableCalls,0);
  const emptyLike=screen('unchecked',false);
  assert.doesNotMatch(emptyLike.html,/لا توجد بيانات حتى الآن/);
  const verified=screen('verified',false);
  assert.match(verified.html,/تم التحقق من قراءة دليل الموردين من D1/);
  assert.match(verified.html,/SUP-VERIFIED-ONLY/);
  assert.doesNotMatch(verified.html,/SUP-STALE-CACHE/);
  assert.match(verified.html,/حفظ المورد — غير مفعل/);
  assert.doesNotMatch(verified.html,/onclick="ES27\.saveSupplier\(\)"/);
  const manager=screen('verified',true,true);
  assert.match(manager.html,/onclick="ES27\.saveSupplier\(\)"/);
  assert.match(manager.html,/value="0" disabled/);
  const employee=screen('verified',true,false);
  assert.match(employee.html,/حفظ المورد — غير مفعل/);
  assert.doesNotMatch(employee.html,/onclick="ES27\.saveSupplier\(\)"/);
  assert.match(config,/EASYSTORE_SUPPLIER_MASTER_INTAKE_V1\s*=\s*false/);
  assert.match(config,/EASYSTORE_OPENING_DRAFT_INTAKE_V1\s*=\s*false/);
});
console.log('ACC288_R0_R2_SUPPLIER_GET_COMPATIBILITY_NEW_GAP=PASS');


// ACC289 exact supplier response identity: only previously UNTESTED success
// proof gap; historical A2.10 production supplier canary is NOT re-executed.
function acc289SupplierFixture(failure,featureOn=true){
  const name='FAKE SUPPLIER ACC289',id='SUP-FAKE-289',requestId='SUP-ACC289-STABLE-REQUEST';
  const inputs={supOpening:'0',supName:name,supPhone:'000',supAddress:'FAKE'};
  const calls=[],messages=[],state={
    supplierRequestId:'',supplierRequestFingerprint:'',
    supplierDirectory:{status:'unchecked',rows:[]},
    data:{suppliers:[]}
  };
  const goodWrite={success:true,partyId:id,supplierId:id,name,
    supplierName:name,openingBalance:0,active:true,version:'A2_D1_ACCOUNTING_V1'};
  const goodRead={success:true,version:'A1_D1_READ_MODEL_V1',
    suppliers:[{partyId:id,name,active:true,currentBalance:0}]};
  let write=(Object.assign({},goodWrite)),read=(Object.assign({},goodRead));
  if(failure==='wrong-write-id')write.partyId='SUP-DIFFERENT';
  if(failure==='wrong-write-version')write.version='FAKE-VERSION';
  if(failure==='wrong-directory-version')read.version='FAKE-VERSION';
  if(failure==='wrong-read-id')read.suppliers=[{partyId:'SUP-OTHER',name,active:true,currentBalance:0}];
  if(failure==='wrong-read-name')read.suppliers=[{partyId:id,name:'OTHER NAME',active:true,currentBalance:0}];
  if(failure==='wrong-read-balance')read.suppliers=[{partyId:id,name,active:true,currentBalance:90}];
  if(failure==='inactive')read.suppliers=[{partyId:id,name,active:false,currentBalance:0}];
  const context={
    window:{EASYSTORE_SUPPLIER_MASTER_INTAKE_V1:featureOn,
      EASYSTORE_ACCOUNTING_D1_READONLY:true,EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'OFF'},
    state,canManageAccounting:()=>true,deny:()=>messages.push('denied'),
    flash:(msg,bad)=>messages.push({msg,bad:!!bad}),
    nkey:x=>String(x||'').trim().toLowerCase(),val:k=>inputs[k]||'',
    newAccountingRequestId:()=>requestId,
    saveLocal:()=>messages.push('cache'),shell:()=>messages.push('shell'),
    api:async(action,data)=>{
      calls.push({action,requestId:data&&data.requestId});
      if(action==='saveEasyStoreSupplier')return write;
      if(action==='getEasyStoreSuppliers'){
        if(failure==='read-timeout')throw Error('FAKE_READ_TIMEOUT');
        return read;
      }
      throw Error('Unknown supplier test action');
    }
  };
  const start=source.indexOf('    async saveSupplier(){');
  const end=source.indexOf('\n    editSupplier(i)',start);
  assert.ok(start>=0&&end>start);
  const instance=vm.runInNewContext('({'+source.slice(start,end)+'\n})',context);
  return {instance,state,calls,messages,requestId};
}
test('ACC289 exact supplier save and D1 readback alone can clear idempotent retry',async()=>{
  const h=acc289SupplierFixture('ok');
  await h.instance.saveSupplier();
  assert.deepEqual(h.calls.map(x=>x.action),['saveEasyStoreSupplier','getEasyStoreSuppliers']);
  assert.equal(h.calls[0].requestId,h.requestId);
  assert.equal(h.state.supplierRequestId,'');
  assert.equal(h.state.supplierDirectory.status,'verified');
  assert.equal(h.state.data.suppliers.length,1);
  assert.equal(h.messages.at(-1).bad,false);
});
test('ACC289 wrong supplier identity/version/balance and timeout cannot declare success',async()=>{
  for(const failure of ['wrong-write-id','wrong-write-version',
    'wrong-directory-version','wrong-read-id','wrong-read-name',
    'wrong-read-balance','inactive','read-timeout']){
    const h=acc289SupplierFixture(failure);
    await h.instance.saveSupplier();
    await h.instance.saveSupplier();
    assert.equal(h.state.supplierRequestId,h.requestId,failure);
    assert.equal(h.calls.filter(x=>x.action==='saveEasyStoreSupplier').length,2,failure);
    assert.equal(h.calls[0].requestId,h.calls.filter(x=>x.action==='saveEasyStoreSupplier')[1].requestId,failure);
    assert.equal(h.state.supplierDirectory.status,'unchecked',failure);
    assert.equal(h.messages.some(x=>x==='cache'||x==='shell'),false,failure);
    assert.equal(h.messages.at(-1).bad,true,failure);
  }
});
test('ACC289 optional supplier OFF blocks even direct action before network',async()=>{
  const h=acc289SupplierFixture('ok',false);
  await h.instance.saveSupplier();
  assert.equal(h.calls.length,0);
  assert.equal(h.state.supplierRequestId,'');
  assert.equal(h.messages.at(-1).bad,true);
  assert.match(config,/EASYSTORE_SUPPLIER_MASTER_INTAKE_V1\s*=\s*false/);
});
console.log('ACC289_SUPPLIER_IDENTITY_RETRY_ZERO_ONLY_OFFLINE=PASS');
