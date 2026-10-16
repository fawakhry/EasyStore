'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const script=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
function createFakeApp({enabled,role='final',initialCredit=3}){
  const app={html:''},screen={innerHTML:''},submitted=[],confirmations=[];
  Object.defineProperty(app,'innerHTML',{get(){return this.html},set(v){this.html=v}});
  const user=role==='admin'
    ? {username:'FAKE_OWNER',name:'FAKE_OWNER',mode:'full',token:'FAKE_TOKEN'}
    : {username:'FAKE_FINAL',name:'FAKE_FINAL',mode:'final',token:'FAKE_TOKEN'};
  function storage(initial={}){
    const values={...initial};
    return {getItem:k=>Object.hasOwn(values,k)?values[k]:null,setItem:(k,v)=>{values[k]=String(v)},removeItem:k=>{delete values[k]}};
  }
  function scopedDataKey(user){
    const raw=String(user.token||'');let hash=2166136261;
    for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}
    const name=String(user.username||user.name||'employee').toLowerCase()
      .replace(/[إأآا]/g,'ا').replace(/[ى]/g,'ي').replace(/[ةه]/g,'ه')
      .replace(/[ؤ]/g,'و').replace(/[ئ]/g,'ي').trim().replace(/\s+/g,'_');
    return 'EASYSTORE_CLEAN_V1880_DATA_'+name+'_'+(hash>>>0).toString(36);
  }
  const customer={name:'FAKE_CUSTOMER',phone:'000',type:'fake',debt:0,currentBalance:0,creditBalance:0};
  const initial={EASYSTORE_SESSION_V1922:JSON.stringify({user})};
  initial[scopedDataKey(user)]=JSON.stringify({customers:[customer]});
  const input={
    caAmount:{value:'100'},caOperation:{value:'payment_received'},
    caMethod:{value:'نقدي'},caRef:{value:''},caNotes:{value:'OFFLINE_TEST'}
  };
  const document={
    body:{appendChild(){},removeChild(){}},
    getElementById:id=>id==='app'?app:id==='screen'?screen:input[id]||null,
    querySelectorAll:()=>[],addEventListener(){},
    createElement:()=>({parentNode:null})
  };
  let currentCredit=initialCredit;
  let calls=0;
  const context={
    console,document,localStorage:storage(),sessionStorage:storage(initial),
    location:{search:'?screen=customers',pathname:'/EasyStore/'},history:{back(){}},
    URL,URLSearchParams,
    setTimeout:()=>1,clearTimeout(){},addEventListener(){},
    confirm:msg=>{confirmations.push(msg);return true},
    TREND_API_URL:'https://fake-legacy.invalid/exec',
    EASYSTORE_ACCOUNTING_D1_URL:'https://fake-d1.invalid/accounting',
    // FAKE browser option ONLY: no real Cloudflare/Google or financial POST.
    EASYSTORE_ACCOUNTING_D1_READONLY:true,
    EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'GENERAL',
    EASYSTORE_ACCOUNTING_D1_WRITES:true,
    AbortController,
    fetch:async(url,options)=>{
      calls++;
      assert.equal(url,'https://fake-d1.invalid/accounting','never allow legacy accounting fallback');
      const body=JSON.parse(options.body);
      if(body.action==='getCustomerAccountV1915'){
        return {ok:true,status:200,text:async()=>JSON.stringify({
          success:true,customer,balance:0,
          creditFeatureEnabled:enabled,
          creditBalance:enabled?currentCredit:0,
          displayBalance:enabled?currentCredit:0,
          outstandingDebt:0,
          permissions:{canCollect:true,canAdjust:role==='admin'},transactions:[]
        })};
      }
      if(body.action==='saveCustomerAccountMovementV1915'){
        submitted.push(body);
        if(!enabled)throw Error('WRITES_NOT_AVAILABLE_WHEN_OFF');
        currentCredit+=Number(body.amount);
        return {ok:true,status:200,text:async()=>JSON.stringify({
          success:true,balance:0,customerCredit:currentCredit,
          customerDisplayBalance:currentCredit
        })};
      }
      throw Error('UNEXPECTED_ACTION:'+body.action);
    }
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(script,context,{timeout:12000});
  return {context,screen,submitted,confirmations,get calls(){return calls}};
}
test('01 OFF server capability: final employee sees no prepayment form or false credit',async()=>{
  const app=createFakeApp({enabled:false});
  await app.context.ES27.openCustomerAccount(encodeURIComponent('FAKE_CUSTOMER'));
  assert.doesNotMatch(app.screen.innerHTML,/رصيد لصالح العميل/);
  assert.doesNotMatch(app.screen.innerHTML,/customerMovementForm/);
  assert.equal(app.submitted.length,0);
});
test('02 ON server capability: positive credit +3 displayed, prepayment allowed without debt',async()=>{
  const app=createFakeApp({enabled:true});
  await app.context.ES27.openCustomerAccount(encodeURIComponent('FAKE_CUSTOMER'));
  assert.match(app.screen.innerHTML,/رصيد لصالح العميل/);
  assert.match(app.screen.innerHTML,/\+(?:3|٣)/);
  assert.match(app.screen.innerHTML,/customerMovementForm/);
  assert.match(app.screen.innerHTML,/الفاتورة القادمة/);
  assert.match(app.screen.innerHTML,/تحصيل من العميل/);
  assert.doesNotMatch(app.screen.innerHTML,/value="opening_debt"/);
});
test('03 owner UI keeps adjustment options but credit stays server-authoritative',async()=>{
  const app=createFakeApp({enabled:true,role:'admin'});
  await app.context.ES27.openCustomerAccount(encodeURIComponent('FAKE_CUSTOMER'));
  assert.match(app.screen.innerHTML,/value="opening_debt"/);
  assert.match(app.screen.innerHTML,/\+(?:3|٣)/);
});
test('04 when ON, UI permits fabricated 100 paid on 0 debt and renders +103 after verified mock response',async()=>{
  const app=createFakeApp({enabled:true});
  await app.context.ES27.openCustomerAccount(encodeURIComponent('FAKE_CUSTOMER'));
  await app.context.ES27.saveCustomerAccountMovement();
  assert.equal(app.submitted.length,1);
  assert.equal(app.submitted[0].action,'saveCustomerAccountMovementV1915');
  assert.equal(app.submitted[0].amount,100);
  assert.ok(app.submitted[0].requestId.startsWith('CUST-'));
  assert.match(app.confirmations[0],/\+(?:103|١٠٣)/);
  assert.match(app.screen.innerHTML,/\+(?:103|١٠٣)/);
});
test('05 OFF fails closed at UI even if someone forces direct save on no-debt account',async()=>{
  const app=createFakeApp({enabled:false});
  await app.context.ES27.openCustomerAccount(encodeURIComponent('FAKE_CUSTOMER'));
  await app.context.ES27.saveCustomerAccountMovement();
  assert.equal(app.submitted.length,0);
  assert.equal(app.confirmations.length,0);
});
