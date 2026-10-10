import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appSource=fs.readFileSync('app.js','utf8');
const configSource=fs.readFileSync('config.js','utf8');
const marker='  let a213PilotServerReady=false;';
const mark=appSource.indexOf(marker);
const startup=appSource.indexOf('  const state = {');
assert.ok(mark>=0&&mark<startup, 'pilot readiness variable must initialize BEFORE initialScreen() invokes allowedScreens()');
assert.equal(appSource.split(marker).length-1,1,'pilot readiness declared once');

// Browser-like boot without real credentials, finance API, cloud writes or network.
const app={innerHTML:''};
const screen={innerHTML:''};
const other={innerHTML:'',classList:{toggle(){}},value:''};
const session=new Map(),local=new Map(),listeners=new Map();
const location={search:'?from=trendos&employeeSSO=1&ssoNonce=ACC160-FAKE-NONCE&screen=dashboard'};
const window={
  opener:{postMessage(){}},
  addEventListener(event,fn){listeners.set(event,fn);},
  EASYSTORE_ACCOUNTING_D1_READONLY:true
};
const document={
  getElementById(id){return id==='app'?app:id==='screen'?screen:other;},
  querySelectorAll(){return [];},
  addEventListener(){},
  querySelector(){return null}
};
const storage=data=>({
  getItem(k){return data.has(k)?data.get(k):null;},
  setItem(k,v){data.set(k,String(v));},
  removeItem(k){data.delete(k);}
});
const sandbox={
  window,document,location,
  sessionStorage:storage(session),localStorage:storage(local),
  URL,URLSearchParams,Date,Intl,Number,Math,JSON,Array,Object,Map,Set,
  console,Promise,AbortController,
  setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},
  history:{back(){}},
  fetch(){throw Error('No network allowed in startup test');}
};
const ctx=vm.createContext(sandbox);
vm.runInContext(configSource,ctx,{timeout:5000,filename:'config.js'});
assert.equal(window.EASYSTORE_ACCOUNTING_D1_WRITE_MODE,'OFF');
assert.deepEqual([...window.EASYSTORE_ACCOUNTING_D1_WRITE_CANARY_ACTIONS],[]);
vm.runInContext(appSource,ctx,{timeout:10000,filename:'app.js'});
assert.match(app.innerHTML,/إيزي ستور/,'initial shell should render even when SSO awaits verified message');
assert.match(screen.innerHTML,/فاتورة|لوحة|تسجيل|الفواتير/,'initial screen must not be blank');
assert.equal(typeof window.ES27?.go,'function','navigation installed');
assert.equal(typeof listeners.get('message'),'function','secure SSO receiver installed');

// Anonymous URL parameters alone must NOT grant Diaa's authorization.
assert.ok(!app.innerHTML.includes('A2.13 Canary — تقفيل عهدة صفرية'));
assert.ok(!screen.innerHTML.includes('تنفيذ تقفيل العهدة الصفرية مرة واحدة'));
const errors=[];
window.addEventListener('error',e=>errors.push(e.message));
assert.equal(errors.length,0);
console.log('A213_BLANK_SCREEN_BOOTSTRAP_IN_BROWSER_VM=PASS');
console.log('A213_PENDING_SSO_RNDERS_READONLY_SHELL=PASS');
console.log('A213_NO_TOKEN_OR_FINANCIAL_REQUEST=PASS');
