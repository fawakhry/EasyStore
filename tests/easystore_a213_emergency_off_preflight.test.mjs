import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderA213OffConfig } from '../scripts/a213-close-frontend-config.mjs';

const mainOff=fs.readFileSync('config.js','utf8');
const workflow=fs.readFileSync('.github/workflows/easystore-a213-emergency-off.yml','utf8');
assert.match(mainOff,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
assert.match(mainOff,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]/);
assert.match(mainOff,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.equal(renderA213OffConfig(mainOff),mainOff,'already-OFF main baseline must remain unchanged');
const simulated=mainOff
  .replace("EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'OFF'","EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'CANARY'")
  .replace("EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS = []","EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS = ['closePurchaseCustodyV1920']");
assert.equal(renderA213OffConfig(simulated),mainOff,'candidate restores byte-for-byte safe baseline');
assert.throws(()=>renderA213OffConfig(simulated.replace("D1_WRITES = false","D1_WRITES = true")),/A213_CLOSE_BLOCKED/);
assert.throws(()=>renderA213OffConfig(simulated.replace("['closePurchaseCustodyV1920']","['saveAccountingFinalInvoice']")),/A213_CLOSE_BLOCKED/);
assert.match(workflow,/workflow_dispatch:/);
assert.match(workflow,/github.ref == 'refs\/heads\/main'/);
assert.match(workflow,/inputs.confirmation == 'CLOSE_A213_OFF'/);
assert.match(workflow,/permissions:\n  contents: write/);
assert.match(workflow,/node scripts\/a213-close-frontend-config\.mjs --write config\.js/);
assert.match(workflow,/git push origin HEAD:refs\/heads\/main/);
assert.match(workflow,/A213_DEPLOYED_FRONTEND_OFF=PASS/);
assert.match(workflow,/A213_BACKEND_READONLY_AFTER_UI_CLOSE=/);
assert.doesNotMatch(workflow,/wrangler|INSERT INTO|UPDATE employee_accounting|mode='GENERAL'/i,'no finance DB mutation in the recovery');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'a213-off-main-'));
try {
  const file=path.join(tmp,'config.js');
  fs.writeFileSync(file,simulated);
  const denied=spawnSync(process.execPath,['scripts/a213-close-frontend-config.mjs',file],{encoding:'utf8'});
  assert.notEqual(denied.status,0,'explicit --write required');
  assert.equal(fs.readFileSync(file,'utf8'),simulated);
  const closed=spawnSync(process.execPath,['scripts/a213-close-frontend-config.mjs','--write',file],{encoding:'utf8'});
  assert.equal(closed.status,0,'synthetic closure succeeds: '+closed.stderr);
  assert.equal(fs.readFileSync(file,'utf8'),mainOff);
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
console.log('A213_SAFE_MAIN_OFF_BASELINE=PASS');
console.log('A213_EMERGENCY_OFF_MANUAL_GUARD=PASS');
console.log('A213_OFF_RESTORE_TOUCHED_PRODUCTION=NO');
