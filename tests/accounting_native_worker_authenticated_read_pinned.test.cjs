'use strict';
/**
 * SOURCE_ONLY / NO_GO: the actual pinned TrendOS accounting Worker and native
 * session verifier run against strict in-process synthetic D1 SELECT fixtures.
 * No real DB, HTTP, employee token, cloud secret, financial POST or deployment.
 * The real verifier attempts optional last_seen UPDATE; the fake throws, the
 * verifier catches, and NO employee state (even synthetic) is mutated.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createHmac}=require('node:crypto');

const ROOT=process.env.EASYSTORE_PINNED_NATIVE_ROOT;
assert.ok(ROOT&&path.isAbsolute(ROOT),'PINNED_NATIVE_SOURCE_REQUIRED');
const workerPromise=import(pathToFileURL(path.join(ROOT,'employee-accounting-native-v1.mjs')).href);
const TOKEN='FAKE_NONPRODUCTION_TOKEN_001';
const SECRET='FAKE_LOCAL_SECRET_NOT_A_CLOUDFLARE_SECRET_001';
const ORIGIN='https://fawakhry.github.io';
const AUTH_DOMAIN='trendos-cloud-auth-shadow-v1';
function fingerprint(username,token=TOKEN){
  return createHmac('sha256',SECRET)
    .update(AUTH_DOMAIN+'\n'+username.toLowerCase()+'\n'+token).digest('hex');
}

function harness(opts={}){
  const cfg={
    username:'fake_print',role:'print',department:'طباعة',active:1,
    sessionVersion:1,currentSessionVersion:1,...opts
  };
  const expectedFingerprint=fingerprint(cfg.username);
  const trace={sql:[],bindings:[],sessionTouchAttempts:0,writes:0,batches:0,network:0};
  const db={
    prepare(rawSql){
      const sql=String(rawSql).replace(/\s+/g,' ').trim();
      trace.sql.push(sql);
      let bound=[];
      if(/^UPDATE\b/i.test(sql)){
        if(!/^UPDATE employee_auth_sessions_v1 SET last_seen_at_ms=/i.test(sql))
          throw Error('UNEXPECTED_SQL_MUTATION:'+sql);
        return {
          bind(...values){bound=values;return this;},
          async run(){trace.sessionTouchAttempts++;throw Error('SESSION_TOUCH_BLOCKED_BY_FAKE_D1');}
        };
      }
      if(!/^SELECT\b/i.test(sql))throw Error('NON_SELECT_SQL_FORBIDDEN:'+sql);
      function scopeCheck(){
        if(cfg.role==='print'||cfg.role==='laser'){
          assert.match(sql,/WHERE department=\?/,'department scoping must be SQL-side');
          assert.equal(bound[0],cfg.grantMode==='laser'?'ليزر':cfg.department,'department must derive from server roster and verified session');
        }
      }
      return {
        bind(...values){bound=values;return this;},
        async first(){
          trace.bindings.push({sql,values:bound});
          if(sql.includes('FROM employee_accounting_control_v1'))
            return {mode:cfg.mode||'READONLY',nextInvoiceNumber:1,policyEpoch:4};
          if(sql.includes('FROM employee_auth_sessions_v1 s')){
            if(cfg.noSession||bound[0]!==cfg.username.toLowerCase()||
               bound[1]!==expectedFingerprint||bound[2]>=Date.now()+60000)return null;
            return {
              usernameKey:cfg.username.toLowerCase(),sessionVersion:cfg.sessionVersion,
              expiresAtMs:Date.now()+60000,canonicalUsername:cfg.username,
              role:cfg.role,department:cfg.department,screensJson:'[]',
              mustChange:0,active:cfg.active,currentSessionVersion:cfg.currentSessionVersion
            };
          }
          if(sql.includes('FROM employee_accounting_party_balances_v1'))
            return {balance:70};
          if(sql.includes('FROM t12_customers'))
            return {customer_id:'FAKE_CUST',customer_name:'SYNTHETIC_CUSTOMER',
              manager:'NONE',phone:'',extra_phone:'',customer_type:'fake',active:'نعم'};
          throw Error('UNEXPECTED_SELECT_FIRST:'+sql);
        },
        async all(){
          trace.bindings.push({sql,values:bound});
          if(sql.includes('FROM employee_accounting_materials_v1')){
            if(sql.includes('SELECT *'))scopeCheck();
            return {results:[{material_id:'FAKE_MATERIAL',material_name:'SYNTHETIC_PAPER',
              department:cfg.department,unit_cost:150,computed_unit_cost:180,
              stock_qty:9,min_stock:0,official_sale_price:210,active:1}]};
          }
          if(sql.includes('FROM employee_accounting_templates_v1')){
            scopeCheck();
            return {results:[{template_id:'FAKE_TEMPLATE',item_name:'SYNTHETIC_PRINT',
              department:cfg.department,ink_cost:10,fixed_cost:20,computed_cost:30,
              suggested_sale_price:200,active:1}]};
          }
          if(sql.includes('FROM employee_accounting_dept_lines_v1')){
            if(sql.includes('GROUP BY department')){
              scopeCheck();
              return {results:[{department:cfg.department,count:1,sales:200,cost:115,profit:85}]};
            }
            scopeCheck();
            return {results:[{accounting_line_id:'FAKE_LINE',order_id:'FAKE_ORDER',
              department:cfg.department,sale_price:200,material_cost:70,
              operating_cost:45,other_cost:0,total_cost:115,system_cost:115,
              profit:85,qty:1,stock_deducted:0,version:1}]};
          }
          if(sql.includes('FROM employee_accounting_final_invoices_v1')){
            assert.equal(cfg.role,'admin','staff must never query owner invoices');
            return {results:[{invoice_no:'FAKE_INVOICE',order_id:'FAKE_ORDER',
              final_total:200,paid:130,remaining:70,created_at_ms:100}]};
          }
          if(sql.includes('FROM employee_accounting_party_ledger_v1')){
            assert.equal(cfg.role,'admin','staff cannot see customer ledger');
            return {results:[
              {id:'FAKE_INVOICE_EVENT',operation:'invoice',amount:200,balanceBefore:0,balanceAfter:200,createdAtMs:1},
              {id:'FAKE_INITIAL_PAYMENT',operation:'payment_received',amount:80,balanceBefore:200,balanceAfter:120,createdAtMs:2},
              {id:'FAKE_LATER_COLLECTION',operation:'payment_received',amount:50,balanceBefore:120,balanceAfter:70,createdAtMs:3}
            ]};
          }
          throw Error('UNEXPECTED_SELECT_ALL:'+sql);
        },
        async run(){trace.writes++;throw Error('SQL_RUN_FORBIDDEN');}
      };
    },
    async batch(){trace.batches++;throw Error('D1_BATCH_FORBIDDEN');}
  };
  const grants=Object.hasOwn(cfg,'grants')?cfg.grants:[{username:cfg.username,mode:cfg.grantMode||(cfg.role==='admin'?'full':'print')}];
  const env={
    DB:db,CORS_ORIGINS:ORIGIN,
    TRENDOS_EMPLOYEE_AUTH_NATIVE_ONLY_V1:'true',
    EDGE_SESSION_SECRET:cfg.missingSecret?'':SECRET,
    ACCOUNTING_FINANCE_GRANTS_MODE_V1:'ENFORCE',
    ACCOUNTING_FINANCE_GRANTS_V1:JSON.stringify({version:1,grants})
  };
  async function send(action,requestOptions={}){
    const body={action,username:cfg.username,token:TOKEN,
      ...requestOptions.body};
    const headers={Origin:ORIGIN,'content-type':'application/json',
      ...requestOptions.headers};
    const originalFetch=globalThis.fetch;
    globalThis.fetch=()=>{trace.network++;throw Error('NETWORK_FORBIDDEN')};
    try{
      const response=await (await workerPromise).handleEmployeeAccountingNativeRequest(
        new Request('https://offline.invalid/v1/employee/accounting',{
          method:'POST',headers,body:JSON.stringify(body)
        }),env);
      return {status:response.status,body:await response.json()};
    }finally{globalThis.fetch=originalFetch;}
  }
  function noWrites(){
    assert.equal(trace.writes,0);
    assert.equal(trace.batches,0);
    assert.equal(trace.network,0);
    assert.ok(trace.sql.every(s=>/^(SELECT\b|UPDATE employee_auth_sessions_v1 SET last_seen_at_ms=)/i.test(s)),trace.sql.join('\n'));
  }
  function noAccountingReads(){
    assert.equal(trace.sql.filter(s=>/FROM employee_accounting_(materials|templates|dept_lines|party_ledger|party_balances|final_invoices)_v1/.test(s)).length,0);
  }
  return {send,env,trace,noWrites,noAccountingReads};
}

test('01 native D1 session authorizes a scoped print read and server-redacts costs',async()=>{
  const h=harness();
  const r=await h.send('getAccounting');
  assert.equal(r.status,200);
  assert.equal(r.body.success,true);
  assert.equal(r.body.authSource,'d1-native-employee-v1');
  assert.equal(r.body.permissions.mode,'print');
  assert.equal(r.body.permissions.canSeeCosts,false);
  assert.equal(r.body.materials[0].unitCost,'');
  assert.equal(r.body.materials[0].computedUnitCost,'');
  assert.equal(r.body.templates[0].fixedCost,'');
  assert.equal(r.body.deptLines[0].profit,'');
  assert.equal(r.body.deptLines[0].totalCost,'');
  assert.equal(r.body.summary.byDepartment[0].profit,'');
  assert.deepEqual(r.body.finalInvoices,[]);
  assert.equal(h.trace.sessionTouchAttempts,1,'native verifier tries harmless last_seen; denied by fake DB');
  h.noWrites();
});
test('02 client forged admin/department/permissions cannot escape verified print role',async()=>{
  const h=harness();
  const r=await h.send('getAccounting',{body:{role:'admin',mode:'full',
    department:'عام',permissions:{canSeeCosts:true},ownerVerified:true}});
  assert.equal(r.status,200);
  assert.equal(r.body.permissions.canSeeCosts,false);
  assert.equal(r.body.deptLines[0].materialCost,'');
  assert.deepEqual(r.body.finalInvoices,[]);
  h.noWrites();
});
test('03 verified admin plus explicit roster grant sees full synthetic cost and invoice rows',async()=>{
  const h=harness({username:'fake_owner',role:'admin',department:'عام'});
  const r=await h.send('getAccounting');
  assert.equal(r.status,200);
  assert.equal(r.body.permissions.mode,'full');
  assert.equal(r.body.permissions.canSeeCosts,true);
  assert.equal(r.body.materials[0].unitCost,150);
  assert.equal(r.body.deptLines[0].profit,85);
  assert.equal(r.body.finalInvoices[0].remaining,70);
  h.noWrites();
});
test('04 verified admin reads separate synthetic customer closing receivable 70 after collection',async()=>{
  const h=harness({username:'fake_owner',role:'admin',department:'عام'});
  const r=await h.send('getCustomerAccountV1915',{body:{customerId:'FAKE_CUST'}});
  assert.equal(r.status,200);
  assert.equal(r.body.balance,70);
  assert.equal(r.body.customer.currentBalance,70);
  assert.equal(r.body.transactions.length,3);
  assert.equal(r.body.transactions[1].balanceAfter,120);
  assert.equal(r.body.transactions[2].balanceAfter,70);
  assert.equal(r.body.permissions.canAdjust,true);
  h.noWrites();
});
test('05 same read denies print account statement without even selecting customer rows',async()=>{
  const h=harness();
  const r=await h.send('getCustomerAccountV1915',{body:{customerId:'FAKE_CUST'}});
  assert.equal(r.status,400);
  assert.equal(r.body.success,false);
  assert.equal(h.trace.sql.some(s=>s.includes('FROM t12_customers')),false);
  h.noWrites();
});
test('06 wrong native token rejects before any finance read; no legacy network fallback',async()=>{
  const h=harness();
  const r=await h.send('getAccounting',{body:{token:'WRONG_FAKE_TOKEN'}});
  assert.equal(r.status,401);assert.equal(r.body.code,'employee-session-rejected');
  h.noAccountingReads();h.noWrites();
});
test('07 missing session rejects even if browser claims admin',async()=>{
  const h=harness({noSession:true});
  const r=await h.send('getAccounting',{body:{role:'admin',mode:'full'}});
  assert.equal(r.status,401);h.noAccountingReads();h.noWrites();
});
test('08 inactive verified session is denied before financial reads',async()=>{
  const h=harness({active:0});
  const r=await h.send('getAccounting');
  assert.equal(r.status,401);h.noAccountingReads();h.noWrites();
});
test('09 revoked session generation cannot be used for accounting reads',async()=>{
  const h=harness({currentSessionVersion:2});
  const r=await h.send('getAccounting');
  assert.equal(r.status,401);h.noAccountingReads();h.noWrites();
});
test('10 verified admin without explicit accounting roster grant is denied',async()=>{
  const h=harness({username:'fake_owner',role:'admin',grants:[]});
  const r=await h.send('getAccounting',{body:{mode:'full',ownerVerified:true}});
  assert.equal(r.status,403);h.noAccountingReads();h.noWrites();
});
test('11 verified user with tempting admin-like name cannot bypass ENFORCE roster',async()=>{
  const h=harness({username:'fake_diaa',role:'service',grants:[]});
  const r=await h.send('getAccounting',{body:{role:'admin'}});
  assert.equal(r.status,403);h.noAccountingReads();h.noWrites();
});
test('12 missing signing secret prevents native session authentication',async()=>{
  const h=harness({missingSecret:true});
  const r=await h.send('getAccounting');
  assert.equal(r.status,401);h.noAccountingReads();h.noWrites();
});
test('13 READONLY financial write remains 503 even with fabricated matching native session',async()=>{
  const h=harness({username:'fake_owner',role:'admin'});
  const r=await h.send('saveEasyStoreSaleV2',{body:{amount:999999,role:'admin'}});
  assert.equal(r.status,503);
  assert.equal(r.body.code,'employee-accounting-readonly');
  assert.equal(h.trace.sessionTouchAttempts,0);
  h.noAccountingReads();h.noWrites();
});
test('14 Bearer header takes precedence over forged body token and is verified in D1',async()=>{
  const h=harness();
  const r=await h.send('getAccounting',{body:{token:'FORGED_BODY_TOKEN'},
    headers:{Authorization:'Bearer '+TOKEN}});
  assert.equal(r.status,200);
  assert.equal(r.body.permissions.mode,'print');
  h.noWrites();
});
test('15 mismatched trusted roster mode cannot be inferred from body client fields',async()=>{
  const h=harness({grantMode:'laser'});
  const r=await h.send('getAccounting',{body:{mode:'full',department:'طباعة'}});
  assert.equal(r.status,200);
  assert.equal(r.body.permissions.mode,'laser');
  assert.equal(r.body.permissions.canSeeCosts,false);
  h.noWrites();
});
