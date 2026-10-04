const assert=require('assert');
const fs=require('fs');

const c=JSON.parse(fs.readFileSync('docs/ACCOUNTING_CONNECTOR_CONTRACT_V1.json','utf8'));

assert.equal(c.version,'ACCOUNTING_CONNECTOR_CONTRACT_V1');
assert.equal(c.connectorId,'EASYSTORE_AUTONOMOUS_PRINTSHOP_FINANCE_CONNECTOR_V1');
assert.equal(c.status,'REPO_ONLY_DEFAULT_OFF');

assert.equal(c.runtime.defaultMode,'OFF');
assert.deepEqual(c.runtime.modes,['OFF','SHADOW','READONLY','CANARY','GENERAL']);
assert.equal(c.runtime.failClosed,true);
assert.equal(c.runtime.directDatabaseAccess,false);
assert.equal(c.runtime.deliverySemantics,'AT_LEAST_ONCE_WITH_IDEMPOTENT_CONSUMER');
assert.equal(c.runtime.replaySupported,true);
assert.equal(c.runtime.deadLetterRequired,true);

assert.ok(c.authorityBoundaries.easyStore.includes('financial_ledger'));
assert.ok(c.authorityBoundaries.trendosAndAutonomousPrintshop.includes('order_operational_truth'));
for(const forbidden of [
  'autonomous_printshop_direct_write_to_accounting_d1',
  'trendos_direct_financial_ledger_mutation',
  'shared_database_tables_as_cross_system_api',
  'browser_dual_write',
  'ai_direct_database_write',
  'chat_message_as_payment_proof'
]) assert.ok(c.authorityBoundaries.forbidden.includes(forbidden),forbidden);

for(const id of ['event_id','correlation_id','idempotency_key','order_id','line_id','customer_id_or_party_id']){
  assert.ok(c.identity.requiredStableIds.includes(id),id);
}
assert.equal(c.identity.namesAreNeverPrimaryKeys,true);

const inbound=new Map(c.inboundOperationalEvents.map(x=>[x.type,x]));
for(const event of [
  'order_created',
  'order_line_approved',
  'production_completed',
  'material_consumed_confirmed',
  'waste_confirmed',
  'order_delivered',
  'customer_payment_reference_received'
]) assert.ok(inbound.has(event),event);
for(const row of c.inboundOperationalEvents) assert.equal(row.financialAuthority,false,row.type);

assert.equal(c.evidenceRules.aiInferenceAloneIsFinancialEvidence,false);
assert.equal(c.evidenceRules.chatMessageAloneProvesPayment,false);
assert.equal(c.evidenceRules.verifiedPaymentSourceRequiredForPaymentPosting,true);
assert.equal(c.evidenceRules.deterministicValidationRequiredBeforePosting,true);

for(const tool of c.commandToolsExposedToAutonomousPrintshop){
  assert.equal(tool.directLedgerWrite,false,tool.tool);
}

for(const field of ['contract_version','event_id','event_type','correlation_id','idempotency_key','evidence_refs','payload']){
  assert.ok(c.envelope.requiredFields.includes(field),field);
}
for(const bad of ['password','session_token','api_key','raw_secret','chain_of_thought']){
  assert.ok(c.envelope.prohibitedFields.includes(bad),bad);
}

assert.equal(c.exitCriteria.directCrossSystemDbAccess,0);
assert.equal(c.exitCriteria.browserDualWrites,0);
assert.equal(c.exitCriteria.autonomousPrintshopFinancialAuthority,false);
assert.equal(c.exitCriteria.easyStoreFinancialAuthority,true);

console.log('ACCOUNTING_CONNECTOR_CONTRACT_V1=PASS');
console.log('CONNECTOR_DEFAULT_MODE=OFF');
console.log('DIRECT_CROSS_SYSTEM_DB_ACCESS=NO');
console.log('AUTONOMOUS_PRINTSHOP_FINANCIAL_AUTHORITY=NO');
console.log('EASYSTORE_FINANCIAL_AUTHORITY=YES');
