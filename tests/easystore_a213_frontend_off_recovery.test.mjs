import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderA213OffConfig } from '../scripts/a213-close-frontend-config.mjs';

const staging=fs.readFileSync('config.js','utf8');
const mainSafeTemplate=staging
  .replace("window.EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'CANARY';","window.EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'OFF';")
  .replace("window.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS = ['closePurchaseCustodyV1920'];","window.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS = [];");
assert.match(staging,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'CANARY'/);
const closed=renderA213OffConfig(staging);
assert.equal(closed,mainSafeTemplate,'only intended finance flags may change during OFF restore');
assert.equal(renderA213OffConfig(closed),closed,'second rollback is idempotent');
assert.match(closed,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
assert.match(closed,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(closed,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
assert.match(closed,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]/);

for(const bad of [
  staging.replace("EASYSTORE_ACCOUNTING_D1_WRITES = false","EASYSTORE_ACCOUNTING_D1_WRITES = true"),
  staging.replace("['closePurchaseCustodyV1920']","['saveAccountingFinalInvoice']"),
  staging.replace("'CANARY'","'GENERAL'"),
  staging+"\nwindow.EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'CANARY';\n",
]) assert.throws(()=>renderA213OffConfig(bad),/A213_CLOSE_BLOCKED/,'unexpected financial state must require operator review');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a213-close-off-'));
try{
  const testConfig=path.join(dir,'config.js');
  fs.writeFileSync(testConfig,staging,'utf8');
  const fileBefore=fs.readFileSync(testConfig,'utf8');
  const noFlag=spawnSync(process.execPath,['scripts/a213-close-frontend-config.mjs',testConfig],{encoding:'utf8'});
  assert.notEqual(noFlag.status,0,'no silent writes without --write');
  assert.equal(fs.readFileSync(testConfig,'utf8'),fileBefore);
  const closing=spawnSync(process.execPath,['scripts/a213-close-frontend-config.mjs','--write',testConfig],{encoding:'utf8'});
  assert.equal(closing.status,0,'exact isolated candidate can close: '+closing.stderr);
  assert.match(closing.stdout,/A213_FRONTEND_OFF_CONFIRMED=PASS/);
  assert.equal(fs.readFileSync(testConfig,'utf8'),closed);
  const repeat=spawnSync(process.execPath,['scripts/a213-close-frontend-config.mjs','--write',testConfig],{encoding:'utf8'});
  assert.equal(repeat.status,0,'closing twice is safe');
  assert.equal(fs.readFileSync(testConfig,'utf8'),closed);
} finally {
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log('A213_ROLLBACK_OFF_TRANSFORM_TEST=PASS');
console.log('A213_ROLLBACK_EXPLICIT_WRITE_ONLY=PASS');
console.log('A213_ROLLBACK_UNEXPECTED_MODES_FAIL_CLOSED=PASS');
console.log('A213_ROLLBACK_RUNTIME_PRODUCTION_MODIFICATIONS=NO');
