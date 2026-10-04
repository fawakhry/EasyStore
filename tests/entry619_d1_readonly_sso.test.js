const assert = require('assert');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const config = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(config, /EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/);
assert.match(config, /EASYSTORE_ACCOUNTING_D1_URL\s*=\s*"https:\/\/trendos-d1-api\.trendmall-contact\.workers\.dev\/v1\/employee\/accounting"/);
assert.match(config, /EASYSTORE_TRENDOS_SSO_HANDOFF_V1\s*=\s*true/);

assert.match(app, /TRENDOS_EMPLOYEE_SSO_V1/);
assert.match(app, /EASYSTORE_EMPLOYEE_SSO_ACK_V1/);
assert.match(app, /https:\/\/trendos-ui\.trendmall-contact\.workers\.dev/);
assert.match(app, /event\.source\s*!==\s*window\.opener/);
assert.match(app, /qs\.get\('ssoNonce'\)/);
assert.match(app, /Math\.abs\(Date\.now\(\)\s*-\s*issuedAt\)\s*>\s*30000/);
assert.match(app, /sessionStorage\.setItem\('EASYSTORE_SESSION_V1922'/);
assert.match(app, /ensureTrendosSso/);
assert.match(app, /entry619SchedulePostSsoRead/);
assert.match(app, /D1 READONLY/);
assert.match(app, /SSO OK/);

assert.match(app, /D1_ACCOUNTING_READ_ACTIONS\s*=\s*new Set\(\['getAccounting','getDeptInvoiceDraftV1887','getPartyAccountV1858'\]\)/);
assert.match(app, /EASYSTORE_ACCOUNTING_D1_READONLY\s*===\s*true/);
assert.match(app, /'Authorization':'Bearer '\+user\.token/);
assert.match(app, /'Content-Type':'application\/json'/);
assert.match(app, /MATBAGY_SECURE_API_PROXY_URL\|\|window\.TREND_API_URL/);
assert.match(app, /'Content-Type':'text\/plain;charset=utf-8'/);

assert.doesNotMatch(app, /searchParams\.set\([^\n]*(token)/i);
assert.match(index, /entry619-d1-readonly-sso2-20261004/);

console.log('Entry619 EasyStore secure SSO + D1 READONLY routing qualification passed');
