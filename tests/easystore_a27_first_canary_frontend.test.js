const assert=require('assert');
const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const config=fs.readFileSync('config.js','utf8');

assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'CANARY'/);
assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\['saveAccountingTemplate'\]/);

const m=app.match(/const D1_ACCOUNTING_WRITE_ACTIONS\s*=\s*new Set\((\[[\s\S]*?\])\);/);
assert.ok(m,'write action set missing');
const actions=[...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);
assert.deepEqual(actions,['saveAccountingTemplate']);

assert.ok(app.includes("return mode==='CANARY' && actions.length===1 && actions[0]==='saveAccountingTemplate'"));
assert.ok(app.includes("!['LEGACY','CANARY'].includes(writeMode)"));
assert.ok(app.includes("const useD1Write = writeActionRequested && writeMode==='CANARY' && a27TemplateCanaryEnabled()"));
assert.ok(app.includes("if(useD1Accounting)"));
assert.ok(app.includes("Authorization':'Bearer '+user.token"));
assert.ok(app.includes("return parsed;"));

assert.ok(app.includes("itemName:'A2-CANARY-TEMPLATE-'+Date.now()"));
assert.ok(app.includes("category:'A2_CANARY'"));
assert.ok(app.includes("salePrice:0"));
assert.ok(app.includes("fixedCost:0"));
assert.ok(app.includes("computedUnitCost:0"));
assert.ok(app.includes("active:'لا'"));
assert.ok(app.includes("requestId:newAccountingRequestId('A27-TPL')"));
assert.ok(app.includes("Template اختبار غير نشط وبقيمة صفر"));

assert.ok(!config.includes("EASYSTORE_ACCOUNTING_D1_WRITE_MODE = 'GENERAL'"));
assert.ok(!app.includes("writeMode==='GENERAL'"));

console.log('A27_FIRST_CANARY_FRONTEND_SOURCE=PASS');
console.log('D1_WRITE_ACTION_COUNT=1');
console.log('D1_WRITE_ACTION=saveAccountingTemplate');
console.log('SYNTHETIC_TEMPLATE_INACTIVE=YES');
console.log('SYNTHETIC_TEMPLATE_ZERO_VALUE=YES');
console.log('GENERAL_FRONTEND_MODE=NO');
console.log('PRODUCTION_MUTATION=NO');
