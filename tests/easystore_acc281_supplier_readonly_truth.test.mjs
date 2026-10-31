import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('app.js','utf8');
const cfg=fs.readFileSync('config.js','utf8');
const start=app.indexOf('  function screenSuppliers(){');
const end=app.indexOf('\n  function screenCustomers(){',start);
assert.ok(start>=0&&end>start,'read the original EasyStore supplier screen');
const source=app.slice(start,end);
const supplierScreen=new vm.Script('('+source+')');

function simulate(status,serverRows=[],localRows=[]){
  let tableCalls=0;
  const ctx={state:{
    supplierDirectory:{status,rows:serverRows},
    data:{suppliers:localRows}
  },esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
  table:(rows,head,render)=>{
    tableCalls++;
    return rows.length?'<table>'+rows.map(r=>'<tr>'+render(r).join('|')+'</tr>').join('')+'</table>':'<div>لا توجد بيانات حتى الآن</div>';
  }};
  const html=supplierScreen.runInNewContext(ctx)();
  return {html,tableCalls};
}

test('ACC281 public R0: supplier page refuses fake empty D1 or local-cache proof',()=>{
  const stale=[{partyId:'SUP-LOCAL-STORED',name:'Unverified local fake'}];
  const failed=simulate('failed',[],stale);
  assert.match(failed.html,/تعذر التحقق من قراءة الموردين من D1/);
  assert.doesNotMatch(failed.html,/لا توجد بيانات حتى الآن/);
  assert.doesNotMatch(failed.html,/SUP-LOCAL-STORED/);
  assert.equal(failed.tableCalls,0);
  const initial=simulate('unchecked',[],stale);
  assert.match(initial.html,/جارٍ التحقق من دليل الموردين/);
  assert.equal(initial.tableCalls,0);
  const loading=simulate('loading');
  assert.equal(loading.tableCalls,0);
});

test('ACC281 public R0: only actual validated D1 response can claim an empty list',()=>{
  const empty=simulate('verified');
  assert.match(empty.html,/تم التحقق من قراءة دليل الموردين من D1\. عدد الموردين: 0/);
  assert.match(empty.html,/لا توجد بيانات حتى الآن/);
  assert.equal(empty.tableCalls,1);
});

test('ACC281 public R0: verified original D1 identifiers shown; write form not exposed',()=>{
  const out=simulate('verified',[{partyId:'SUP-DEMO-001',name:'Synthetic supplier',phone:'01FAKE'}],
    [{partyId:'SUP-LOCAL-UNVERIFIED',name:'Local cache'}]);
  assert.match(out.html,/SUP-DEMO-001/);
  assert.match(out.html,/Synthetic supplier/);
  assert.doesNotMatch(out.html,/SUP-LOCAL-UNVERIFIED/);
  assert.match(out.html,/disabled aria-disabled="true"/);
  assert.doesNotMatch(out.html,/onclick="ES27\.saveSupplier\(\)"/);
  assert.doesNotMatch(out.html,/supOpening/);
});

test('ACC281 original-D1 supplier GET must be validated and error must fail visibly',()=>{
  assert.match(app,/state\.supplierDirectory=\{status:'loading',rows:\[\]\}/);
  assert.match(app,/extras\[1\]\.success===true&&Array\.isArray\(extras\[1\]\.suppliers\)/);
  assert.match(app,/state\.supplierDirectory=\{status:'verified',rows:supplierRows\}/);
  assert.match(app,/state\.supplierDirectory=\{status:'failed',rows:\[\]\}/);
  assert.match(cfg,/window\.EASYSTORE_ACCOUNTING_D1_WRITE_MODE\s*=\s*'OFF'/);
  assert.match(cfg,/window\.EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/);
  assert.match(app,/if\(accountingWriteRequested && writeMode!=='CANARY'\) throw new Error/);
  assert.match(app,/const A213_ACCOUNTING_WRITE_ACTIONS_FAIL_CLOSED = new Set\([^\n]*"saveEasyStoreSupplier"/);
});
