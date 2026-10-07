import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const idx=fs.readFileSync('index.html','utf8');

assert.ok(app.includes("const D1_ACCOUNTING_WRITE_ACTIONS = new Set(['saveAccountingWaste']);"));
assert.ok(app.includes('function a211WasteCanaryEnabled()'));
assert.ok(app.includes("actions.length===1 && actions[0]==='saveAccountingWaste'"));
assert.ok(app.includes("A2-CANARY-WASTE-"));
assert.ok(app.includes("newAccountingRequestId('A211-WASTE')"));
assert.ok(app.includes("department:'عام'"));
assert.ok(app.includes("reason:'A2_CANARY'"));
assert.ok(app.includes("amount:0.01"));
assert.ok(app.includes("paid:0"));
assert.ok(app.includes("if(!isAdmin()) return deny('A2.11 Waste Canary متاح لضياء فقط.')"));
assert.ok(app.includes("concat(a211WasteCanaryEnabled()?['waste']:[])"));
assert.ok(app.includes("else if(/waste|هالك/.test(s)) requested = 'waste';"));
assert.ok(app.includes("if(reply.stockBefore!==null||reply.stockAfter!==null)"));
assert.ok(!app.includes('a210SupplierCanaryEnabled'));
assert.ok(!app.includes('A2-CANARY-SUPPLIER-'));
assert.ok(!app.includes("newAccountingRequestId('A210-SUP')"));

assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]/);
assert.ok(cfg.includes("a211-waste-canary-20261007"));
assert.ok(idx.includes("a211-waste-canary-20261007"));

console.log('A211_WASTE_FRONTEND_ISOLATION=PASS');
console.log('D1_WRITE_ACTION=saveAccountingWaste_ONLY');
console.log('SYNTHETIC_AMOUNT=0.01');
console.log('SYNTHETIC_MATERIAL=NONE');
console.log('ADMIN_WASTE_SCREEN=CANARY_ONLY');
console.log('CANDIDATE_MODE=OFF');
console.log('CANDIDATE_ACTIONS=[]');
console.log('PRODUCTION_MUTATION=NO');
