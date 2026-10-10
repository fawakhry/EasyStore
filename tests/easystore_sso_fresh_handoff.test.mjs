import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = app.indexOf('  function readSso(){');
const end = app.indexOf('\n\n  const user = readSso();', start);
assert.ok(start !== -1 && end > start, 'readSso source boundary');
const readSsoSource = app.slice(start, end);

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

function readSso(params, session, local) {
  return new Function('qs', 'sessionStorage', 'localStorage', 'Date',
    readSsoSource + '\nreturn readSso();'
  )(new URLSearchParams(params), session, local, Date);
}

const cached = JSON.stringify({
  at: Date.now(),
  user: { name: 'PREVIOUS-ACCOUNT', username: 'PREVIOUS-ACCOUNT', token: 'STALE-TEST-ONLY-TOKEN' },
  params: { name: 'PREVIOUS-ACCOUNT', username: 'PREVIOUS-ACCOUNT', token: 'STALE-TEST-ONLY-TOKEN', mode: 'admin' }
});
const key = 'EASYSTORE_SESSION_V1922';

{
  const session = storage({[key]: cached});
  const local = storage();
  const user = readSso('from=trendos&employeeSSO=1&ssoNonce=fresh-nonce&username=Diaa', session, local);
  assert.equal(user.token, '', 'fresh nonce MUST NOT inherit a cached employee token');
  assert.equal(user.username, 'employee', 'fresh handoff must not trust URL-provided identity before authentication');
  assert.equal(session.getItem(key), null, 'old stored browser session should be invalidated');
}
{
  const session = storage({[key]: cached});
  const user = readSso('', session, storage());
  assert.equal(user.token, 'STALE-TEST-ONLY-TOKEN', 'legacy non-nonce path remains unchanged by this scoped fix');
}
{
  const session = storage();
  const user = readSso('from=trendos&employeeSSO=1&ssoNonce=other-nonce&username=Diaa', session, storage());
  assert.equal(user.token, '');
}
assert.match(app, /TRENDOS_SSO_ALLOWED_ORIGINS\.has/);
assert.match(app, /event\.source !== window\.opener/);
assert.match(app, /String\(data\.nonce \|\| ''\) !== expectedNonce/);
assert.match(app, /Math\.abs\(Date\.now\(\) - issuedAt\) > 30000/);
assert.match(app, /if\(!user\.token\)/);

console.log('EASYSTORE_SSO_FRESH_HANDOFF_FAIL_CLOSED=PASS');
console.log('EASYSTORE_SSO_LEGACY_NON_NONCE_COMPAT=PASS');
console.log('EASYSTORE_SSO_FINANCIAL_MUTATION=NO');
