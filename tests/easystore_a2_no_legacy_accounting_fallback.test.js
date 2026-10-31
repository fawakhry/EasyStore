const assert=require('assert');
const fs=require('fs');

const app=fs.readFileSync('app.js','utf8');
const literal=[...app.matchAll(/\bapi\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
const all=[...new Set(literal)].sort();

function setFrom(name){
  const re=new RegExp('const '+name+'\\s*=\\s*new Set\\((\\[[\\s\\S]*?\\])\\);');
  const m=app.match(re);
  assert.ok(m,name+' missing');
  return new Set([...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]));
}
const reads=setFrom('D1_ACCOUNTING_READ_ACTIONS');
const writes=setFrom('D1_ACCOUNTING_WRITE_ACTIONS');
const optionalWrites=setFrom('ACC269_OPTIONAL_NATIVE_WRITE_ACTIONS');
const openingDraftWrites=setFrom('ACC278_OPTIONAL_DRAFT_WRITE_ACTIONS');
const openingDraftReads=setFrom('ACC278_OPTIONAL_DRAFT_READ_ACTIONS');
const retired=setFrom('RETIRED_ACCOUNTING_ACTIONS');

// The legacy worker inventory remains exactly 21; new customer creation is
// available only with its separate, default-OFF, D1-only feature gate.
assert.equal(writes.size,21,'pinned original finance write inventory must not change');
assert.deepEqual([...optionalWrites],['saveEasyStoreCustomer']);
assert.deepEqual([...openingDraftWrites],['saveEasyStoreOpeningDraftV1']);
assert.deepEqual([...openingDraftReads],['getEasyStoreOpeningDraftV1']);
assert.match(fs.readFileSync('config.js','utf8'),/window\.EASYSTORE_OPENING_DRAFT_INTAKE_V1\s*=\s*false/);
assert.match(app,/openingDraftWrite && configuredWriteMode !== 'OFF'/);
assert.match(app,/const useD1DraftWrite = \(openingDraftWrite\|\|draftSupplierMasterIntake\) && configuredWriteMode==='OFF'/);
assert.match(app,/draftSupplierMasterIntake = actionName==='saveEasyStoreSupplier'/);
assert.match(fs.readFileSync('config.js','utf8'),/window\.EASYSTORE_STANDALONE_CUSTOMERS_V1\s*=\s*false/);
assert.match(app,/if\(standaloneCustomerAction && window\.EASYSTORE_STANDALONE_CUSTOMERS_V1 !== true\)/);
assert.match(app,/D1_ACCOUNTING_WRITE_ACTIONS\.has\(actionName\) \|\| standaloneCustomerAction/);

assert.deepEqual([...retired].sort(),[
  'applySuggestedLegacyClassificationsV1921',
  'classifyLegacyAccountingRowV1920',
  'reconcileLegacyCustomerDebtsV1914'
].sort());

const unrouted=all.filter(x=>!reads.has(x)&&!writes.has(x)&&!optionalWrites.has(x)&&!openingDraftWrites.has(x)&&!openingDraftReads.has(x)&&!retired.has(x));
assert.deepEqual(unrouted,[],'all literal accounting api actions must be D1 or retired');

const apiStart=app.indexOf('async function api(');
const legacyStart=app.indexOf("const endpoint=String(window.MATBAGY_SECURE_API_PROXY_URL||window.TREND_API_URL||'').trim();",apiStart);
assert.ok(apiStart>=0&&legacyStart>apiStart);
const beforeLegacy=app.slice(apiStart,legacyStart);
assert.ok(beforeLegacy.includes('RETIRED_ACCOUNTING_ACTIONS.has(actionName)'));
assert.ok(beforeLegacy.indexOf('RETIRED_ACCOUNTING_ACTIONS.has(actionName)')<beforeLegacy.indexOf('const useD1Read'));

console.log('EASYSTORE_A2_ACCOUNTING_ACTION_COVERAGE=PASS');
console.log('ACCOUNTING_LITERAL_ACTIONS='+all.length);
console.log('D1_READ_ACTIONS='+reads.size);
console.log('D1_WRITE_ACTIONS='+writes.size);
console.log('RETIRED_ACTIONS='+retired.size);
console.log('LEGACY_ACCOUNTING_FALLBACK_ACTIONS=0');
