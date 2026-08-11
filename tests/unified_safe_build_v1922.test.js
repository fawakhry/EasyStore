const assert = require('assert');
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
const easyApp = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const easyConfig = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const easyIndex = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function functionSource(name) {
  const start = code.search(new RegExp('^function\\s+' + name.replace(/[$]/g, '\\$&') + '\\s*\\(', 'm'));
  assert.ok(start >= 0, `missing function ${name}`);
  const open = code.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}' && --depth === 0) return code.slice(start, i + 1);
  }
  throw new Error(`unclosed function ${name}`);
}

const names = [...code.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
assert.deepStrictEqual([...new Set(duplicateNames)], [], 'backend must have one active declaration per function');
assert.match(code, /V1922_UNIFIED_SAFE_BUILD/);

const ai = functionSource('getAIOrderStatusV1891_');
assert.match(ai, /requestMethod[^\n]*!== "POST"/);
assert.match(ai, /AI_ORDER_LOOKUP_KEY/);
assert.match(ai, /p\.order_id/);
assert.match(ai, /getDisplayValues\(\)/);
assert.match(ai, /ai_reply/);
assert.doesNotMatch(ai, /cleanPhone_|customerName|p\.message|p\.name|p\.phone|rebuildAIOrdersView_/i);

assert.match(functionSource('passwordHashV1922_'), /1200/);
assert.match(functionSource('authorize_'), /sessionExpiredV1922_/);
assert.match(functionSource('customerAuthorize_'), /sessionExpiredV1922_/);
assert.match(functionSource('login_'), /expiresAt/);
assert.match(functionSource('customerLogin_'), /expiresAt/);
assert.match(functionSource('accountingCanSavePurchaseV1857_'), /auth\.mode === "full"/);
assert.doesNotMatch(functionSource('approveAccountingDeptInvoiceV1887_'), /mode === "final"/);
assert.match(functionSource('saveAccountingDeptLine_'), /getScriptLock/);
assert.match(functionSource('saveAccountingDeptLine_'), /duplicatePrevented/);
assert.match(functionSource('createManualOrder_'), /department === ['"]مكبس['"]/);
assert.match(functionSource('createManualOrder_'), /trendosV1922FindOpenOrder_/);
assert.match(functionSource('doPost'), /__returnRawV1922/);

assert.match(easyApp, /method:'POST'/);
assert.match(easyConfig, /ES47 V1922 Unified Safe Build/);
assert.match(easyIndex, /ES47 V1922 Unified Safe Build/);
assert.doesNotMatch(easyApp, /document\.createElement\(['"]script['"]\)/);
assert.doesNotMatch(easyApp, /searchParams\.set\([^\n]*(token|username)/);

console.log('EasyStore V1922 safe build security and workflow tests passed');
