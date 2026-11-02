'use strict';
/**
 * ACC221 — execute original TrendOS T12 order/customer review migrations on
 * disposable in-memory SQLite; no live Cloudflare, Google, employees or funds.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','native-trendos-acc214','cloudflare-d1','migrations');
const MIGRATIONS=[
  '0005_t12_production_create_canary.sql',
  '0008_t12_customer_master.sql',
  '0017_employee_core_current_orders_v1.sql',
  '0032_t12_order_customer_binding_review_only_v1.sql',
  '0033_t12_customer_binding_correction_audit_sourceonly_v1.sql'
];
function sample(){
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for(const name of MIGRATIONS)db.exec(fs.readFileSync(path.join(root,name),'utf8'));
  const c=db.prepare('INSERT INTO t12_customers(customer_id,customer_name,customer_name_key,source) VALUES(?,?,?,?)');
  c.run('FAKE_C_A','نفس الاسم','same_name','cloud-native');
  c.run('FAKE_C_B','نفس الاسم','same_name','cloud-native');
  db.prepare('INSERT INTO t12_prod_request_ledger (request_key,actor,policy_epoch,canonical_json,order_id,status) VALUES (?,?,?,?,?,?)')
    .run('FAKE_REQ_001_ABC','FAKE_ADMIN','test','{}','FAKE_ORDER_1','COMMITTED');
  db.prepare('INSERT INTO t12_prod_orders (order_id,request_key,customer_mode,customer_name,customer_phone,external_customer_id,department,priority,status,actor) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run('FAKE_ORDER_1','FAKE_REQ_001_ABC','خارجي','نفس الاسم','00000000000',
      'FAKE_C_A','متعدد الأقسام','عادي','طلب جديد','FAKE_ADMIN');
  return db;
}
const getColumns=(db,name)=>db.prepare('PRAGMA table_info('+name+')').all().map(x=>x.name);
const getFk=(db,name)=>db.prepare('PRAGMA foreign_key_list('+name+')').all();
const proof=()=> 'f'.repeat(64);
function revision(db,request,event,customer,parent=null){
  return db.prepare('INSERT INTO t12_order_customer_binding_revision_v1 (request_key,order_id,candidate_customer_id,event_kind,supersedes_revision_id,actor_subject,actor_role,evidence_ref,evidence_sha256,reason) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(request,'FAKE_ORDER_1',customer,event,parent,'FAKE_ADMIN','admin',
      'FAKE_EVIDENCE_REF_123',proof(),'Fake-only review without authoritative customer proof');
}
test('ACC221 original T12 and operational Core schema lack official customer FK',t=>{
  const db=sample();t.after(()=>db.close());
  const cols=getColumns(db,'t12_prod_orders');
  assert.ok(cols.includes('external_customer_id'));
  assert.equal(cols.includes('customer_id'),false);
  assert.equal(getFk(db,'t12_prod_orders').some(x=>x.table==='t12_customers'),false);
  const coreCols=getColumns(db,'employee_core_orders_v1');
  assert.equal(coreCols.includes('customer_id'),false);
  assert.ok(coreCols.includes('customer_name'));
  assert.ok(coreCols.includes('customer_phone'));
  assert.equal(getFk(db,'employee_core_orders_v1').some(x=>x.table==='t12_customers'),false);
  const matches=db.prepare('SELECT customer_id FROM t12_customers WHERE customer_name_key=?').all('same_name');
  assert.equal(matches.length,2,'same-name customer is ambiguous, never a finance key');
  const order=db.prepare('SELECT external_customer_id FROM t12_prod_orders WHERE order_id=?').get('FAKE_ORDER_1');
  assert.equal(order.external_customer_id,'FAKE_C_A');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0,
    'valid foreign keys do NOT establish that external_customer_id is genuine ownership');
});
test('ACC221 candidate link matching a customer FK cannot authorize money',t=>{
  const db=sample();t.after(()=>db.close());
  db.prepare('INSERT INTO t12_order_customer_binding_review_v1 (order_id,customer_id,recorded_by,evidence_ref) VALUES(?,?,?,?)')
    .run('FAKE_ORDER_1','FAKE_C_A','FAKE_ADMIN','FAKE_EVIDENCE_UNVERIFIED');
  const record=db.prepare('SELECT * FROM t12_order_customer_binding_review_v1').get();
  assert.equal(record.review_status,'UNVERIFIED');
  assert.equal(record.finance_authorized,0);
  assert.equal(record.delivery_authorized,0);
  assert.throws(()=>db.exec("UPDATE t12_order_customer_binding_review_v1 SET review_status='APPROVED'"));
  assert.throws(()=>db.exec('UPDATE t12_order_customer_binding_review_v1 SET finance_authorized=1'));
  assert.throws(()=>db.exec('DELETE FROM t12_order_customer_binding_review_v1'));
});
test('ACC221 correction trail records only unverified candidates, never finance grants',t=>{
  const db=sample();t.after(()=>db.close());
  revision(db,'FAKE_PROPOSE_REQ_001','PROPOSE','FAKE_C_A');
  const first=db.prepare('SELECT MAX(revision_id) AS id FROM t12_order_customer_binding_revision_v1').get().id;
  revision(db,'FAKE_CORRECT_REQ_002','CORRECT','FAKE_C_B',first);
  const second=db.prepare('SELECT MAX(revision_id) AS id FROM t12_order_customer_binding_revision_v1').get().id;
  revision(db,'FAKE_WITHDRAW_REQ_003','WITHDRAW','FAKE_C_B',second);
  const rows=db.prepare('SELECT * FROM t12_order_customer_binding_revision_v1 ORDER BY revision_id').all();
  assert.deepEqual(rows.map(x=>x.event_kind),['PROPOSE','CORRECT','WITHDRAW']);
  assert.deepEqual(rows.map(x=>x.candidate_customer_id),['FAKE_C_A','FAKE_C_B','FAKE_C_B']);
  assert.ok(rows.every(x=>x.review_status==='NOT_ATTESTED'&&x.finance_authorized===0&&x.delivery_authorized===0));
  assert.throws(()=>db.exec('UPDATE t12_order_customer_binding_revision_v1 SET finance_authorized=1'));
  assert.throws(()=>db.exec('DELETE FROM t12_order_customer_binding_revision_v1'));
  assert.throws(()=>revision(db,'FAKE_STALE_REQ_004','CORRECT','FAKE_C_A',first));
});
test('ACC221 review state never promotes to verified or financially authorized',t=>{
  const db=sample();t.after(()=>db.close());
  assert.throws(()=>db.prepare('INSERT INTO t12_order_customer_binding_review_v1 (order_id,customer_id,recorded_by,review_status) VALUES(?,?,?,?)')
    .run('FAKE_ORDER_1','FAKE_C_A','FAKE_ADMIN','ATTESTED'));
  assert.throws(()=>db.prepare('INSERT INTO t12_order_customer_binding_revision_v1 (request_key,order_id,candidate_customer_id,event_kind,actor_subject,actor_role,evidence_ref,evidence_sha256,reason,finance_authorized) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run('FAKE_GRANT_REQ_001','FAKE_ORDER_1','FAKE_C_A','PROPOSE','FAKE_ADMIN','admin',
      'FAKE_EVIDENCE_REF_123',proof(),'fake document cannot attest this financial identity',1));
});
test('ACC221 released source evidence remains NO_GO (no production calls)',()=>{
 console.log('ACC221_OFFICIAL_ORDER_CUSTOMER_FK=ABSENT_IN_PINNED_SOURCE');
 console.log('ACC221_MANUAL_BINDING_REVIEW=UNVERIFIED_NON_FINANCIAL');
 console.log('ACC221_CUSTOMER_MATCH_BY_NAME=AMBIGUOUS');
 console.log('ACC221_REAL_CLOUD_DATA_QUERIED=NO');
 console.log('ACC221_CUSTOMER_LEDGER_POSTING=ZERO');
 console.log('FINANCE_RELEASE=NO_GO');
});
