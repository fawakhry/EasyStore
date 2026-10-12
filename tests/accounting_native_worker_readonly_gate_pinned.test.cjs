'use strict';
/**
 * Read-only qualification of the REAL pinned native D1 accounting Worker.
 * Only fake in-memory HTTP Requests and a tiny SELECT-only D1 double exist.
 * It intentionally cannot test purchases, sales, payment, stock writes,
 * actual cloud employee SSO, financial posting or live day close.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const NATIVE_SHA='90795b9d05b3cc72051be50683c7942b87d07452';
const SOURCE=process.env.EASYSTORE_PINNED_NATIVE_ROOT;
assert.ok(SOURCE&&path.isAbsolute(SOURCE),
  'EASYSTORE_PINNED_NATIVE_ROOT absolute path required: never silently fetch or contact production');
const workerPath=path.join(SOURCE,'employee-accounting-native-v1.mjs');
const nativeSource=fs.readFileSync(workerPath,'utf8');
const appSource=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const configSource=fs.readFileSync(path.join(__dirname,'..','config.js'),'utf8');
const workflowSource=fs.readFileSync(path.join(__dirname,'..','.github','workflows','accounting-native-worker-pinned-readonly-gate-no-go.yml'),'utf8');
const workerPromise=import(pathToFileURL(workerPath).href);

function names(src,re,label){
  const m=src.match(re);
  assert.ok(m,'MISSING_ACTION_SET_'+label);
  const values=[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  assert.equal(values.length,new Set(values).size,'DUPLICATE_ACTION_'+label);
  return values;
}
const clientReads=names(appSource,/const D1_ACCOUNTING_READ_ACTIONS = new Set\(\[([\s\S]*?)\]\)/,'CLIENT_READ');
const clientWrites=names(appSource,/const D1_ACCOUNTING_WRITE_ACTIONS = new Set\(\[([\s\S]*?)\]\)/,'CLIENT_WRITE');
const nativeReads=names(nativeSource,/const READ_ACTIONS=new Set\(\[([\s\S]*?)\]\)/,'NATIVE_READ');
function fake(mode='READONLY'){
  const trace={sql:[],writes:0,batches:0,network:0};
  const DB={
    prepare(sql){
      const stmt=String(sql);
      trace.sql.push(stmt);
      if(!/^\s*SELECT\b/i.test(stmt))throw Error('FAKE_D1_SQL_WRITE_FORBIDDEN');
      return {
        bind(){return this;},
        async first(){
          if(stmt.includes('FROM employee_accounting_control_v1'))return {mode,nextInvoiceNumber:1,policyEpoch:0};
          if(stmt.includes('FROM sqlite_master'))return {n:6};
          if(stmt.includes('FROM employee_accounting_write_canary_v1'))return null;
          throw Error('UNEXPECTED_FAKE_D1_SELECT:'+stmt.slice(0,80));
        },
        async all(){throw Error('UNEXPECTED_FAKE_D1_ALL');},
        async run(){trace.writes++;throw Error('FAKE_D1_WRITE_FORBIDDEN');}
      };
    },
    async batch(){trace.batches++;throw Error('FAKE_D1_BATCH_FORBIDDEN');}
  };
  const env={DB,CORS_ORIGINS:'https://fawakhry.github.io'};
  async function send(action,options={}){
    const method=options.method||'POST';
    const endpoint='https://offline.invalid/v1/employee/accounting'+(options.path||'');
    const headers={'Origin':options.origin||'https://fawakhry.github.io',
      'Content-Type':'application/json',...options.headers};
    const init={method,headers};
    if(method==='POST')init.body=options.rawBody===undefined?JSON.stringify({
      action,username:'FAKE_ACCOUNTANT',requestId:'FAKE_REQUEST_ID_123456',
      token:'FAKE_UNVERIFIED_TOKEN',...options.body
    }):options.rawBody;
    const response=await (await workerPromise).handleEmployeeAccountingNativeRequest(
      new Request(endpoint,init),env);
    const data=response.status===204?null:await response.json();
    return {status:response.status,data,response};
  }
  function noWrites(){
    assert.equal(trace.writes,0,'fake D1 must never write');
    assert.equal(trace.batches,0,'fake D1 must never batch');
    assert.equal(trace.network,0,'no HTTP transport beyond in-process Request');
    assert.ok(trace.sql.every(s=>/^\s*SELECT\b/i.test(s)),'only fake SELECTs allowed');
  }
  return {send,noWrites,trace};
}

test('01 exact TrendOs native Worker SHA pinned in workflow and harness, zero deploy permissions',()=>{
  assert.match(workflowSource,new RegExp(NATIVE_SHA));
  assert.match(workflowSource,/repository: fawakhry\/TrendOs/);
  assert.match(workflowSource,/persist-credentials: false/);
  assert.match(workflowSource,/contents: read/);
  assert.match(workflowSource,/sparse-checkout:/);
  assert.doesNotMatch(workflowSource,/wrangler\s+(deploy|d1\s+execute)|--remote|\bsecrets:\b/i);
  assert.match(configSource,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
  assert.match(configSource,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
  assert.match(configSource,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
  assert.equal(clientWrites.length,21);
  assert.equal(clientReads.length,11);
});
test('02 frontend inventory exactly matches real native Worker permitted D1 reads',()=>{
  assert.deepEqual([...clientReads].sort(),[...nativeReads].sort());
  assert.equal(clientReads.filter(x=>clientWrites.includes(x)).length,0);
});
test('03 native router scopes root and health, not other paths',async()=>{
  const {isEmployeeAccountingNativePath}=await workerPromise;
  assert.equal(isEmployeeAccountingNativePath('/v1/employee/accounting'),true);
  assert.equal(isEmployeeAccountingNativePath('/v1/employee/accounting/health'),true);
  assert.equal(isEmployeeAccountingNativePath('/v1/employee/accounting/unknown'),false);
});
test('04 OPTIONS preflight gives only CORS and no accounting SQL',async()=>{
  const h=fake();const r=await h.send('saveEasyStoreSaleV2',{method:'OPTIONS'});
  assert.equal(r.status,204);assert.equal(h.trace.sql.length,0);h.noWrites();
});
test('05 unknown browser origin is rejected before database access',async()=>{
  const h=fake();const r=await h.send('getAccounting',{origin:'https://hostile.invalid'});
  assert.equal(r.status,403);assert.equal(r.data.code,'origin-not-allowed');
  assert.equal(h.trace.sql.length,0);h.noWrites();
});
test('06 health OFF reports no write authority even when schema is ready',async()=>{
  const h=fake('OFF');const r=await h.send('',{method:'GET',path:'/health'});
  assert.equal(r.status,200);
  assert.equal(r.data.mode,'OFF');
  assert.equal(r.data.authoritativeWrites,false);
  assert.equal(r.data.appsScriptBusinessAuthority,false);
  assert.equal(r.data.googleBusinessCalls,0);h.noWrites();
});
test('07 health READONLY never reports write authority or canary users/actions',async()=>{
  const h=fake('READONLY');const r=await h.send('',{method:'GET',path:'/health'});
  assert.equal(r.status,200);
  assert.equal(r.data.mode,'READONLY');
  assert.equal(r.data.authoritativeWrites,false);
  assert.equal(r.data.writeCanaryAllowedUserCount,0);
  assert.equal(r.data.writeCanaryAllowedActionCount,0);h.noWrites();
});
test('08 OFF mode blocks even read queries before fake authentication',async()=>{
  const h=fake('OFF');const r=await h.send('getAccounting');
  assert.equal(r.status,503);assert.equal(r.data.code,'employee-accounting-off');h.noWrites();
});
test('09 READONLY mode blocks unsupported refund, credit and reversal actions',async()=>{
  const h=fake();
  for(const action of ['refundEasyStoreSaleV2','returnEasyStoreSaleV2','reverseEasyStoreSaleV2',
    'createCustomerCredit','UNKNOWN_FINANCIAL_WRITE']){
    const r=await h.send(action);
    assert.equal(r.status,503,action);
    assert.equal(r.data.code,'employee-accounting-readonly',action);
  }
  h.noWrites();
});
test('10 READONLY mode rejects invalid mode spelling, never guesses GENERAL',async()=>{
  const h=fake('READ_ONLY');const r=await h.send('getAccounting');
  assert.equal(r.status,503);
  assert.equal(r.data.code,'employee-accounting-mode-unsupported');h.noWrites();
});
test('11 READONLY rejects bad/absent employee sessions for allowed reads',async()=>{
  const h=fake();const r=await h.send('getAccounting',{body:{token:'',username:''}});
  assert.equal(r.status,401);assert.equal(r.data.code,'employee-session-rejected');h.noWrites();
});
test('12 read-only HTTP endpoint disallows GET on financial action root',async()=>{
  const h=fake();const r=await h.send('getAccounting',{method:'GET'});
  assert.equal(r.status,405);assert.equal(r.data.code,'method-not-allowed');h.noWrites();
});
test('13 malformed JSON rejected; never parsed as privileged financial write',async()=>{
  const h=fake();const r=await h.send('saveEasyStoreSaleV2',{rawBody:'{ NOT JSON'});
  assert.equal(r.status,400);assert.equal(r.data.code,'invalid-json');h.noWrites();
});
for(const action of clientWrites){
  test('READONLY actual Worker denies '+action+' before any D1 write',async()=>{
    const h=fake();
    const r=await h.send(action,{body:{role:'admin',amount:'999999',paid:'999999',mode:'GENERAL',requestId:'FAKE_REPLAY_123456'}});
    assert.equal(r.status,503);
    assert.equal(r.data.code,'employee-accounting-readonly');
    h.noWrites();
  });
}
test('14 fake CANARY still rejects anonymous financial writes before D1 mutation',async()=>{
  const h=fake('CANARY');const r=await h.send('saveEasyStoreSaleV2',{body:{token:'',username:''}});
  assert.equal(r.status,401);assert.equal(r.data.code,'employee-session-rejected');h.noWrites();
});
test('15 fake GENERAL still rejects anonymous financial writes before D1 mutation',async()=>{
  const h=fake('GENERAL');const r=await h.send('saveEasyStorePurchaseV2',{body:{token:'',username:''}});
  assert.equal(r.status,401);assert.equal(r.data.code,'employee-session-rejected');h.noWrites();
});
test('16 no test has approved, created or posted any real finance ledger',()=>{
  assert.ok(!nativeSource.includes('THE_IMPOSSIBLE_EASYSTORE_FINANCE_GO_TEST_MARKER'));
  assert.equal(process.env.CLOUDFLARE_API_TOKEN||'','');
  assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID||'','');
  assert.equal(process.env.GOOGLE_APPLICATION_CREDENTIALS||'','');
});
