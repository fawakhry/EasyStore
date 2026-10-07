import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');

assert.ok(app.includes("const D1_ACCOUNTING_WRITE_ACTIONS = new Set(['saveEasyStoreSupplier']);"));
assert.ok(app.includes('function a210SupplierCanaryEnabled()'));
assert.ok(app.includes("newAccountingRequestId('A210-SUP')"));
assert.ok(app.includes("'A2-CANARY-SUPPLIER-'"));
assert.ok(/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/.test(cfg));
assert.ok(/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/.test(cfg));
assert.ok(/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'CANARY'/.test(cfg));
assert.ok(/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\s*'saveEasyStoreSupplier'\s*\]/.test(cfg));
assert.ok(!/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[[^\]]*,/.test(cfg));

console.log('A210_SUPPLIER_ACTIVATION_CANDIDATE=PASS');
console.log('A210_FRONTEND_MODE=CANARY');
console.log('A210_FRONTEND_ACTION_COUNT=1');
console.log('A210_FRONTEND_ACTION=saveEasyStoreSupplier');
console.log('A210_LEGACY_D1_WRITES=false');
console.log('A210_D1_READONLY=true');
console.log('PRODUCTION_DEPLOY=NO');
