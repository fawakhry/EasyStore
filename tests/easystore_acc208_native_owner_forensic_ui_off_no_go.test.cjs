const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const readSetSrc=app.match(/const D1_ACCOUNTING_READ_ACTIONS\s*=\s*new Set\((\[[^\]]*\])\)/);
const writeSetSrc=app.match(/const D1_ACCOUNTING_WRITE_ACTIONS\s*=\s*new Set\((\[[\s\S]*?\])\)/);
assert.ok(readSetSrc&&writeSetSrc,'actual read/write action dispatch sets required');
const getActions=t=>[...t.matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]);
const reads=getActions(readSetSrc[1]),writes=getActions(writeSetSrc[1]);
const optionalSet=app.match(/const ACC208_OPTIONAL_NATIVE_READ_ACTIONS\s*=\s*new Set\((\[[^\]]*\])\)/);
assert.ok(optionalSet,'source-only optional native finance readers missing');
const optional=getActions(optionalSet[1]);
assert.equal(reads.length,11,'original PINNED native D1 READ inventory must remain unchanged');
assert.equal(new Set(reads).size,reads.length,'no duplicate pinned D1 reader permissions');
for(const name of ['previewCustomerCreditLiabilityAuditV1','previewNativeInvoiceReturnExposureV1']){
  assert.ok(optional.includes(name),'new preview requires separate OFF-by-default D1 action set: '+name);
  assert.ok(!reads.includes(name),'do not drift the pinned native Worker read inventory: '+name);
  assert.ok(!writes.includes(name),'never classify forensic preview as financial write: '+name);
}
assert.equal(new Set(optional).size,2,'exact two optional native D1 reviews');
assert.match(app,/const optionalOwnerRead = window\.EASYSTORE_FINANCE_READONLY_REVIEW_V1 === true/);
assert.match(app,/D1_ACCOUNTING_READ_ACTIONS\.has\(actionName\) \|\| optionalOwnerRead/);
assert.match(cfg,/window\.EASYSTORE_FINANCE_READONLY_REVIEW_V1\s*=\s*false\s*;/,
  'independent owner review UI feature flag MUST default OFF');
const functionIndex=app.indexOf('function screenHealth(){');
assert.ok(functionIndex>0);
const healthBlock=app.slice(functionIndex,app.indexOf('\n  function isSharedDeptName(',functionIndex));
assert.match(healthBlock,/window\.EASYSTORE_FINANCE_READONLY_REVIEW_V1\s*===\s*true/);
assert.match(healthBlock,/window\.EASYSTORE_ACCOUNTING_D1_READONLY\s*===\s*true/);
assert.match(healthBlock,/isAdmin\(\)/);
assert.match(healthBlock,/id="acc208CustomerId"/);
assert.match(healthBlock,/id="acc208InvoiceNo"/);
assert.match(healthBlock,/id="acc208CustomerResult"/);
assert.match(healthBlock,/id="acc208InvoiceResult"/);
assert.doesNotMatch(healthBlock,/submit|payment_received|saveCustomerAccountMovement|refundEasyStoreSaleV2/);
const obj=app.indexOf('window.ES27 =');
assert.ok(obj>=0,'existing app actions required');
const reviewStart=app.indexOf('async acc208ReviewCustomerCredit()',obj);
const reviewEnd=app.indexOf('    health(){',reviewStart);
assert.ok(reviewStart>obj&&reviewEnd>reviewStart);
const controller=app.slice(reviewStart,reviewEnd);
assert.match(controller,/api\('previewCustomerCreditLiabilityAuditV1',\{customerId\}\)/);
assert.match(controller,/api\('previewNativeInvoiceReturnExposureV1',\{invoiceNo\}\)/);

assert.match(controller,/subsequentInvoiceReferenceCount/,
  'ACC209 later receipt references should be visible on the optional owner screen');
assert.match(controller,/NOT_AVAILABLE_ON_DEPLOYED_VERSION/,
  'old pinned Worker must show UNKNOWN, not a fabricated zero');
assert.match(controller,/referenceState==='REFERENCE_HISTORY_TOO_LARGE_UNKNOWN'/,
  'unbounded history should show UNKNOWN and never claim fully inspected');
assert.match(controller,/المرجع النصي ليس تخصيص سداد/,
  'confirmed collection text reference is not a binding to an invoice');

assert.match(controller,/\.textContent\s*=/,'safe text-only untrusted server response rendering required');
assert.doesNotMatch(controller,/(?:api\('(?:save|refund|return|reverse))|(?:\.innerHTML\s*=)/,
  'diagnostic controls must never post finance or inject backend HTML');
const routeBlock=app.slice(app.indexOf('async function api('),app.indexOf('function msg('));
assert.match(routeBlock,/if\(readActionRequested && window\.EASYSTORE_ACCOUNTING_D1_READONLY !== true\)/);
assert.match(routeBlock,/if\(useD1Accounting\)/);
const exposed=app.match(/window\.EASYSTORE_FINANCE_READONLY_REVIEW_V1\s*===\s*true/g)||[];
assert.ok(exposed.length>=2,'UI gate and both action gates should independently enforce OFF-by-default');
const full={window:{EASYSTORE_FINANCE_READONLY_REVIEW_V1:false,EASYSTORE_ACCOUNTING_D1_READONLY:true},
  isAdmin:()=>true};
assert.ok(vm.runInNewContext('Boolean(window.EASYSTORE_FINANCE_READONLY_REVIEW_V1 === true && window.EASYSTORE_ACCOUNTING_D1_READONLY === true && isAdmin())',full)===false);
full.window.EASYSTORE_FINANCE_READONLY_REVIEW_V1=true;
assert.ok(vm.runInNewContext('Boolean(window.EASYSTORE_FINANCE_READONLY_REVIEW_V1 === true && window.EASYSTORE_ACCOUNTING_D1_READONLY === true && isAdmin())',full)===true);
console.log('ACC208_ACTUAL_EASYSTORE_D1_FINANCE_READ_ACTIONS=YES');
console.log('ACC208_GUI_OWNER_GATE_DEFAULT_OFF=PASS');
console.log('ACC208_NO_FINANCE_WRITE_API_OR_FALLBACK=PASS');
console.log('ACC208_SERVER_RESPONSE_ESCAPES_HTML=TEXT_ONLY');
console.log('ACC208_FINANCE_RELEASE=NO_GO');
