const assert = require('assert');
const fs = require('fs');

const p = JSON.parse(fs.readFileSync('docs/ACCOUNTING_AGENT_POLICY_V1.json','utf8'));

assert.equal(p.version,'ACCOUNTING_AGENT_POLICY_V1');
assert.equal(p.status,'REPO_ONLY_DEFAULT_OFF');

assert.equal(p.principles.aiLedgerAuthority,false);
assert.equal(p.principles.directAiDatabaseWrite,false);
assert.equal(p.principles.deterministicEngineAuthority,true);
assert.equal(p.principles.idempotencyRequiredForWrites,true);
assert.equal(p.principles.evidenceRequiredForFinancialFacts,true);
assert.equal(p.principles.destructiveFinancialDeleteAllowed,false);

assert.equal(p.autonomy.defaultMode,'OBSERVE');
assert.deepEqual(p.autonomy.modes,['OFF','OBSERVE','RECOMMEND','APPROVAL','AUTO']);
assert.equal(p.autonomy.writesEnabled,false);
assert.equal(p.autonomy.maxAutoAmount,0);
assert.equal(p.autonomy.allowReversals,false);
assert.equal(p.autonomy.allowDayClose,false);
assert.equal(p.autonomy.allowSupplierPayment,false);
assert.equal(p.autonomy.allowCustomerAdjustment,false);

assert.equal(p.evidencePolicy.chatMessageAloneCanProvePayment,false);
assert.equal(p.evidencePolicy.aiInferenceAloneCanProveFinancialFact,false);

assert.equal(p.integrityEngine.required,true);
assert.equal(p.integrityEngine.onFailure,'FAIL_CLOSED_AND_RAISE_EXCEPTION');
assert.equal(p.integrityEngine.autoCorrectionAllowed,false);
assert.ok(p.integrityEngine.rules.length >= 5);

const toolNames=p.agentTools.map(x=>x.name);
assert.equal(new Set(toolNames).size,toolNames.length);
for (const required of [
  'get_accounting_summary',
  'create_sales_invoice',
  'record_customer_payment',
  'create_purchase',
  'record_supplier_payment',
  'post_stock_movement',
  'post_material_consumption',
  'post_waste',
  'close_accounting_day',
  'reverse_financial_transaction',
  'calculate_line_profit',
  'forecast_cash',
  'forecast_material_needs',
  'detect_accounting_anomalies'
]) assert.ok(toolNames.includes(required),required);

for (const t of p.agentTools) {
  assert.ok(['read','write','calculation','analysis'].includes(t.kind),t.name);
  assert.ok(['OBSERVE','RECOMMEND','APPROVAL','AUTO'].includes(t.defaultAutonomy),t.name);
  if (t.kind==='write') assert.notEqual(t.defaultAutonomy,'AUTO',t.name+' may not default AUTO');
}

assert.ok(p.eventModel.includes('customer_payment_recorded'));
assert.ok(p.eventModel.includes('material_consumed'));
assert.ok(p.eventModel.includes('day_close_requested'));

console.log('ACCOUNTING_AGENT_POLICY_V1=PASS');
console.log('AI_LEDGER_AUTHORITY=NO');
console.log('DIRECT_AI_DB_WRITE=NO');
console.log('DEFAULT_AGENT_MODE=OBSERVE');
console.log('AGENT_WRITES=OFF');
console.log('WRITE_TOOLS_DEFAULT_AUTO=0');
