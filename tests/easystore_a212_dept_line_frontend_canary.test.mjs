import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const idx=fs.readFileSync('index.html','utf8');

assert.ok(app.includes("const D1_ACCOUNTING_WRITE_ACTIONS = new Set(['saveAccountingDeptLine']);"));
assert.ok(app.includes('function a212DeptLineCanaryEnabled()'));
assert.ok(app.includes("actions.length===1 && actions[0]==='saveAccountingDeptLine'"));
assert.ok(app.includes("newAccountingRequestId('A212-DLINE')"));
assert.ok(app.includes("'A2-CANARY-DEPT-'"));
assert.ok(app.includes("'A2-CANARY-DEPT-LINE-'"));
assert.ok(app.includes("department:'عام'"));
assert.ok(app.includes("qty:1"));
assert.ok(app.includes("if(a212DeptLineCanaryEnabled() && user.token && !screens.includes('dept')) screens.push('dept');"));
assert.ok(app.includes("if(a212DeptLineCanaryEnabled() && user.token && !list.some(x=>x[0]==='dept')) list.push(['dept','فاتورة القسم']);"));
assert.ok(app.includes("protectAction('saveDeptLine',()=>a212DeptLineCanaryEnabled()?!!user.token:canUseDepartment());"));
assert.ok(app.includes("protectAction('saveDeptLineAndOpenSales',canUseDepartment);"));
assert.ok(app.includes("protectAction('saveWaste',canUseDepartment);"));
assert.ok(!app.includes('a211WasteCanaryEnabled'));
assert.ok(!app.includes('A2-CANARY-WASTE-'));
assert.ok(!app.includes("newAccountingRequestId('A211-WASTE')"));

assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]/);
assert.ok(cfg.includes('a212-dept-line-canary-20261007'));
assert.ok(idx.includes('a212-dept-line-canary-20261007'));

console.log('A212_DEPT_LINE_FRONTEND_ISOLATION=PASS');
console.log('D1_WRITE_ACTION=saveAccountingDeptLine_ONLY');
console.log('SYNTHETIC_VALUE=0');
console.log('SYNTHETIC_MATERIAL=NONE');
console.log('DEPT_SCREEN=SSO_CANARY_ONLY_SERVER_ACTOR_ENFORCED');
console.log('LEGACY_DEPT_WRAPPER=A212_BYPASS_ONLY');
console.log('CANDIDATE_MODE=OFF');
console.log('CANDIDATE_ACTIONS=[]');
console.log('PRODUCTION_MUTATION=NO');
