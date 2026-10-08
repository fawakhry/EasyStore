import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {requireBoundedCustodyHealth,readPlatform,executeZeroCustody} from '../scripts/easystore-platform.mjs';

const now=1000000;
const health={mode:'CANARY',writeAuthorityMode:'CANARY_BOUNDED',authoritativeWrites:true,writeCanaryAllowedUserCount:1,writeCanaryAllowedActionCount:1,writeCanaryMaxAmount:0,writeCanaryMaxCommands:1,writeCanaryCommandsStarted:0,writeCanaryExpiresAtMs:now+900000};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'easystore-api-test-'));
let writes=0;
try {
  assert.throws(()=>readPlatform('closePurchaseCustodyV1920',{},'local-test',()=>{writes++;}),/approved read/);
  assert.throws(()=>readPlatform('getAccounting',{},'',()=>{writes++;}),/Missing secure binding/);
  for(const change of [{mode:'GENERAL'},{mode:'READONLY'},{writeCanaryCommandsStarted:1},{writeCanaryMaxCommands:2},{writeCanaryMaxAmount:1},{writeCanaryExpiresAtMs:now},{writeCanaryExpiresAtMs:now+900001}]) {
    assert.throws(()=>requireBoundedCustodyHealth({...health,...change},now));
    const stateFile=path.join(dir,'blocked-'+Math.random()+'.json');
    assert.throws(()=>executeZeroCustody({token:'local-test',stateFile,now,request:action=>{if(action)writes++;return {...health,...change};}}));
    assert.equal(fs.existsSync(stateFile),false);
  }
  assert.equal(writes,0,'invalid scope must never send a financial POST');
  const stateFile=path.join(dir,'unknown.json');
  assert.throws(()=>executeZeroCustody({token:'local-test',stateFile,now,request:action=>{if(!action)return health;writes++;throw Error('simulated transport loss');}}),/transport loss/);
  assert.equal(writes,1);
  assert.throws(()=>executeZeroCustody({token:'local-test',stateFile,now,request:()=>{writes++;}}),/prior attempt/);
  assert.equal(writes,1,'unknown outcomes must not be resubmitted');
  assert.ok(!fs.readFileSync(stateFile,'utf8').includes('local-test'),'session credential must not enter state files');
  const successFile=path.join(dir,'success.json');
  const response=executeZeroCustody({token:'local-test',stateFile:successFile,now,request:(action,payload)=>{
    if(!action)return health;
    assert.equal(action,'closePurchaseCustodyV1920');
    assert.match(payload.requestId,/^A213-CCLOSE-/);assert.match(payload.employee,/^A2-CANARY-CUSTODY-/);
    assert.equal(payload.department,'عام');assert.equal(payload.workDate,'2099-12-31');
    assert.deepEqual(Object.keys(payload).sort(),['department','employee','requestId','workDate']);
    return {success:true,closeId:'LOCAL-ONLY',balanceBefore:0,settlementType:'NONE',settlementAmount:0,balanceAfter:0};
  }});
  assert.equal(response.status,'AWAITING_D1_AUDIT');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
console.log('PLATFORM_CONNECTION_SAFETY=PASS: read whitelist, bounded scope, durable unknown outcome, no token persistence, no automatic retry');
