import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Offline executable source contract: the candidate's CANARY config cannot
// reveal or execute the A2.13 button without the live server one-command arm.
const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf('  let a213PilotServerReady=false;');
const end=app.indexOf('  function newAccountingRequestId(',start);
assert.ok(start>=0&&end>start,'server armed visibility guard must exist');
const code=app.slice(start,end);
const base={
  success:true,mode:'CANARY',writeAuthorityMode:'CANARY_BOUNDED',
  writeCanaryAllowedUserCount:1,writeCanaryAllowedActionCount:1,
  writeCanaryMaxAmount:0,writeCanaryMaxCommands:1,
  writeCanaryCommandsStarted:0,writeCanaryExpiresAtMs:Date.now()+90000
};
const window={
  EASYSTORE_ACCOUNTING_D1_WRITE_MODE:'CANARY',
  EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS:['closePurchaseCustodyV1920'],
  EASYSTORE_ACCOUNTING_D1_URL:'https://trendos-d1-api.trendmall-contact.workers.dev/v1/employee/accounting'
};
const user={username:'ضياء',token:'FAKE-TEST-ONLY-TOKEN'};
const state={formDirty:false};
const calls=[],shells=[];
let nextHealth={...base,mode:'READONLY'},networkError=false;
const context={
  window,user,state,Date,AbortController,setTimeout,clearTimeout,
  shell:()=>shells.push('rerender'),
  fetch:async(url,opts)=>{
    calls.push({url,opts});
    if(networkError)throw Error('simulated network failure');
    return {ok:true,json:async()=>nextHealth};
  }
};
vm.createContext(context);
vm.runInContext([
"function a213CustodyCloseCanaryEnabled(){return window.EASYSTORE_ACCOUNTING_D1_WRITE_MODE==='CANARY' && window.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS.length===1;}",
code
].join('\n'),context);

const evalCode=expr=>vm.runInContext(expr,context);
const poll=()=>evalCode('refreshA213PilotArmState()');
assert.equal(evalCode('a213CustodyClosePilotEligible()'),false,'never show canary before first server check');
assert.equal(await poll(),false,'READONLY mode must block even if frontend config is CANARY');
assert.equal(calls.length,1);
assert.equal(calls[0].opts.method,'GET','health check cannot execute accounting POST');
assert.equal(calls[0].opts.credentials,'omit');
assert.ok(!('Authorization' in (calls[0].opts.headers||{})),'do not send session token to unauthenticated health endpoint');
assert.equal(shells.length,0,'no UI repaint when already fail closed');

nextHealth={...base};
assert.equal(await poll(),true,'one-command backend CANARY must allow exact employee button');
assert.equal(evalCode('a213CustodyClosePilotEligible()'),true);
assert.equal(shells.length,1);
assert.equal(await poll(),true);
assert.equal(shells.length,1,'unchanged backend arm cannot repeatedly destroy the UI');

nextHealth={...base,writeCanaryCommandsStarted:1};
assert.equal(await poll(),false,'consumed budget must hide button');
assert.equal(evalCode('a213CustodyClosePilotEligible()'),false);
assert.equal(shells.length,2);

nextHealth={...base,writeCanaryExpiresAtMs:Date.now()+3000};
assert.equal(await poll(),false,'near expiration must fail closed');
nextHealth={...base,writeCanaryAllowedActionCount:2};
assert.equal(await poll(),false,'too broad backend action allowlist must fail closed');
nextHealth={...base,writeCanaryMaxCommands:2};
assert.equal(await poll(),false,'too broad backend command budget must fail closed');
nextHealth={...base};
networkError=true;
assert.equal(await poll(),false,'health network errors must keep the button hidden');
networkError=false;

const count=calls.length;
user.username='NON-DIAA';
assert.equal(await poll(),false);
assert.equal(calls.length,count,'wrong employee cannot even poll for pilot arm');
user.username='ضياء';
window.EASYSTORE_ACCOUNTING_D1_URL='https://untrusted.invalid';
assert.equal(await poll(),false);
assert.equal(calls.length,count,'non-approved health endpoint not queried');
console.log('A213_SERVER_ARM_REQUIRED_BEFORE_BUTTON=PASS');
console.log('A213_SERVER_BUDGET_CONSUMED_OR_EXPIRED_HIDE_BUTTON=PASS');
console.log('A213_HEALTH_ERRORS_IDENTITY_AND_ORIGIN_FAIL_CLOSED=PASS');
console.log('A213_PRODUCTION_MUTATION=NO');
