const assert=require('assert');
const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const config=fs.readFileSync('config.js','utf8');
const model=JSON.parse(fs.readFileSync('docs/ACCOUNTING_WRITE_MODEL_V1.json','utf8'));

const m=app.match(/const D1_ACCOUNTING_WRITE_ACTIONS\s*=\s*new Set\((\[[\s\S]*?\])\);/);
assert.ok(m,'D1 write set missing');
const routed=[...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);
const routedSet=new Set(routed);

const active=model.actions.filter(x=>x.target!=='RETIRED').map(x=>x.action);
assert.equal(active.length,21,'unexpected active write count');
for(const action of active) assert.ok(routedSet.has(action),'active write not D1-routable: '+action);
assert.equal(routedSet.size,21,'unexpected D1 write route count');

assert.match(config,/window\.EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false\s*;/);
assert.match(config,/window\.EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'\s*;/);
assert.match(config,/window\.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]\s*;/);
assert.match(app,/const configuredWriteMode\s*=\s*String\(window\.EASYSTORE_ACCOUNTING_D1_WRITE_MODE/);
assert.match(app,/configuredWriteMode === 'CANARY'/);
assert.match(app,/configuredCanaryActions\.has\(actionName\)/);
assert.match(app,/هذه الحركة خارج نطاق كاناري الحسابات المسموح/);
assert.match(app,/const useD1Write\s*=\s*writeActionRequested/);
assert.match(app,/const useD1Accounting\s*=\s*useD1Read \|\| useD1Write/);

const apiStart=app.indexOf('async function api(');
const legacyStart=app.indexOf("const endpoint=String(window.MATBAGY_SECURE_API_PROXY_URL||window.TREND_API_URL||'').trim();",apiStart);
assert.ok(apiStart>=0 && legacyStart>apiStart,'API branches missing');
const d1Branch=app.slice(apiStart,legacyStart);
assert.ok(d1Branch.includes('if(useD1Accounting)'),'D1 accounting branch missing');
assert.ok(d1Branch.includes("Authorization':'Bearer '+user.token"),'D1 bearer auth missing');
assert.ok(d1Branch.includes('return parsed;'),'D1 branch must terminate on D1 result');
assert.ok(!d1Branch.includes('TREND_API_URL'),'D1 branch must not contain Apps Script endpoint');
assert.ok(!d1Branch.includes('MATBAGY_SECURE_API_PROXY_URL'),'D1 branch must not contain legacy proxy');

for(const marker of [
  "newAccountingRequestId('SUP')",
  "newAccountingRequestId('MAT')",
  "newAccountingRequestId('TPL')",
  "newAccountingRequestId('TPL-ARCH')",
  "newAccountingRequestId('RECALC')",
  'state.deptApprovalRequestId',
  "stableAccountingRequestId('DPP-REJECT'",
  "stableAccountingRequestId('PUR-REV'",
  "stableAccountingRequestId('FINAL-REOPEN'",
  'state.wasteRequestId'
]) assert.ok(app.includes(marker),'missing idempotency marker: '+marker);

console.log('EASYSTORE_A2_WRITE_ROUTER_SOURCE=PASS');
console.log('D1_WRITE_ACTION_COUNT='+routedSet.size);
console.log('D1_WRITE_FLAG_DEFAULT=false');
console.log('D1_WRITE_MODE_DEFAULT=OFF');
console.log('D1_WRITE_CANARY_ACTIONS_DEFAULT=EMPTY');
console.log('D1_WRITE_CANARY_FRONTEND_FAIL_CLOSED=YES');
console.log('D1_WRITE_SILENT_LEGACY_FALLBACK=NO');
console.log('WRITE_REQUEST_ID_MARKERS=PASS');
console.log('PRODUCTION_MUTATION=NO');
