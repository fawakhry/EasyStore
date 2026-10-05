const assert=require('assert');
const fs=require('fs');

const inventory=JSON.parse(fs.readFileSync('docs/EASYSTORE_ZERO_GOOGLE_ACTION_INVENTORY_20261004.json','utf8'));
const model=JSON.parse(fs.readFileSync('docs/ACCOUNTING_WRITE_MODEL_V1.json','utf8'));

assert.equal(model.version,'ACCOUNTING_WRITE_MODEL_V1');
assert.equal(model.phase,'A2');
assert.equal(model.authority,'D1_DETERMINISTIC');
assert.equal(model.principles.googleBusinessWritesAllowedAtExit,false);
assert.equal(model.principles.appsScriptFinancialWriteAuthorityAtExit,0);
assert.equal(model.principles.directAiDatabaseWrite,false);
assert.equal(model.principles.directConnectorDatabaseWrite,false);
assert.equal(model.principles.destructiveFinancialDelete,false);
assert.equal(model.principles.reversalInsteadOfDelete,true);

const expected=[...new Set(inventory.appLiteralApiActions
  .filter(x=>!String(x.kind||'').startsWith('read'))
  .map(x=>x.action))].sort();
const modeled=model.actions.map(x=>x.action).sort();

for(const action of expected) assert.ok(modeled.includes(action),'unclassified active write: '+action);
for(const row of model.actions){
  assert.ok(['D1','D1_TOOLS','RETIRED'].includes(row.target),'invalid target '+row.action);
  if(row.target!=='RETIRED'){
    assert.ok(row.idempotency,'idempotency rule missing '+row.action);
    assert.ok(!/google|sheet|apps-script/i.test(row.target),'legacy target '+row.action);
  }
}
for(const row of model.actions.filter(x=>x.class==='reversal')){
  assert.ok(/REVERSAL|reversal|reverse|REVERSED/i.test(JSON.stringify(row)),'reversal semantics missing '+row.action);
}

assert.equal(model.exitCriteria.everyActiveWriteClassified,true);
assert.equal(model.exitCriteria.appsScriptFinancialWriteAuthority,0);
assert.equal(model.exitCriteria.googleBusinessWrites,0);
assert.equal(model.exitCriteria.allFinancialWritesIdempotent,true);
assert.equal(model.exitCriteria.allFinancialWritesAudited,true);

console.log('ACCOUNTING_WRITE_MODEL_V1=PASS');
console.log('ACTIVE_NONREAD_ACTIONS='+expected.length);
console.log('CLASSIFIED_WRITE_ACTIONS='+model.actions.length);
console.log('TARGET_APPS_SCRIPT_FINANCIAL_WRITE_AUTHORITY=0');
console.log('TARGET_GOOGLE_BUSINESS_WRITES=0');
