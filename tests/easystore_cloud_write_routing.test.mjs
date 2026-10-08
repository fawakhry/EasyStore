import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf('  const D1_ACCOUNTING_READ_ACTIONS');
const end=app.indexOf('\n  function msg(',start);
assert.ok(start>=0 && end>start);
for(const mode of ['OFF','LEGACY','GENERAL','CANARY']) {
  const calls=[];
  const context={
    window:{EASYSTORE_ACCOUNTING_D1_READONLY:true,EASYSTORE_ACCOUNTING_D1_WRITE_MODE:mode,
      EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS:['closePurchaseCustodyV1920'],
      TREND_API_URL:'https://example.invalid/legacy',EASYSTORE_ACCOUNTING_D1_URL:'https://example.invalid/d1'},
    user:{username:'synthetic',name:'synthetic',token:'local-test'},
    AbortController,setTimeout,clearTimeout,ensureTrendosSso:async()=>true,
    fetch:async(url)=>{calls.push(url);return {ok:true,text:async()=>'{"success":true}'};}
  };
  vm.createContext(context);
  vm.runInContext(app.slice(start,end)+'\nglobalThis.apiTest=api; globalThis.actionsTest=[...A213_ACCOUNTING_WRITE_ACTIONS_FAIL_CLOSED];',context);
  for(const action of context.actionsTest) {
    calls.length=0;
    if(mode==='CANARY' && action==='closePurchaseCustodyV1920') {
      await context.apiTest(action,{});
      assert.deepEqual(calls,['https://example.invalid/d1']);
    } else {
      await assert.rejects(()=>context.apiTest(action,{}));
      assert.equal(calls.length,0,mode+' '+action+' must not reach any backend');
    }
  }
  calls.length=0;
  await context.apiTest('getAccounting',{});
  assert.deepEqual(calls,['https://example.invalid/d1'],'D1 reads remain available');
}
console.log('CLOUD_WRITE_ROUTING_BEHAVIOR=PASS: all financial actions fail closed except the exact bounded canary; D1 reads remain available');
