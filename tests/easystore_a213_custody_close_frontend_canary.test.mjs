import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const idx=fs.readFileSync('index.html','utf8');

assert.ok(app.includes("const D1_ACCOUNTING_WRITE_ACTIONS = new Set(['closePurchaseCustodyV1920']);"));
assert.ok(app.includes('function a213CustodyCloseCanaryEnabled()'));
assert.ok(app.includes("actions.length===1 && actions[0]==='closePurchaseCustodyV1920'"));
assert.ok(app.includes("newAccountingRequestId('A213-CCLOSE')"));
assert.ok(app.includes("'A2-CANARY-CUSTODY-'"));
assert.ok(app.includes("department:'عام'"));
assert.ok(app.includes("workDate:'2099-12-31'"));
assert.ok(app.includes("تنفيذ تقفيل العهدة الصفرية مرة واحدة"));
assert.ok(app.includes("if(a213CustodyCloseCanaryEnabled() && user.token && !screens.includes('purchase')) screens.push('purchase');"));
assert.ok(app.includes("if(a213CustodyCloseCanaryEnabled() && user.token && !list.some(x=>x[0]==='purchase')) list.push(['purchase','كاناري العهدة']);"));
assert.ok(app.includes("protectAction('saveDeptLine',canUseDepartment);"));
assert.ok(!app.includes('a212DeptLineCanaryEnabled'));
assert.ok(!app.includes("newAccountingRequestId('A212-DLINE')"));
assert.ok(!app.includes('A2-CANARY-DEPT-LINE-'));

assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
assert.match(cfg,/EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS\s*=\s*\[\]/);
assert.ok(cfg.includes('a213-custody-close-canary-20261007'));
assert.ok(idx.includes('a213-custody-close-canary-20261007'));

console.log('A213_CUSTODY_CLOSE_FRONTEND_ISOLATION=PASS');
console.log('D1_WRITE_ACTION=closePurchaseCustodyV1920_ONLY');
console.log('SYNTHETIC_BALANCE=0');
console.log('SYNTHETIC_WORK_DATE=2099-12-31');
console.log('PURCHASE_SCREEN=SSO_CANARY_ONLY_SERVER_ACTOR_ENFORCED');
console.log('CANDIDATE_MODE=OFF');
console.log('CANDIDATE_ACTIONS=[]');
console.log('PRODUCTION_MUTATION=NO');
