import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const config=fs.readFileSync('config.js','utf8');
const app=fs.readFileSync('app.js','utf8');

assert.match(config,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'CANARY'/);
assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\['closePurchaseCustodyV1920'\]/);
assert.match(app,/function a213CustodyCloseCanaryEnabled\(\)/);
assert.match(app,/if\(accountingWriteRequested && writeMode!=='CANARY'\)/);
assert.match(app,/if\(accountingWriteRequested && writeMode==='CANARY' && !writeActionRequested\)/);
assert.match(app,/if\(writeActionRequested && writeMode==='CANARY' && !a213CustodyCloseCanaryEnabled\(\)\)/);

const start=app.indexOf('    async closeCustody(encodedEmployee,department,workDate){');
const end=app.indexOf('\n    async loadDailyReport(){',start);
assert.ok(start>=0&&end>start,'must find exactly one custody handler');
const method=app.slice(start,end).trim().replace(/,\s*$/,'');
const alerts=[];
function scenario({token='FAKE-SESSION-NOT-REAL',result={success:true,balanceBefore:0,settlementType:'NONE',settlementAmount:0,balanceAfter:0}}={}){
  const calls=[],window={};
  const context={
    window,Date,console,alerts,
    user:{token},
    a213CustodyCloseCanaryEnabled:()=>true,
    flash:(message,bad)=>{alerts.push({message,bad});},
    newAccountingRequestId:prefix=>prefix+'-FAKE-UNIQUE-LOCAL-ONLY',
    api:async(action,payload)=>{calls.push({action,payload});if(result instanceof Error)throw result;return result;}
  };
  vm.createContext(context);
  const action=vm.runInContext('({'+method+'})',context).closeCustody;
  return {action,calls,window};
}
{
  const s=scenario();
  const response=await Promise.all([s.action(),s.action()]);
  assert.equal(response[0],true);
  assert.equal(s.calls.length,1,'two immediate clicks cannot send a second API request');
  assert.equal(s.calls[0].action,'closePurchaseCustodyV1920');
  assert.equal(s.calls[0].payload.department,'عام');
  assert.equal(s.calls[0].payload.workDate,'2099-12-31');
  assert.match(s.calls[0].payload.requestId,/^A213-CCLOSE-/);
  assert.match(s.calls[0].payload.employee,/^A2-CANARY-CUSTODY-/);
  assert.equal(s.window.__EASYSTORE_A213_PILOT_ATTEMPTED,true);
}
{
  const s=scenario({result:new Error('SYNTHETIC_TIMEOUT')});
  const response=await s.action();
  assert.equal(response,false);
  await s.action();
  assert.equal(s.calls.length,1,'unknown/timeout must never automatically retry');
}
{
  const s=scenario({token:''});
  await s.action();
  assert.equal(s.calls.length,0,'no token must block before latching');
  assert.equal(s.window.__EASYSTORE_A213_PILOT_ATTEMPTED,undefined);
}
console.log('A213_PILOT_CLIENT_SINGLE_DISPATCH=PASS');
console.log('A213_PILOT_UNKNOWN_OUTCOME_NO_RETRY=PASS');
console.log('A213_PILOT_CANARY_ONLY_GENERAL_WRITES_OFF=PASS');
console.log('A213_PILOT_NO_LIVE_FINANCIAL_MUTATION=PASS');
