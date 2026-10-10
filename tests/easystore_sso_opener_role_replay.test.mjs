import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function slice(start, end) {
  const a = app.indexOf(start);
  const b = app.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'missing SSO source segment');
  return app.slice(a, b);
}
const persist = slice('  function persistTrendosSso(payload){', '\n\n  function entry619SchedulePostSsoRead(){');
const receiver = slice("  window.addEventListener('message', function(event){", '\n\n  async function ensureTrendosSso(){');

function scenario({openerPresent=true, sameSource=true, origin='https://trendos-ui.trendmall-contact.workers.dev', nonce='fresh-nonce', issuedAt=Date.now()} = {}) {
  const messages=[], shellRenders=[], acks=[], stored=new Map(), user={name:'موظف',username:'employee',token:'',mode:'',department:''};
  const state={active:'sales',accountingScope:'all'};
  const opener={postMessage(message,targetOrigin){acks.push({message,targetOrigin});}};
  const other={postMessage(){}};
  let settled=0, reloaded=0;
  const window={opener:openerPresent?opener:null,addEventListener(type,handler){if(type==='message')messages.push(handler);}};
  const local={
    window, user, state,
    sessionStorage:{setItem:(k,v)=>stored.set(k,String(v))},
    qs:new URLSearchParams('from=trendos&employeeSSO=1&ssoNonce=fresh-nonce&screen=dashboard'),
    ssoReadySettled:false,
    ssoReadyResolve(){settled++;},
    initialScreen(){return user.mode==='admin'?'dashboard':'sales';},
    initialAccountingScope(){return user.mode==='admin'?'laser':'all';},
    shell(){shellRenders.push({name:user.name,active:state.active,scope:state.accountingScope});},
    entry619SchedulePostSsoRead(){reloaded++;},
    Date,console
  };
  vm.createContext(local);
  vm.runInContext([
    "const TRENDOS_SSO_MESSAGE_V1='TRENDOS_EMPLOYEE_SSO_V1';",
    "const EASYSTORE_SSO_ACK_V1='EASYSTORE_EMPLOYEE_SSO_ACK_V1';",
    "const TRENDOS_SSO_ALLOWED_ORIGINS=new Set(['https://trendos-ui.trendmall-contact.workers.dev','https://fawakhry.github.io']);",
    persist,
    receiver
  ].join('\n'), local);
  assert.equal(messages.length,1,'single receiver must be registered');
  const emit=(next={})=>messages[0]({
    origin:next.origin??origin,
    source:next.sameSource===false?other:(sameSource?opener:other),
    data:{
      type:'TRENDOS_EMPLOYEE_SSO_V1',
      nonce:next.nonce??nonce,
      issuedAt:next.issuedAt??issuedAt,
      user:{name:'Diaa',username:'diaa',token:next.token??'ONLY-A-SYNTHETIC-TEST-TOKEN',mode:'admin',department:''}
    }
  });
  return {emit,user,state,stored,shellRenders,acks,get resolved(){return settled;},get loaded(){return reloaded;}};
}
function rejected(opts,reason){
  const s=scenario(opts);
  s.emit();
  assert.equal(s.user.token,'','reject '+reason);
  assert.equal(s.resolved,0,reason);
  assert.equal(s.shellRenders.length,0,reason);
  assert.equal(s.acks.length,0,reason);
  assert.equal(s.stored.size,0,reason);
}
rejected({openerPresent:false},'missing opener cannot authenticate');
rejected({sameSource:false},'wrong source window');
rejected({origin:'https://untrusted.invalid'},'wrong origin');
rejected({nonce:'different-nonce'},'nonce mismatch');
rejected({issuedAt:Date.now()-60000},'stale message');
rejected({issuedAt:Date.now()+60000},'future message');

const s=scenario();
s.emit();
assert.equal(s.user.username,'diaa');
assert.equal(s.user.token,'ONLY-A-SYNTHETIC-TEST-TOKEN');
assert.equal(s.state.active,'dashboard','admin requested screen recomputed AFTER real token');
assert.equal(s.state.accountingScope,'laser','user-specific scope recomputed after token');
assert.equal(s.shellRenders.length,1,'full tabs/header rebuilt on authenticated SSO');
assert.equal(s.shellRenders[0].active,'dashboard');
assert.equal(s.resolved,1);
assert.equal(s.loaded,1);
assert.equal(s.acks.length,1);
assert.equal(s.acks[0].message.type,'EASYSTORE_EMPLOYEE_SSO_ACK_V1');
assert.equal(s.acks[0].message.nonce,'fresh-nonce');
assert.equal(s.acks[0].targetOrigin,'https://trendos-ui.trendmall-contact.workers.dev');
assert.ok(s.stored.has('EASYSTORE_SESSION_V1922'),'bound SSO session persisted');
s.emit({token:'REPLAY-SHOULD-NEVER-REPLACE-FIRST-TOKEN'});
assert.equal(s.user.token,'ONLY-A-SYNTHETIC-TEST-TOKEN','nonce accepted at most once');
assert.equal(s.shellRenders.length,1,'replayed message must not rebuild shell');
assert.equal(s.acks.length,1,'replayed message must not acknowledge again');
console.log('ACC154_OPENER_ORIGIN_NONCE_EXPIRY_REPLAY=PASS');
console.log('ACC154_AUTHENTICATED_ADMIN_SHELL_REFRESH=PASS');
console.log('ACC154_FINANCIAL_MUTATION=NO');
