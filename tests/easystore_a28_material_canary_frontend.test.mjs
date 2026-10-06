import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.ok(app.includes("const D1_ACCOUNTING_WRITE_ACTIONS = new Set(['saveAccountingMaterial'])"));
assert.ok(app.includes('A28_ACCOUNTING_WRITE_ACTIONS_FAIL_CLOSED'));
for(const action of ['saveAccountingTemplate','recalcAccountingMaterialsCascade','saveAccountingFinalInvoice','saveEasyStorePurchaseV2','saveAccountingWaste']){
  assert.ok(app.includes("'"+action+"'"), 'missing fail-closed accounting action '+action);
}
assert.ok(app.includes('function a28MaterialCanaryEnabled()'));
assert.ok(app.includes("actions[0]==='saveAccountingMaterial'"));
assert.ok(app.includes('هذه الحركة خارج عائلة كاناري الخامة؛ تم منعها محليًا.'));
assert.ok(app.includes("materialName:'A2-CANARY-MATERIAL-'+Date.now()"));
assert.ok(app.includes("materialKind:'A2_CANARY'"));
assert.ok(app.includes("materialClass:'A2_CANARY'"));
assert.ok(app.includes("stockQty:0"));
assert.ok(app.includes("minStock:0"));
assert.ok(app.includes("unitCost:0"));
assert.ok(app.includes("computedUnitCost:0"));
assert.ok(app.includes("salePrice:0"));
assert.ok(app.includes("rawWidth:0"));
assert.ok(app.includes("rawHeight:0"));
assert.ok(app.includes("componentsJson:'[]'"));
assert.ok(app.includes("active:'لا'"));
assert.ok(app.includes("newAccountingRequestId('A28-MAT')"));
assert.ok(app.includes('A2.8 CANARY:'));
assert.ok(!app.includes('a27TemplateCanaryEnabled'));
assert.ok(!app.includes('A2-CANARY-TEMPLATE-'));

const rawStart=app.indexOf('    async saveRaw(){');
const rawEnd=app.indexOf('    editRaw(', rawStart);
assert.ok(rawStart>0&&rawEnd>rawStart);
const raw=app.slice(rawStart,rawEnd);
const canaryReturn=raw.indexOf("if(canary){ state.active='kitchen'; shell(); flash('تم تنفيذ A2.8 Canary");
const recalc=raw.indexOf("api('recalcAccountingMaterialsCascade'");
assert.ok(canaryReturn>=0&&recalc>canaryReturn,'canary must return before recalc/local normal path');

assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'CANARY'/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\['saveAccountingMaterial'\]/);
assert.match(cfg,/EASYSTORE_CACHE_TAG\s*=\s*'a28-material-canary-20261006'/);
assert.ok(index.includes("CACHE_TAG = 'a28-material-canary-20261006'"));
assert.ok(index.includes('config.js?v=a28-material-canary-20261006'));
assert.ok(index.includes('app.js?v=a28-material-canary-20261006'));

console.log('A28_MATERIAL_CANARY_FRONTEND=PASS');
console.log('A28_D1_WRITE_ACTION=saveAccountingMaterial');
console.log('A28_OTHER_ACCOUNTING_WRITES=FAIL_CLOSED');
console.log('A28_SYNTHETIC_MATERIAL=INACTIVE_ZERO_STOCK_ZERO_VALUE_NO_COMPONENTS');
console.log('A28_PRODUCTION_MUTATION=NO');
