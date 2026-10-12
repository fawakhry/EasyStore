'use strict';
/**
 * EasyStore JOINED accounting functional diagnostic.
 * Executes checked-in Code.gs finance handlers INSIDE isolated node:vm with
 * entirely fictional Sheets/locks/cashbox and NO Google, D1, HTTP or real users.
 * Deliberately distinguishes internally successful old-handler executions from
 * complete D1/Worker, cashier and costing acceptance. Not operational GO.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const WORK_DATE='2026-08-10';

function scenario(){
  const raw=fs.readFileSync(path.join(__dirname,'..','Code.gs'),'utf8');
  const context={console,Date,JSON,Math,Set,Object,Array,String,Number,RegExp,parseInt,parseFloat,isNaN,Utilities:{
    getUuid:(()=>{let i=0;return()=>('0000000'+(++i)).slice(-8)+'-FAKE-ONLY';})(),
    formatDate:date=>new Date(date).toISOString().slice(0,10)
  },Session:{getScriptTimeZone:()=> 'Africa/Cairo'},
  SpreadsheetApp:{flush(){}},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}
  };
  vm.createContext(context);
  vm.runInContext(raw,context,{timeout:10000,filename:'FAKE_ONLY_Code.gs'});
  const state={mode:'full',bal:new Map(),idempotence:new Map(),sheets:new Map(),stock:0,stockCalls:0,productMoves:0,audits:[],
    blockers:{pendingPurchases:[],openDeptLines:[],openCustodies:[],unclassified:[]}};
  function sheet(name,headerNames=[]){
    if(state.sheets.has(name))return state.sheets.get(name);
    const sh={name,headers:headerNames,rows:[],
      getLastRow(){return this.rows.length+1;},
      getLastColumn(){return this.headers.length;},
      getRange(row,col,amount=1,width=1){const self=this;return{
        getValues(){return Array.from({length:amount},(_,i)=>Array.from({length:width},(_,j)=>self.rows[row-2+i]?.[self.headers[col-1+j]]??''));},
        getValue(){return self.rows[row-2]?.[self.headers[col-1]]??'';},
        setValue(value){if(self.rows[row-2])self.rows[row-2][self.headers[col-1]]=value;}
      };},
      deleteRow(row){this.rows.splice(row-2,1);},
      getDataRange(){const self=this;return{getValues(){return [self.headers,...self.rows.map(r=>self.headers.map(k=>r[k]??''))];}}}
    };
    state.sheets.set(name,sh);return sh;
  }
  const s={
    materials:sheet('FAKE_MATERIALS'),
    deptLines:sheet('FAKE_DEPT_LINES'),
    finalInvoices:sheet('FAKE_FINAL_INVOICES'),
    waste:sheet('FAKE_WASTE'),
    dailyPurchases:sheet('FAKE_DAILY_PURCHASES')
  };
  const cash=sheet('حسابات - الخزنة',context.es16CashboxHeaders_());
  const ledger=sheet('FAKE_LEDGER');
  const closes=sheet('FAKE_DAY_CLOSE');
  context.mbEnsureSheet_=(name,headers)=>sheet(name,headers);
  context.ensureAccountingSheets_=()=>s;
  context.ensureDepartmentDayCloseSheetV1920_=()=>closes;
  context.accSheetRows_=sh=>sh.rows.slice();
  context.appendByHeaders_=(sh,values)=>{
    const row={...values};
    if(Object.hasOwn(row,'وقت التسجيل'))row['وقت التسجيل']=WORK_DATE;
    if(Object.hasOwn(row,'وقت التقفيل'))row['وقت التقفيل']=WORK_DATE;
    sh.rows.push(row);
  };
  context.headersMap_=sh=>{
    const map={};
    sh.headers.forEach((x,i)=>map[context.normalizeKey_(x)]=i+1);
    return map;
  };
  // Real firstCol_ and valueAt_ are used against fake one-based header maps.
  context.accountingAuthorize_=()=>({ok:true,mode:state.mode,department:'ليزر',user:{username:state.mode==='full'?'FAKE_MANAGER':'FAKE_CASHIER'}});
  context.accountingCanSavePurchaseV1857_=auth=>auth.mode==='full';
  context.accountingReadIdempotentV1913_=(type,key)=>state.idempotence.get(type+'|'+key)||null;
  context.accountingSaveIdempotentV1913_=(type,key,value)=>{state.idempotence.set(type+'|'+key,value);};
  context.accountingFindMaterialRow_=()=>2; // Fixture: fictional material exists.
  context.accountingPurchaseStockAlreadyAppliedV1919_=()=>false;
  context.accountingIncreaseMaterialStockV1913_=(material,qty)=>{
    assert.equal(material,'FAKE_MDF');
    const before=state.stock;state.stock+=qty;state.stockCalls++;
    return {ok:true,before,after:state.stock};
  };
  context.saveStockMoveBatch25_=()=>{state.productMoves++;}; // Not a genuine FG inventory handler.
  context.accountsEnsureLedgerSheetV1858_=()=>ledger;
  context.accountsEnsureSheetColumnV1858_=()=>1;
  context.ensureHeaderIfAnyMissing_=()=>{};
  context.customerAccountFindRequestV1915_=(_sh,key)=>ledger.rows.find(r=>r['معرف الطلب']===key)||null;
  context.accountsCurrentBalanceV1858_=(type,name)=>state.bal.get(type+'|'+name)||0;
  context.accountsUpdateMasterBalanceV1858_=(type,name,balance)=>state.bal.set(type+'|'+name,balance);
  context.customerAccountFindV1915_=name=>name==='FAKE_CUSTOMER'?{name:'FAKE_CUSTOMER'}:null;
  context.es16Audit_=(...args)=>state.audits.push(args);
  context.purchaseCustodySummariesV1920_=()=>[]; // No fake custody opened.
  context.accountingAutomationPreviewDataV1921_=()=>state.blockers;
  context.collectUnclassifiedAccountingRowsV1920_=()=>[];
  context.Session.getScriptTimeZone=()=> 'Africa/Cairo';
  const call=(name,parameter)=>context[name]({parameter});
  return {context,call,state,s,ledger,cash,closes,sheet};
}

test('joined purchase -> supplier payable -> material stock -> sale -> customer debt -> later collection -> cashbox',()=>{
  const h=scenario(),{call,state,cash,ledger}=h;
  const purch={requestId:'FAKE_PURCHASE_0001',supplier:'FAKE_SUPPLIER',invoiceNo:'FAKE_PUR_1',material:'FAKE_MDF',
    qty:'3',unit:'100',paid:'100',total:'300',paymentType:'نقدي',department:'ليزر',date:WORK_DATE};
  let r=call('saveEasyStorePurchaseV2_',purch);
  assert.equal(r.success,true,JSON.stringify(r));assert.equal(r.stockAfter,3);
  assert.equal(state.stock,3);assert.equal(state.stockCalls,1);
  assert.equal(state.bal.get('supplier|FAKE_SUPPLIER'),200);
  assert.equal(cash.rows.length,1);assert.equal(cash.rows[0]['المبلغ'],100);
  assert.equal(ledger.rows.length,2);
  r=call('saveEasyStorePurchaseV2_',purch);
  assert.equal(r.duplicatePrevented,true);assert.equal(state.stockCalls,1);
  assert.equal(state.bal.get('supplier|FAKE_SUPPLIER'),200);
  assert.equal(ledger.rows.length,2);assert.equal(cash.rows.length,1);

  const sale={requestId:'FAKE_SALE_0001',customer:'FAKE_CUSTOMER',no:'FAKE_SAL_1',
    item:'FAKE_SERVICED_PRODUCT',qty:'1',unit:'200',total:'200',paid:'80',paymentType:'نقدي',department:'ليزر',date:WORK_DATE};
  r=call('saveEasyStoreSaleV2_',sale);
  assert.equal(r.success,true,JSON.stringify(r));assert.equal(r.financeWarning,'');
  assert.equal(state.bal.get('customer|FAKE_CUSTOMER'),120);
  assert.equal(cash.rows.length,2);assert.equal(state.productMoves,1);
  assert.equal(ledger.rows.length,4);
  r=call('saveEasyStoreSaleV2_',sale);
  assert.equal(r.duplicatePrevented,true);
  assert.equal(state.bal.get('customer|FAKE_CUSTOMER'),120);
  assert.equal(state.productMoves,1);assert.equal(cash.rows.length,2);
  assert.equal(ledger.rows.length,4);

  state.mode='final';
  const collection={requestId:'FAKE_COLLECTION_0001',customerName:'FAKE_CUSTOMER',
    amount:'50',operation:'payment_received',paymentMethod:'نقدي',refNo:'FAKE_SAL_1',source:'OFFLINE_TEST'};
  r=call('saveCustomerAccountMovementV1915_',collection);
  assert.equal(r.success,true,JSON.stringify(r));
  assert.equal(r.balanceBefore,120);assert.equal(r.balance,70);
  assert.equal(state.bal.get('customer|FAKE_CUSTOMER'),70);
  assert.equal(ledger.rows.length,5);assert.equal(cash.rows.length,3);
  const again=call('saveCustomerAccountMovementV1915_',collection);
  assert.equal(again.duplicatePrevented,true);
  assert.equal(state.bal.get('customer|FAKE_CUSTOMER'),70);
  assert.equal(ledger.rows.length,5);assert.equal(cash.rows.length,3);
  const overpay=call('saveCustomerAccountMovementV1915_',{...collection,requestId:'FAKE_COLLECTION_0002',amount:'71'});
  assert.equal(overpay.success,false);assert.match(overpay.message,/أكبر من مديونية/);
  assert.equal(cash.rows.length,3);assert.equal(state.bal.get('customer|FAKE_CUSTOMER'),70);
  assert.equal(state.audits.length,1);
});

test('joined daily report exposes the real remaining-credit and cost-evidence gaps, NOT acceptance',()=>{
  const h=scenario(),{call,context,state,s}=h;
  let p=call('saveEasyStorePurchaseV2_',{requestId:'FAKE_PURCHASE_0002',supplier:'FAKE_SUPPLIER',
    invoiceNo:'FAKE_PUR_2',material:'FAKE_MDF',qty:'3',unit:'100',total:'300',paid:'100',department:'ليزر',date:WORK_DATE});
  assert.equal(p.success,true);
  let sale=call('saveEasyStoreSaleV2_',{requestId:'FAKE_SALE_0002',customer:'FAKE_CUSTOMER',no:'FAKE_SAL_2',
    item:'FAKE_ITEM',qty:'1',unit:'200',paid:'80',department:'ليزر',date:WORK_DATE});
  assert.equal(sale.success,true);
  state.mode='final';
  assert.equal(call('saveCustomerAccountMovementV1915_',{requestId:'FAKE_COLLECT_0002',customerName:'FAKE_CUSTOMER',
    operation:'payment_received',amount:'50'}).success,true);
  state.mode='full';
  const response=call('getDailyDepartmentReportV1920_',{workDate:WORK_DATE,department:'كل الأقسام'});
  assert.equal(response.success,true);
  assert.equal(response.report.purchases,300);
  assert.equal(response.report.sales,200);
  assert.equal(response.report.receipts,130);
  assert.equal(response.report.payments,100);
  // ACTUAL old-code discrepancy: report 'credit' is snapshot invoice remainder,
  // even though later customer collection reduced actual balance to 70.
  assert.equal(response.report.credit,120);
  assert.equal(state.bal.get('customer|FAKE_CUSTOMER'),70);
  assert.equal(response.report.credit-state.bal.get('customer|FAKE_CUSTOMER'),50);
  // ACTUAL incomplete costing: no real production costing in this direct-sale
  // lane. An arithmetic gross number MUST NOT be accepted as actual profit.
  assert.equal(response.report.actualJobCost,0);
  assert.equal(response.report.profit,200);
  assert.equal(s.deptLines.rows.length,0);
  assert.equal(response.report.lineCount,0);
  assert.equal(response.report.cash,80);
  assert.equal(response.report.credit>state.bal.get('customer|FAKE_CUSTOMER'),true,'unadjusted invoice credit must be classified as a reconciliation gap');
});

test('closing is permissioned, blocked on open work, department-ordered and idempotent; still NOT finance GO',()=>{
  const h=scenario(),{call,state,closes}=h;
  const opts={workDate:WORK_DATE,department:'كل الأقسام',requestId:'FAKE_DAY_CLOSE_ALL_1'};
  state.mode='final';
  let r=call('closeDepartmentDayV1920_',opts);
  assert.equal(r.success,false);assert.match(r.message,/ضياء فقط/);assert.equal(closes.rows.length,0);
  state.mode='full';
  state.blockers.pendingPurchases=[{department:'ليزر'}];
  r=call('closeDepartmentDayV1920_',{...opts,department:'ليزر'});
  assert.equal(r.success,false);assert.match(r.message,/مشتريات القسم المعلقة/);
  assert.equal(closes.rows.length,0);
  state.blockers.pendingPurchases=[];
  r=call('closeDepartmentDayV1920_',opts);
  assert.equal(r.success,false);assert.match(r.message,/اقفل الليزر والطباعة أولًا/);
  assert.equal(closes.rows.length,0);
  const laser=call('closeDepartmentDayV1920_',{...opts,department:'ليزر',requestId:'FAKE_DAY_LASER_1'});
  assert.equal(laser.success,true,JSON.stringify(laser));
  assert.equal(closes.rows.length,1);
  const duplicate=call('closeDepartmentDayV1920_',{...opts,department:'ليزر'});
  assert.equal(duplicate.duplicatePrevented,true);assert.equal(closes.rows.length,1);
  const print=call('closeDepartmentDayV1920_',{...opts,department:'طباعة',requestId:'FAKE_DAY_PRINT_1'});
  assert.equal(print.success,true);assert.equal(closes.rows.length,2);
  r=call('closeDepartmentDayV1920_',opts);
  assert.equal(r.success,true);assert.equal(closes.rows.length,3);
  assert.ok(closes.rows.every(x=>x['مفتاح الطلب']));
  assert.equal(call('closeDepartmentDayV1920_',opts).duplicatePrevented,true);
  assert.equal(closes.rows.length,3);
});

test('the attached candidate remains D1 READONLY and financial write OFF',()=>{
  const config=fs.readFileSync(path.join(__dirname,'..','config.js'),'utf8');
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
  assert.match(config,/EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  assert.match(app,/EASYSTORE_ACCOUNTING_D1_WRITE_MODE/);
  assert.doesNotMatch(app,/refundEasyStoreSaleV2\s*\(/);
});
