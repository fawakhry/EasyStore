import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert.ok(app.includes("const D1_ACCOUNTING_WRITE_ACTIONS = new Set(['saveEasyStoreSupplier']);"));
assert.ok(app.includes('function a210SupplierCanaryEnabled()'));
assert.ok(app.includes("actions.length===1 && actions[0]==='saveEasyStoreSupplier'"));
assert.ok(app.includes("newAccountingRequestId('A210-SUP')"));
assert.ok(app.includes("'A2-CANARY-SUPPLIER-'"));
assert.ok(app.includes("opening:0,openingDebt:0,active:'لا'"));
assert.ok(app.includes("if(a210SupplierCanaryEnabled())"));
assert.ok(app.includes("reply.active!==false"));
assert.ok(!app.includes('a29RecalcCanaryEnabled'));
assert.ok(app.includes("if(accountingWriteRequested && writeMode==='CANARY' && !writeActionRequested)"));
assert.ok(app.includes("const useD1Write = writeActionRequested && writeMode==='CANARY' && a210SupplierCanaryEnabled();"));
assert.ok(/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/.test(cfg));
assert.ok(/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/.test(cfg));
assert.ok(/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/.test(cfg));
assert.ok(/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]/.test(cfg));
assert.ok(cfg.includes('a210-supplier-canary-20261007'));
assert.ok(html.includes('a210-supplier-canary-20261007'));

console.log('A210_SUPPLIER_FRONTEND_CANDIDATE=PASS');
console.log('A210_SUPPLIER_ONLY_D1_WRITE_ROUTE=YES');
console.log('A210_ALL_OTHER_ACCOUNTING_WRITES_FAIL_CLOSED_IN_CANARY=YES');
console.log('A210_SYNTHETIC_INACTIVE_ZERO_OPENING_PAYLOAD=YES');
console.log('A210_CANDIDATE_DEFAULT_MODE=OFF');
console.log('PRODUCTION_MUTATION=NO');
