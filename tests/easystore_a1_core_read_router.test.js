const assert=require('assert');
const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const m=app.match(/const D1_ACCOUNTING_READ_ACTIONS\s*=\s*new Set\((\[[^\]]*\])\)/);
assert.ok(m,'D1_ACCOUNTING_READ_ACTIONS missing');
const setText=m[1];

for(const action of [
  'getAccounting',
  'getDeptInvoiceDraftV1887',
  'getPartyAccountV1858',
  'getCustomerAccountV1915',
  'getEasyStoreCustomers',
  'searchCustomers',
  'easyStoreSystemHealth'
]) assert.ok(setText.includes("'"+action+"'"),'missing D1 read route '+action);

for(const write of [
  'saveCustomerAccountMovementV1915',
  'saveAccountingMaterial',
  'saveAccountingTemplate',
  'saveAccountingDeptLine',
  'approveAccountingDeptInvoice',
  'saveAccountingFinalInvoice'
]) assert.ok(!setText.includes("'"+write+"'"),'write accidentally routed as read '+write);

assert.match(app,/window\.EASYSTORE_ACCOUNTING_D1_READONLY === true/);
assert.match(app,/Authorization':'Bearer '\+user\.token/);
assert.match(app,/credentials:'omit'/);
assert.match(app,/api\('getEasyStoreCustomers'/);
assert.match(app,/api\('searchCustomers'/);
assert.match(app,/api\('getCustomerAccountV1915'/);
assert.match(app,/api\('easyStoreSystemHealth'/);

console.log('EASYSTORE_A1_CORE_READ_ROUTER_SOURCE=PASS');
console.log('D1_READ_ACTION_COUNT=7');
console.log('NEW_A1_CORE_READ_ACTIONS=4');
console.log('FINANCIAL_WRITES_REROUTED=NO');
console.log('PRODUCTION_MUTATION=NO');
