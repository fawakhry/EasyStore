const assert=require('assert');
const fs=require('fs');

const inventory=JSON.parse(fs.readFileSync('docs/EASYSTORE_ZERO_GOOGLE_ACTION_INVENTORY_20261004.json','utf8'));
const model=JSON.parse(fs.readFileSync('docs/ACCOUNTING_READ_MODEL_V1.json','utf8'));

assert.equal(model.version,'ACCOUNTING_READ_MODEL_V1');
assert.equal(model.phase,'A1');
assert.equal(model.authority,'D1');
assert.equal(model.rules.googleBusinessReadsAllowedAtExit,false);
assert.equal(model.rules.directSpreadsheetReadsAllowedAtExit,false);
assert.equal(model.rules.aiDirectDatabaseAccess,false);
assert.equal(model.rules.stableEntityIdsRequired,true);

const literalReads=inventory.appLiteralApiActions
  .filter(x=>String(x.kind).startsWith('read'))
  .map(x=>x.action)
  .sort();
const modeled=model.actions.map(x=>x.action).sort();

for(const action of literalReads){
  assert.ok(modeled.includes(action),'missing read action: '+action);
}
for(const row of model.actions){
  assert.equal(row.target,'D1','non-D1 target: '+row.action);
  assert.ok(!/google|sheet|apps-script/i.test(String(row.target)),'legacy target: '+row.action);
}
assert.equal(model.exitCriteria.appsScriptAccountingReads,0);
assert.equal(model.exitCriteria.googleBusinessReads,0);
assert.equal(model.exitCriteria.frontendReadActionsD1Only,true);

for(const action of ['getCustomerAccountV1915','getEasyStoreCustomers','searchCustomers','easyStoreSystemHealth']){
  const row=model.actions.find(x=>x.action===action);
  assert.ok(row,'missing '+action);
  assert.equal(row.status,'A1_CORE_IMPLEMENT');
}
console.log('ACCOUNTING_READ_MODEL_V1=PASS');
console.log('LEGACY_LITERAL_READ_ACTIONS_COVERED='+literalReads.length);
console.log('TARGET_AUTHORITY=D1');
console.log('TARGET_APPS_SCRIPT_ACCOUNTING_READS=0');
console.log('TARGET_GOOGLE_BUSINESS_READS=0');
