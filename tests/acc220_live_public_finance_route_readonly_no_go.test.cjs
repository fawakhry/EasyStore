'use strict';
/**
 * ACC220 READ-ONLY PUBLIC RUNTIME ROUTE AUDIT (finance remains NO_GO).
 * Tests ONLY anonymous GET to two fixed public endpoints already known to the
 * existing ES-ZG book. Never carries SSO, Cloudflare tokens, user ids or POST.
 * Frontend route evidence does not prove cloud-account identity.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const https=require('node:https');
const urls=Object.freeze({
  easyStoreConfig:'https://fawakhry.github.io/EasyStore/config.js',
  accountingHealth:'https://trendos-d1-api.trendmall-contact.workers.dev/v1/employee/accounting/health'
});
const statuses={};
const allowHosts=new Set(['fawakhry.github.io','trendos-d1-api.trendmall-contact.workers.dev']);
function readOnlyGet(urlText){
  return new Promise((resolve,reject)=>{
    const parsed=new URL(urlText);
    if(parsed.protocol!=='https:'||!allowHosts.has(parsed.hostname)||
       parsed.username||parsed.password||parsed.search||parsed.hash)
      return reject(new Error('READONLY_EXACT_HOST_OR_PATH_REQUIRED'));
    const req=https.request(parsed,{method:'GET',timeout:12000,
      headers:{'accept':'text/plain, application/json','cache-control':'no-cache','user-agent':'EasyStore-ACC220-Readonly-Audit'}},resp=>{
      if(resp.statusCode!==200){resp.resume();return reject(new Error('READONLY_HTTP_'+resp.statusCode));}
      if(resp.headers.location){resp.resume();return reject(new Error('REDIRECT_NOT_VERIFIED'));}
      const chunks=[];let n=0;
      resp.on('data',chunk=>{n+=chunk.length;if(n>45000){req.destroy(new Error('PUBLIC_RESPONSE_TOO_LARGE'));return;}chunks.push(chunk)});
      resp.once('error',reject);
      resp.once('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.once('timeout',()=>req.destroy(new Error('PUBLIC_READ_TIMEOUT')));
    req.once('error',reject);
    req.end();
  });
}
function flag(code,actual,expected){
  assert.equal(actual,expected,code);
  statuses[code]='PASS';
}
function literal(js,name){
  const m=js.match(new RegExp('window\\.'+name+'\\s*=\\s*(?:\\n\\s*)?["\\x27]([^"\\x27]+)["\\x27]'));
  return m&&m[1];
}
test('ACC220: anonymous PUBLIC GET health reports READONLY and no authorized writers',async()=>{
  const live=JSON.parse(await readOnlyGet(urls.accountingHealth));
  flag('SCHEMA_READY',live.success===true&&live.schemaReady===true,true);
  flag('LIVE_CONTROL_READONLY',live.mode,'READONLY');
  flag('LIVE_FINANCE_AUTHORITY_OFF',live.authoritativeWrites,false);
  flag('LIVE_WRITER_MODE_OFF',live.writeAuthorityMode,'OFF');
  flag('LIVE_WRITER_USER_ALLOWLIST_ZERO',live.writeCanaryAllowedUserCount,0);
  flag('LIVE_WRITER_ACTION_ALLOWLIST_ZERO',live.writeCanaryAllowedActionCount,0);
  flag('LIVE_CANARY_AMOUNT_CAP_ZERO',live.writeCanaryMaxAmount,0);
  flag('LIVE_GOOGLE_BUSINESS_AUTHORITY_OFF',live.appsScriptBusinessAuthority,false);
  flag('LIVE_GOOGLE_BUSINESS_CALLS_SELF_REPORTED_ZERO',live.googleBusinessCalls,0);
  assert.ok(Number.isSafeInteger(live.policyEpoch)&&live.policyEpoch>0);
  // Disabled by empty list, even when a different rollout bit is true;
  // never infer actual permission from writeCanaryEnabled alone.
  console.log('ACC220_LIVE_PUBLIC_HEALTH_READONLY=PASS');
  console.log('ACC220_LIVE_HEALTH_POLICY_EPOCH='+live.policyEpoch);
  console.log('ACC220_LIVE_HEALTH_SELF_REPORT_ONLY=YES');
});
test('ACC220: public EasyStore Pages still has finance write OFF and points at a TrendOS-named route',async()=>{
  const js=await readOnlyGet(urls.easyStoreConfig);
  flag('LIVE_EASYSTORE_CONFIG_VERSION',literal(js,'EASYSTORE_VERSION'),'ES47 V1922 Unified Safe Build');
  flag('PAGES_FINANCE_WRITE_OFF',literal(js,'EASYSTORE_ACCOUNTING_D1_WRITE_MODE'),'OFF');
  flag('PAGES_FINANCE_LEGACY_WRITES_OFF',/window\.EASYSTORE_ACCOUNTING_D1_WRITES\s*=\s*false/.test(js),true);
  flag('PAGES_FINANCE_D1_READONLY',/window\.EASYSTORE_ACCOUNTING_D1_READONLY\s*=\s*true/.test(js),true);
  const endpoint=literal(js,'EASYSTORE_ACCOUNTING_D1_URL');
  flag('PAGES_POINTS_TO_TRENDOS_NAMED_WORKER',endpoint,urls.accountingHealth.slice(0,-'/health'.length));
  flag('PAGES_STILL_HAS_LEGACY_APPS_SCRIPT_REFERENCE',js.includes('script.google.com/macros/s/'),true);
  flag('PAGES_LEGACY_SECURE_PROXY_EMPTY',/window\.MATBAGY_SECURE_API_PROXY_URL\s*=\s*["\x27]["\x27]/.test(js),true);
  console.log('ACC220_PAGES_ROUTE_IS_TRENDOS_NAMED_WORKER=TRUE');
  console.log('ACC220_PAGES_LEGACY_APPS_SCRIPT_ROUTE_PRESENT=TRUE');
  console.log('ACC220_SEPARATE_EASYSTORE_CLOUD_IDENTITY=NOT_VERIFIED');
});
test('ACC220: anonymous check never claims a cloud-to-cloud financial acceptance',()=>{
 assert.equal(urls.easyStoreConfig.startsWith('https://'),true);
 assert.equal(urls.accountingHealth.includes('/health'),true);
 console.log('ACC220_HTTP_METHOD=GET_ONLY');
 console.log('ACC220_FINANCE_WRITES_ATTEMPTED=ZERO');
 console.log('ACC220_INDEPENDENT_CLOUD_DEPLOYED_SHA=NOT_VERIFIED');
 console.log('ACC220_FINANCE_RELEASE=NO_GO');
});
