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
const retired=setFrom('RETIRED_ACCOUNTING_ACTIONS');

assert.deepEqual([...retired].sort(),[
  'applySuggestedLegacyClassificationsV1921',
  'classifyLegacyAccountingRowV1920',
  'reconcileLegacyCustomerDebtsV1914'
].sort());

const unrouted=all.filter(x=>!reads.has(x)&&!writes.has(x)&&!retired.has(x));
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
