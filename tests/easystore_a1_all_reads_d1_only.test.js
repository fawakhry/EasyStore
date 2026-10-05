const assert=require('assert');
const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const inventory=JSON.parse(fs.readFileSync('docs/EASYSTORE_ZERO_GOOGLE_ACTION_INVENTORY_20261004.json','utf8'));
const model=JSON.parse(fs.readFileSync('docs/ACCOUNTING_READ_MODEL_V1.json','utf8'));

const m=app.match(/const D1_ACCOUNTING_READ_ACTIONS\s*=\s*new Set\((\[[^\]]*\])\)/);
assert.ok(m,'D1 read set missing');
const routed=[...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);
const routedSet=new Set(routed);

const literalReads=[...new Set(
  inventory.appLiteralApiActions
    .filter(x=>String(x.kind||'').startsWith('read'))
    .map(x=>x.action)
)];
for(const action of literalReads){
  assert.ok(routedSet.has(action),'legacy literal accounting read still not D1-routed: '+action);
}
for(const row of model.actions){
  assert.equal(row.target,'D1','read model target drift: '+row.action);
  assert.ok(routedSet.has(row.action),'modeled accounting read not routed: '+row.action);
}
for(const action of [
  'getAccounting','getDeptInvoiceDraftV1887','getPartyAccountV1858',
  'getCustomerAccountV1915','getEasyStoreCustomers','searchCustomers',
  'getEasyStoreSuppliers','easyStoreSystemHealth','calculateAccountingLaserQuoteV1913',
  'getDailyDepartmentReportV1920','previewAccountingAutomationV1921'
]) assert.ok(routedSet.has(action),action);

const apiBlock=app.slice(app.indexOf('async function api('),app.indexOf('function msg('));
assert.ok(apiBlock.includes('if(useD1Read)'));
assert.ok(apiBlock.includes("Authorization':'Bearer '+user.token"));
const d1Start=apiBlock.indexOf('if(useD1Read){');
const legacyStart=apiBlock.indexOf("const endpoint=String(window.MATBAGY_SECURE_API_PROXY_URL||window.TREND_API_URL||'').trim();");
assert.ok(d1Start>=0 && legacyStart>d1Start,'D1 and legacy branches missing');
const d1Branch=apiBlock.slice(d1Start,legacyStart);
assert.ok(d1Branch.includes('return parsed;'),'D1 branch must return its own result');
assert.ok(!d1Branch.includes('TREND_API_URL'),'D1 read branch must not contain Apps Script endpoint');
assert.ok(!d1Branch.includes('MATBAGY_SECURE_API_PROXY_URL'),'D1 read branch must not contain legacy proxy');


console.log('EASYSTORE_A1_ALL_ACCOUNTING_READS_D1_ONLY_SOURCE=PASS');
console.log('D1_MODELED_READ_ACTIONS='+model.actions.length);
console.log('D1_ROUTED_READ_ACTIONS='+routedSet.size);
console.log('LITERAL_ACCOUNTING_READS_COVERED='+literalReads.length);
console.log('SILENT_GOOGLE_READ_FALLBACK=NO');
console.log('PRODUCTION_MUTATION=NO');
