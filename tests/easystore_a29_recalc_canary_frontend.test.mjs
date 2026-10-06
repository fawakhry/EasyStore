import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.ok(app.includes("const D1_ACCOUNTING_WRITE_ACTIONS = new Set(['recalcAccountingMaterialsCascade'])"));
assert.ok(app.includes('A29_ACCOUNTING_WRITE_ACTIONS_FAIL_CLOSED'));
for(const action of ['saveAccountingMaterial','saveAccountingTemplate','archiveAccountingTemplate','saveAccountingFinalInvoice','saveEasyStorePurchaseV2','saveAccountingWaste']){
  assert.ok(app.includes("'"+action+"'"), 'missing fail-closed accounting action '+action);
}
assert.ok(app.includes('function a29RecalcCanaryEnabled()'));
assert.ok(app.includes("actions[0]==='recalcAccountingMaterialsCascade'"));
assert.ok(app.includes('هذه الحركة خارج عائلة كاناري إعادة الحساب؛ تم منعها محليًا.'));
assert.ok(app.includes("requestId:newAccountingRequestId('A29-RECALC')"));
assert.ok(app.includes("Number(reply.materialCount||0)!==0"));
assert.ok(app.includes("Number(reply.templateCount||0)!==0"));
assert.ok(app.includes("Number(reply.changedMaterials||0)!==0"));
assert.ok(app.includes("Number(reply.changedTemplates||0)!==0"));
assert.ok(app.includes('A2.9 CANARY:'));
assert.ok(!app.includes('a28MaterialCanaryEnabled'));
assert.ok(!app.includes('A2-CANARY-MATERIAL-'));

const recalcStart=app.indexOf('    async recalcCascade(){');
const recalcEnd=app.indexOf('    applyDeptItem(',recalcStart);
assert.ok(recalcStart>0&&recalcEnd>recalcStart);
const recalc=app.slice(recalcStart,recalcEnd);
assert.ok(recalc.indexOf("if(a29RecalcCanaryEnabled())")>=0);
assert.ok(recalc.indexOf("return;")>recalc.indexOf("requestId:newAccountingRequestId('A29-RECALC')"));
assert.ok(recalc.indexOf("recalcTemplatesLocal()")>recalc.indexOf("return;"),'local normal recalc must be after canary return');

assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'CANARY'/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\['recalcAccountingMaterialsCascade'\]/);
assert.match(cfg,/EASYSTORE_CACHE_TAG\s*=\s*'a29-recalc-canary-20261007'/);
assert.ok(index.includes("CACHE_TAG = 'a29-recalc-canary-20261007'"));
assert.ok(index.includes('config.js?v=a29-recalc-canary-20261007'));
assert.ok(index.includes('app.js?v=a29-recalc-canary-20261007'));

console.log('A29_RECALC_CANARY_FRONTEND=PASS');
console.log('A29_D1_WRITE_ACTION=recalcAccountingMaterialsCascade');
console.log('A29_OTHER_ACCOUNTING_WRITES=FAIL_CLOSED');
console.log('A29_RECALC_REQUEST_ID=YES');
console.log('A29_RECALC_ZERO_RESULT_REQUIRED=YES');
console.log('A29_PRODUCTION_MUTATION=NO');
