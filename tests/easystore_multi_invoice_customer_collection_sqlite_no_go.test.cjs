'use strict';
/**
 * SOURCE_ONLY / NO_GO — real pinned TrendOS native accounting implementation,
 * actual D1 accounting migration SQL, ephemeral node:sqlite :memory: only.
 * No external financial POST; Request objects are dispatched IN PROCESS only.
 * No real customer, employee, session, currency transfer or production service.
 * Validates account-level collection across two invoices without inventing
 * invoice allocation policy or rewriting historic invoice-time remaining.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {DatabaseSync}=require('node:sqlite');
const {webcrypto}=require('node:crypto');

const ROOT=process.env.EASYSTORE_PINNED_TRENDOS_ROOT;
assert.ok(ROOT&&path.isAbsolute(ROOT),'PINNED_TRENDOS_ROOT_ABSOLUTE_REQUIRED');
const files=[
 '0015_employee_accounting_zero_google_v1.sql',
 '0020_employee_accounting_party_master_v1.sql',
 '0021_employee_accounting_material_dimensions_v1.sql',
 '0022_employee_accounting_day_ops_v1.sql',
 '0023_employee_accounting_command_audit_v1.sql',
 '0024_employee_accounting_party_balances_v1.sql',
 '0025_employee_accounting_final_reversal_day_close_v1.sql',
 '0026_employee_accounting_tx_guard_v1.sql',
 '0027_employee_accounting_direct_sale_cost_v1.sql',
 '0028_employee_accounting_write_canary_v1.sql',
 '0029_employee_accounting_canary_mode_v1.sql',
 '0030_employee_accounting_write_canary_budget_v1.sql'
];
const upstreamFile=path.join(ROOT,'src','employee-accounting-native-v1.mjs');
const raw=fs.readFileSync(upstreamFile,'utf8');
const script=raw.replace(/^import \{ verifyEmployeeSessionCloudFirst \} from '\.\/cloud-session-bridge-v3\.mjs';\s*/,'').replace(/^export /gm,'');
assert.ok(script!==raw&&script.includes('async function partyLedger(')&&script.includes('async function saveEasyStoreSaleV2A2('));
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/easystore-multi-invoice-collection-sqlite-no-go.yml'),'utf8');
assert.match(workflow,/90795b9d05b3cc72051be50683c7942b87d07452/);
assert.doesNotMatch(workflow,/wrangler\s+(deploy|d1\s+execute)|--remote|workflow_dispatch/i);

test('real native Worker: two fake invoices, one unallocated aggregate collection, replay and ceiling',async t=>{
 const db=new DatabaseSync(':memory:');
 try{
  for(const name of files)db.exec(fs.readFileSync(path.join(ROOT,'migrations',name),'utf8'));
  db.exec("CREATE TABLE t12_customers(customer_id TEXT PRIMARY KEY,customer_name TEXT,active TEXT,updated_at TEXT);");
  db.prepare("INSERT INTO t12_customers VALUES(?,?,'نعم',CURRENT_TIMESTAMP)")
    .run('CUST_SYNTH_MULTI_1','FAKE_ACCOUNT_ONLY_CUSTOMER');
  const trace={batches:0,batchRollbacks:0,network:0};
  const DB={
   prepare(sql){
    const stmt={sql:String(sql),args:[]};
    const wrapper={
     bind(...args){stmt.args=args;return wrapper;},
     first(){return Promise.resolve(db.prepare(stmt.sql).get(...stmt.args)||null);},
     all(){return Promise.resolve({results:db.prepare(stmt.sql).all(...stmt.args)});},
     run(){return Promise.resolve(db.prepare(stmt.sql).run(...stmt.args));}
    };
    wrapper.__statement=stmt;
    return wrapper;
   },
   async batch(items){
    trace.batches++;
    db.exec('BEGIN IMMEDIATE');
    try{
     const results=items.map(item=>db.prepare(item.__statement.sql).run(...item.__statement.args));
     db.exec('COMMIT');
     return results;
    }catch(e){
     trace.batchRollbacks++;
     db.exec('ROLLBACK');
     throw e;
    }
   }
  };
  const env={DB,CORS_ORIGINS:'https://fawakhry.github.io'};
  let verifiedRole='admin';
  const context=vm.createContext({
    crypto:webcrypto,TextEncoder,Request,Response,Headers,URL,URLSearchParams,
    Date,Intl,JSON,Math,console,
    verifyEmployeeSessionCloudFirst:async(username,token)=>{
     if(username!=='FAKE_OFFLINE_OWNER' || token!=='FAKE_SQLITE_SESSION')
       return {ok:false,message:'test session rejected'};
     return {ok:true,authSource:'FAKE_SQLITE_VERIFIER_NOT_REAL_SSO',
       body:{user:{username,role:verifiedRole,department:''}}};
    }
  });
  vm.runInContext(script+'\n;globalThis.nativeHandler=handleEmployeeAccountingNativeRequest;',context,{timeout:15000});
  const send=async(action,data={},opts={})=>{
    const originalFetch=globalThis.fetch;
    globalThis.fetch=()=>{trace.network++;throw Error('NO_NETWORK_PERMITTED')};
    try{
      const res=await context.nativeHandler(new Request(
        'https://offline.invalid/v1/employee/accounting',{
          method:'POST',
          headers:{Origin:'https://fawakhry.github.io','content-type':'application/json',
            Authorization:'Bearer '+(opts.token||'FAKE_SQLITE_SESSION')},
          body:JSON.stringify({
            action,username:'FAKE_OFFLINE_OWNER',sourceSystem:'SYNTHETIC_SQLITE_ONLY',
            ...data
          })
        }),env);
      return {status:res.status,...await res.json()};
    }finally{globalThis.fetch=originalFetch}
  };
  const one=(sql,...args)=>db.prepare(sql).get(...args);
  const all=(sql,...args)=>db.prepare(sql).all(...args);
  const count=table=>one('SELECT COUNT(*) AS n FROM '+table).n;
  const bal=()=>Number(one("SELECT balance FROM employee_accounting_party_balances_v1 WHERE party_type='customer' AND party_id='CUST_SYNTH_MULTI_1'")?.balance||0);
  const invoices=()=>all('SELECT invoice_no AS invoiceNo,final_total AS total,paid,remaining FROM employee_accounting_final_invoices_v1 ORDER BY invoice_no');
  const entries=()=>all("SELECT operation,amount,effect,balance_before AS before,balance_after AS after,ref_no AS refNo FROM employee_accounting_party_ledger_v1 WHERE party_type='customer' AND party_id='CUST_SYNTH_MULTI_1' ORDER BY created_at_ms, rowid");
  const cash=()=>all("SELECT request_key AS requestKey,amount,ref_no AS refNo FROM employee_accounting_cashbox_v1 WHERE movement_type='CUSTOMER_RECEIPT' ORDER BY rowid");

  await t.test('initial native mode OFF / fake READONLY reject mutation before any invoice',async()=>{
    assert.equal(one('SELECT mode FROM employee_accounting_control_v1 WHERE singleton=1').mode,'OFF');
    assert.equal((await send('saveEasyStoreSaleV2',{requestId:'FAKE_BLOCKED_SALE_001'})).status,503);
    db.exec("UPDATE employee_accounting_control_v1 SET mode='READONLY' WHERE singleton=1");
    assert.equal((await send('saveCustomerAccountMovementV1915',{requestId:'FAKE_BLOCKED_COLLECTION_001'})).status,503);
    assert.equal(count('employee_accounting_final_invoices_v1'),0);
    assert.equal(count('employee_accounting_party_ledger_v1'),0);
  });
  // Enable only an in-memory synthetic control; the actual production
  // server, its financial mode and credentials are NEVER accessed.
  db.exec("UPDATE employee_accounting_control_v1 SET mode='GENERAL' WHERE singleton=1");
  db.exec("UPDATE employee_accounting_write_canary_v1 SET enabled=0,max_commands=0,commands_started=0 WHERE singleton=1");
  verifiedRole='service';
  await t.test('client role spoofing denied before synthetic financial mutation',async()=>{
    const denied=await send('saveAccountingMaterial',{
      requestId:'FAKE_ROLE_SPOOF_0001',role:'admin',materialName:'FAKE_FORBIDDEN',
      department:'طباعة',stockQty:10
    });
    assert.equal(denied.status,403);
    assert.equal(count('employee_accounting_materials_v1'),0);
  });
  verifiedRole='admin';
  let materialId='';
  await t.test('set up one fake source material, with independently recorded nominal unit cost',async()=>{
    const material=await send('saveAccountingMaterial',{
      requestId:'FAKE_MATERIAL_SET_0001',materialName:'FAKE_ONLY_PAPER',
      department:'طباعة',unit:'قطعة',unitCost:10,stockQty:10,active:'نعم'
    });
    assert.equal(material.success,true,JSON.stringify(material));
    materialId=material.materialId;
    assert.ok(materialId);
    assert.equal(count('employee_accounting_materials_v1'),1);
  });
  const customer='CUST_SYNTH_MULTI_1';
  const fakeDate='2099-12-31';
  const first={requestId:'FAKE_SALE_A_REQUEST_0001',customerId:customer,
    department:'طباعة',item:'FAKE_ONLY_PAPER',invoiceNo:'FAKE_INVOICE_A',
    qty:1,unitPrice:200,total:200,paid:80,paymentMethod:'نقدي',workDate:fakeDate};
  const second={requestId:'FAKE_SALE_B_REQUEST_0001',customerId:customer,
    department:'طباعة',item:'FAKE_ONLY_PAPER',invoiceNo:'FAKE_INVOICE_B',
    qty:1,unitPrice:150,total:150,paid:0,paymentMethod:'آجل',workDate:fakeDate};
  await t.test('two distinct invoices: 200-80=120 and 150-0=150, aggregate receivable=270',async()=>{
    const a=await send('saveEasyStoreSaleV2',first);
    assert.equal(a.success,true,JSON.stringify(a));
    const b=await send('saveEasyStoreSaleV2',second);
    assert.equal(b.success,true,JSON.stringify(b));
    assert.equal(a.remaining,120);
    assert.equal(b.remaining,150);
    assert.equal(bal(),270);
    assert.deepEqual(invoices().map(x=>[x.invoiceNo,x.total,x.paid,x.remaining]),
      [['FAKE_INVOICE_A',200,80,120],['FAKE_INVOICE_B',150,0,150]]);
    assert.equal(Number(one('SELECT stock_qty AS v FROM employee_accounting_materials_v1 WHERE material_id=?',materialId).v),8);
    assert.equal(count('employee_accounting_stock_moves_v1'),2);
    assert.equal(cash().length,1);
    assert.equal(cash()[0].amount,80);
  });
  const payment={requestId:'FAKE_UNALLOCATED_RECEIPT_0001',customerId:customer,
    operation:'payment_received',amount:50,refNo:'',paymentMethod:'نقدي',
    workDate:fakeDate};
  let receipt;
  await t.test('owner-approved policy for ACCOUNT TOTAL: unallocated collection of 50 reduces 270 to 220',async()=>{
    receipt=await send('saveCustomerAccountMovementV1915',payment);
    assert.equal(receipt.success,true,JSON.stringify(receipt));
    assert.equal(receipt.balanceBefore,270);
    assert.equal(receipt.balance,220);
    assert.equal(bal(),220);
    assert.equal(cash().length,2);
    assert.equal(cash().at(-1).amount,50);
    assert.equal(cash().at(-1).refNo,'');
    const invoiceTimeCredit=invoices().reduce((n,x)=>n+x.remaining,0);
    assert.equal(invoiceTimeCredit,270,'invoice-time credit must not be relabeled as current debt');
    assert.equal(invoiceTimeCredit-bal(),50);
    assert.equal(Number(one("SELECT SUM(CASE WHEN effect=1 THEN amount ELSE -amount END) AS net FROM employee_accounting_party_ledger_v1 WHERE party_type='customer' AND party_id=?",customer).net),220);
    assert.deepEqual(invoices().map(x=>x.remaining),[120,150],
      'unallocated customer receipt MUST NOT silently rewrite a specific invoice');
  });
  await t.test('real customer account read reflects collections and separate original invoice snapshots',async()=>{
    const statement=await send('getCustomerAccountV1915',{customerId:customer});
    assert.equal(statement.success,true,JSON.stringify(statement));
    assert.equal(statement.balance,220);
    assert.equal(statement.customer.currentBalance,220);
    assert.equal(statement.transactions.length,4,'two invoice debits, first payment and later unallocated collection');
    assert.equal(statement.transactions.filter(x=>x.operation==='payment_received').length,2);
    assert.equal(invoices().reduce((s,x)=>s+x.remaining,0),270);
  });
  const savedCounts=()=>({
    balance:bal(),cash:count('employee_accounting_cashbox_v1'),
    ledger:count('employee_accounting_party_ledger_v1'),
    invoices:count('employee_accounting_final_invoices_v1'),
    stockMoves:count('employee_accounting_stock_moves_v1')
  });
  const baseline=savedCounts();
  await t.test('lost-ACK exact retry uses COMMITTED idempotency, no second debt/cash movement',async()=>{
    const again=await send('saveCustomerAccountMovementV1915',payment);
    assert.equal(again.success,true,JSON.stringify(again));
    assert.equal(again.duplicatePrevented,true);
    assert.equal(again.balance,220);
    assert.deepEqual(savedCounts(),baseline);
  });
  await t.test('same request ID changed amount is a hard idempotency conflict, no posting',async()=>{
    const altered=await send('saveCustomerAccountMovementV1915',{...payment,amount:55});
    assert.equal(altered.success,false);
    assert.equal(altered.code,'accounting-idempotency-conflict');
    assert.deepEqual(savedCounts(),baseline);
  });
  await t.test('attempted customer overcollection 221 > 220 is denied with zero side effects',async()=>{
    const denied=await send('saveCustomerAccountMovementV1915',{
      ...payment,requestId:'FAKE_OVERPAY_DENIED_0001',amount:221
    });
    assert.equal(denied.success,false);
    assert.equal(denied.status,400);
    assert.deepEqual(savedCounts(),baseline);
  });
  await t.test('bad fake session cannot read customer balance or collect',async()=>{
    assert.equal((await send('getCustomerAccountV1915',{customerId:customer},{token:'FAKE_INVALID_TOKEN'})).status,401);
    assert.equal((await send('saveCustomerAccountMovementV1915',{...payment,requestId:'FAKE_NO_AUTH_RECEIPT_0001'},{token:'FAKE_INVALID_TOKEN'})).status,401);
    assert.deepEqual(savedCounts(),baseline);
  });
  await t.test('revert fake control to READONLY and verify existing snapshots remain unchanged',async()=>{
    db.exec("UPDATE employee_accounting_control_v1 SET mode='READONLY' WHERE singleton=1");
    assert.equal((await send('saveCustomerAccountMovementV1915',{
      ...payment,requestId:'FAKE_READONLY_RECEIPT_0001'
    })).status,503);
    assert.deepEqual(savedCounts(),baseline);
    assert.equal(trace.network,0);
    assert.equal(count('employee_accounting_tx_guard_v1'),0);
    assert.equal(count('employee_accounting_request_ledger_v1')>0,true);
  });
 }finally{db.close()}
});
