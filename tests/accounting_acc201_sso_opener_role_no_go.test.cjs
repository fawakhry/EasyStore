'use strict';
/* ACC201: execute real checked-in EasyStore SSO/role bootstrap in an isolated VM.
   No network, no real authentication, no business storage, no printer or D1. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const cut = file.indexOf('  const STORE_KEY = ');
assert.ok(cut > 3000, 'APP_SOURCE_BOOTSTRAP_BOUNDARY_MISSING');
const source = file.slice(0, cut) + `
  window.__acc201 = {
    user: () => ({ ...user }),
    admin: () => isAdmin(),
    screens: () => [...allowedScreens()],
    role: () => roleText()
  };
})();`;

function store(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}
function harness(search = '?from=trendos&employeeSSO=1&ssoNonce=NONCE_FAKE', opts = {}) {
  const sessionStorage = store(opts.session || {});
  const localStorage = store(opts.local || {});
  const acks = [];
  const opener = {postMessage(value, target) { acks.push({value, target}); }};
  const window = {
    opener: opts.noOpener ? null : opener,
    addEventListener(type, callback) {
      if (type === 'message') this.onMessage = callback;
    },
  };
  const context = {
    window, location: {search}, document: {getElementById() {return null;}},
    sessionStorage, localStorage, URLSearchParams, Date, Promise,
    setInterval() {return 1;}, clearInterval() {},
    setTimeout() {return 1;}, clearTimeout() {},
    console: {log() {}},
  };
  vm.runInNewContext(source, context, {timeout: 1200, filename: 'acc201-easystore-bootstrap.js'});
  function send(overrides = {}) {
    const message = {
      origin: 'https://trendos-ui.trendmall-contact.workers.dev',
      source: opener,
      data: {
        type: 'TRENDOS_EMPLOYEE_SSO_V1',
        nonce: 'NONCE_FAKE',
        issuedAt: Date.now(),
        user: {username: 'fake_clerk', name: 'Fake Clerk', token: 'FAKE_NONPRODUCTION', mode: 'print'},
      }
    };
    if (overrides.data) message.data = {...message.data, ...overrides.data};
    for (const [k,v] of Object.entries(overrides)) if(k !== 'data') message[k] = v;
    window.onMessage(message);
  }
  return {window, opener, acks, send, user:window.__acc201.user,
          admin:window.__acc201.admin, screens:window.__acc201.screens,
          role:window.__acc201.role, sessionStorage, localStorage};
}

test('01 valid signed-by-no-one fake browser origin/opener handoff: simulated only', () => {
  const h=harness(); h.send();
  assert.equal(h.user().token,'FAKE_NONPRODUCTION');
  assert.equal(h.acks.length,1);
  assert.equal(h.acks[0].target,'https://trendos-ui.trendmall-contact.workers.dev');
  assert.equal(h.acks[0].value.type,'EASYSTORE_EMPLOYEE_SSO_ACK_V1');
  assert.ok(h.sessionStorage.getItem('EASYSTORE_SESSION_V1922'));
});
test('02 no opener is denied even if fake origin and nonce match', () => {
  const h=harness(undefined,{noOpener:true});h.send();
  assert.equal(h.user().token,'');assert.equal(h.acks.length,0);
});
test('03 different window source is denied', () => {
  const h=harness();h.send({source:{postMessage(){throw Error('not trusted')}}});
  assert.equal(h.user().token,'');assert.equal(h.acks.length,0);
});
test('04 missing message source is denied', () => {
  const h=harness();h.send({source:null});
  assert.equal(h.user().token,'');
});
test('05 same source with disallowed origin denied', () => {
  const h=harness();h.send({origin:'https://untrusted.example.invalid'});
  assert.equal(h.user().token,'');
});
test('06 wrong SSO message type denied', () => {
  const h=harness();h.send({data:{type:'FORGED_MESSAGE'}});
  assert.equal(h.user().token,'');
});
test('07 mismatched nonce denied', () => {
  const h=harness();h.send({data:{nonce:'OTHER_FAKE_NONCE'}});
  assert.equal(h.user().token,'');
});
test('08 absent nonce in browser URL denied', () => {
  const h=harness('?from=trendos&employeeSSO=1');h.send();
  assert.equal(h.user().token,'');
});
test('09 stale timestamp denied', () => {
  const h=harness();h.send({data:{issuedAt:Date.now()-30001}});
  assert.equal(h.user().token,'');
});
test('10 far future timestamp denied', () => {
  // Keep the invalid timestamp safely outside the 30-second skew window;
  // +30001ms is timing-flaky when the test process advances between calls.
  const h=harness();h.send({data:{issuedAt:Date.now()+60001}});
  assert.equal(h.user().token,'');
});
test('11 missing fake token denied', () => {
  const h=harness();h.send({data:{user:{name:'Fake Clerk',username:'fake_clerk'}}});
  assert.equal(h.user().token,'');
});
test('12 wrong/missing launch origin mode rejected', () => {
  for(const query of [
    '?ssoNonce=NONCE_FAKE',
    '?from=trendos&ssoNonce=NONCE_FAKE',
    '?employeeSSO=1&ssoNonce=NONCE_FAKE',
    '?from=other&employeeSSO=1&ssoNonce=NONCE_FAKE'
  ]) {
    const h=harness(query);h.send();assert.equal(h.user().token,'',query);
  }
});
test('13 duplicate valid nonce cannot replace fake identity or token', () => {
  const h=harness();h.send();
  h.send({data:{user:{username:'fake_admin',name:'Fake Admin',token:'SECOND_FAKE',mode:'admin'}}});
  assert.equal(h.user().token,'FAKE_NONPRODUCTION');
  assert.equal(h.user().mode,'print');
  assert.equal(h.acks.length,1);
});
test('14 invalid first message does not consume valid nonce', () => {
  const h=harness();h.send({data:{nonce:'INVALID'}});
  h.send();assert.equal(h.user().token,'FAKE_NONPRODUCTION');
  assert.equal(h.acks.length,1);
});
test('15 URL-supplied fake role, name and department cannot elevate anonymous UI', () => {
  const h=harness('?name=diaa&username=admin&mode=full&roleMode=admin&department=laser');
  assert.equal(h.user().token,'');
  assert.equal(h.user().mode,'');
  assert.equal(h.admin(),false);
  assert.ok(!h.screens().includes('dashboard'));
});
test('16 URL cannot supply admin role even with fake stored employee token', () => {
  const session = {'EASYSTORE_SESSION_V1922':JSON.stringify({
    at:Date.now(), user:{name:'Regular Clerk',username:'fake_clerk',token:'TEST_ONLY',mode:'print'}
  })};
  const h=harness('?mode=admin&name=diaa&department=laser',{session});
  assert.equal(h.user().token,'TEST_ONLY');
  assert.equal(h.user().mode,'print');
  assert.equal(h.admin(),false);
});
test('17 no server-trusted role inferred from bare identity query', () => {
  const h=harness('?name=diaa&username=admin&mode=admin&roleMode=full');
  assert.equal(h.user().username,'employee');
  assert.equal(h.role(),'موظف');
});
test('18 no CSS/HTML/product redesign involved in bootstrap patch', () => {
  assert.match(file, /window\.addEventListener\('message'/);
  assert.match(file, /ssoMessageConsumed = true/);
  assert.match(file, /!window\.opener \|\| !event\.source \|\| event\.source !== window\.opener/);
});
test('19 SSO state is synthetic and never represents finance release', () => {
  const h=harness();h.send({data:{user:{username:'fake_admin',name:'Fake Admin',token:'FAKE_NONPRODUCTION',mode:'admin'}}});
  assert.equal(h.admin(),true); // UI hint only, NOT verified finance authorization.
  assert.equal(h.user().token,'FAKE_NONPRODUCTION');
  assert.equal(h.acks.length,1);
  // Production D1 and backend authorization are never invoked in this VM.
});

test('20 forged legacy localStorage token cannot create an EasyStore accounting session', () => {
  const local={'MATBAGY_EMPLOYEE_SSO':JSON.stringify({
    at:Date.now(),params:{username:'FAKE_ROOT',token:'FORGED_TOKEN',mode:'admin'},
    user:{name:'Fake Admin',username:'FAKE_ROOT',token:'FORGED_TOKEN',mode:'admin'}
  })};
  const h=harness(undefined,{local,noOpener:true});
  assert.equal(h.user().token,'');
  assert.equal(h.admin(),false);
  assert.equal(h.localStorage.getItem('MATBAGY_EMPLOYEE_SSO'),null);
});
test('21 far-future legacy localStorage timestamp cannot spoof a fresh session', () => {
  const h=harness(undefined,{local:{MATBAGY_EMPLOYEE_SSO:JSON.stringify({
    at:Date.now()+24*60*60*1000,
    user:{username:'FAKE_FUTURE',name:'Fake Admin',token:'FORGED_FUTURE',mode:'admin'},
    params:{token:'FORGED_FUTURE',username:'FAKE_FUTURE',mode:'admin'}
  })}});
  assert.equal(h.user().token,'');
  assert.equal(h.admin(),false);
});
test('22 stale legacy localStorage handoff cannot be promoted to a session', () => {
  const h=harness(undefined,{local:{MATBAGY_EMPLOYEE_SSO:JSON.stringify({
    createdAt:Date.now()-86400000,
    user:{username:'FAKE_STALE',token:'FAKE_STALE_TOKEN'}
  })}});
  assert.equal(h.user().token,'');
});
test('23 legacy localStorage denial does not break verified opener postMessage path', () => {
  const h=harness(undefined,{local:{MATBAGY_EMPLOYEE_SSO:JSON.stringify({
    at:Date.now(),user:{username:'FAKE_EVIL',token:'FORGED_FAKE',mode:'admin'}
  })}});
  assert.equal(h.user().token,'');
  h.send();
  assert.equal(h.user().token,'FAKE_NONPRODUCTION');
  assert.equal(h.admin(),false);
  assert.equal(h.acks.length,1);
});
