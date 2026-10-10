import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { renderA213OffConfig } from '../scripts/a213-close-frontend-config.mjs';

// Tests the ACTUAL emergency OFF workflow source, with a mocked backend health.
// The optional public files are GET-only snapshots. No dispatch, git push,
// CF credentials, financial POST or D1 mutation in this test.
const w=fs.readFileSync('.github/workflows/easystore-a213-emergency-off.yml','utf8');
const local=fs.readFileSync('config.js','utf8');
assert.equal(renderA213OffConfig(local),local);
assert.match(w,/on:\s*\n\s*workflow_dispatch:/);
assert.match(w,/github.ref == 'refs\/heads\/main'/);
assert.match(w,/inputs.confirmation == 'CLOSE_A213_OFF'/);
assert.match(w,/concurrency:\s*\n\s*group: easystore-a213-emergency-off-main/);
assert.match(w,/node scripts\/a213-close-frontend-config\.mjs --write config\.js/);
assert.match(w,/git push origin HEAD:refs\/heads\/main/);
assert.match(w,/if: always\(\)/,'backend safety verification must run on front-end restore failure');
assert.match(w,/A213_DEPLOYED_FRONTEND_OFF=PASS/);
assert.match(w,/A213_DEPLOYED_FRONTEND_OFF=UNKNOWN_RECONCILE_DEPLOYMENT/);
assert.doesNotMatch(w,/\b(?:wrangler|mode='GENERAL'|UPDATE employee_accounting|DELETE FROM employee_accounting|INSERT INTO employee_accounting)\b/i);
assert.ok(w.indexOf("node scripts/a213-close-frontend-config.mjs --write config.js") <
  w.indexOf("git push origin HEAD:refs/heads/main"));
const publicCheck=w.slice(w.indexOf("const s=fs.readFileSync('/tmp/a213-public-config.js'"),
  w.indexOf("A213_DEPLOYED_FRONTEND_OFF=PASS"));
for(const p of [
  'EASYSTORE_ACCOUNTING_D1_WRITE_MODE',
  'EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS',
  'EASYSTORE_ACCOUNTING_D1_WRITES',
  'EASYSTORE_ACCOUNTING_D1_READONLY'
]) assert.ok(publicCheck.includes(p),'public deployed frontend must prove '+p);
const begin=w.indexOf("const closed=h.success===true");
const end=w.indexOf("console.log('A213_BACKEND_READONLY_AFTER_UI_CLOSE=",begin);
assert.ok(begin>0&&end>begin,'backend health gate must be present in emergency rollback');
const checkBlock=w.slice(begin,end);
function closed(h){return vm.runInNewContext(checkBlock+'\nclosed',{h},{timeout:1500})===true;}
const safe={
  success:true,mode:'READONLY',authoritativeWrites:false,
  writeCanaryAllowedUserCount:0,writeCanaryAllowedActionCount:0,writeCanaryMaxAmount:0,
  writeCanaryMaxCommands:0,writeCanaryCommandsStarted:0,writeCanaryExpiresAtMs:0
};
assert.equal(closed(safe),true,'complete zeroed READONLY backend must be accepted');
for(const name of [
 'writeCanaryAllowedUserCount','writeCanaryAllowedActionCount','writeCanaryMaxAmount',
 'writeCanaryMaxCommands','writeCanaryCommandsStarted','writeCanaryExpiresAtMs'
]){
 assert.equal(closed({...safe,[name]:1}),false,'stale CANARY field should be blocked '+name);
 const without={...safe}; delete without[name];
 assert.equal(closed(without),false,'missing CANARY health field must fail closed '+name);
}
assert.equal(closed({...safe,mode:'CANARY'}),false);
assert.equal(closed({...safe,mode:'GENERAL'}),false);
assert.equal(closed({...safe,authoritativeWrites:true}),false);
assert.equal(closed({...safe,success:false}),false);
console.log('ACC173_EMERGENCY_OFF_MANUAL_CONFIRM_AND_MAIN_ONLY=PASS');
console.log('ACC173_EMERGENCY_OFF_SERVER_COMPLETE_ZERO_POLICY=PASS');
console.log('ACC173_EMERGENCY_OFF_MISSING_FIELDS_FAIL_CLOSED=PASS');
console.log('ACC173_EMERGENCY_OFF_PUBLISHED_OFF_READONLY_GUARD=PASS');
const [publicConfig,publicHealth]=process.argv.slice(2);
if(publicConfig||publicHealth){
 assert.ok(publicConfig&&publicHealth,'public GET config/health must be supplied together');
 const cfg=fs.readFileSync(publicConfig,'utf8');
 const h=JSON.parse(fs.readFileSync(publicHealth,'utf8'));
 assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
 assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
 assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
 assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]/);
 assert.equal(closed(h),true,'actual public backend health must reflect complete zeroed READONLY policy');
 console.log('ACC173_PUBLIC_OFF_AND_D1_ZERO_BUDGET_READONLY=PASS');
}
console.log('ACC173_ACTUAL_FRONTEND_ROLLBACK_DISPATCH=NOT_RUN');
console.log('ACC173_PRODUCTION_FINANCIAL_MUTATION=ZERO');
