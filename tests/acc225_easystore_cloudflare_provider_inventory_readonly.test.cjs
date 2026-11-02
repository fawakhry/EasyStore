'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {inventory,validate}=require('../scripts/easystore_cloudflare_provider_inventory_readonly.cjs');
const accountId='11111111111111111111111111111111';
const token='FAKE_LOCAL_NO_PROVIDER_SECRET_1234567890';
const workerName='easystore-fixture-stage';
const d1Name='easystore-fixture-stage-db';
const uuid='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const routes={
  ['/accounts/'+accountId+'/workers/scripts']:[{id:workerName},{id:'trendos-d1-api'}],
  ['/accounts/'+accountId+'/d1/database?per_page=100&page=1']:[{name:d1Name,uuid}],
  ['/accounts/'+accountId+'/workers/scripts/'+workerName+'/settings']:{
    bindings:[{type:'d1',name:'DB',id:uuid},{type:'secret_text',name:'DO_NOT_REPORT',text:'sensitive'}]
  },
  ['/accounts/'+accountId+'/workers/scripts/'+workerName+'/deployments']:{
    deployments:[
      {id:'first-deployment',versions:[{version_id:'active-version',percentage:100}]},
      {id:'older-deployment',versions:[{version_id:'old-version',percentage:100}]}
    ]
  }
};
const makeFetch=(data=routes,seen=[])=>async(url,init)=>{
  assert.equal(init.method,'GET');
  assert.equal(init.redirect,'error');
  assert.equal(init.headers.Authorization,'Bearer '+token);
  assert.ok(url.startsWith('https://api.cloudflare.com/client/v4/accounts/'+accountId+'/'));
  seen.push(url);
  const path=url.replace('https://api.cloudflare.com/client/v4','');
  const body=data[path];
  return {ok:body!==undefined,json:async()=>({success:true,result:body})};
};
const args={accountId,token,workerName,d1Name};
test('exact real-provider-shape metadata only, no money release or secrets in output',async()=>{
  const seen=[];
  const output=await inventory({...args,fetcher:makeFetch(routes,seen)});
  assert.equal(seen.length,4);
  assert.equal(output.verification,'PROVIDER_METADATA_READ_ONLY');
  assert.equal(output.workerName,workerName);
  assert.equal(output.d1Uuid,uuid);
  assert.equal(output.d1BindingName,'DB');
  assert.equal(output.deploymentId,'first-deployment');
  assert.equal(output.versions[0].versionId,'active-version');
  assert.equal(output.previousDeploymentId,'older-deployment');
  assert.equal(output.gitSourceSha,'NOT_ATTESTED');
  assert.equal(output.stageApiUrl,'NOT_ATTESTED');
  assert.equal(output.financeRelease,'NO_GO');
  assert.equal(output.postedMoney,false);
  const printed=JSON.stringify(output);
  assert.ok(!printed.includes(token));
  assert.ok(!printed.includes('sensitive'));
});
test('reject missing provider evidence rather than assume an account or Worker',()=>{
  assert.throws(()=>validate({...args,accountId:''}),/EXPLICIT_PRIVATE_PROVIDER_INPUT_REQUIRED/);
  assert.throws(()=>validate({...args,token:''}),/EXPLICIT_PRIVATE_PROVIDER_INPUT_REQUIRED/);
  assert.throws(()=>validate({...args,workerName:''}),/EXPLICIT_PRIVATE_PROVIDER_INPUT_REQUIRED/);
  assert.throws(()=>validate({...args,d1Name:''}),/EXPLICIT_PRIVATE_PROVIDER_INPUT_REQUIRED/);
  assert.throws(()=>validate({...args,workerName:'trendos-d1-api'}),/TRENDOS_PROVIDER_NOT_EASYSTORE_INDEPENDENT/);
  assert.throws(()=>validate({...args,d1Name:'trendos-main'}),/TRENDOS_PROVIDER_NOT_EASYSTORE_INDEPENDENT/);
  assert.throws(()=>validate({...args,workerName:'../other'}),/EXPLICIT_PRIVATE_PROVIDER_INPUT_REQUIRED/);
});
test('fail closed if exact matching Worker missing',async()=>{
  const t={...routes,['/accounts/'+accountId+'/workers/scripts']:[{id:'unrelated'}]};
  await assert.rejects(inventory({...args,fetcher:makeFetch(t)}),/EXACT_EASYSTORE_WORKER_NOT_FOUND/);
});
test('fail closed if D1 is missing, duplicated, or mismatched binding',async()=>{
  const p='/accounts/'+accountId+'/d1/database?per_page=100&page=1';
  const s='/accounts/'+accountId+'/workers/scripts/'+workerName+'/settings';
  await assert.rejects(inventory({...args,fetcher:makeFetch({...routes,[p]:[]})}),/EXACT_EASYSTORE_D1_NOT_FOUND/);
  await assert.rejects(inventory({...args,fetcher:makeFetch({...routes,[p]:[routes[p][0],routes[p][0]]})}),/EXACT_EASYSTORE_D1_NOT_FOUND/);
  await assert.rejects(inventory({...args,fetcher:makeFetch({...routes,[s]:{bindings:[]}})}),/WORKER_D1_EXACT_BINDING_NOT_ATTESTED/);
});
test('do not assert deploy or live source revision without version evidence',async()=>{
  const path='/accounts/'+accountId+'/workers/scripts/'+workerName+'/deployments';
  await assert.rejects(inventory({...args,fetcher:makeFetch({...routes,[path]:{deployments:[]}})}),
    /WORKER_ACTIVE_DEPLOYMENT_UNVERIFIED/);
  await assert.rejects(inventory({...args,fetcher:makeFetch({...routes,[path]:{deployments:[{id:'unknown',versions:[]}]}})}),
    /WORKER_VERSION_UNVERIFIED/);
});
test('provider HTTP failure stops without leaking credentials or response text',async()=>{
  const failFetch=async(url,init)=>{
    assert.equal(init.method,'GET');
    return {ok:false,status:403,json:async()=>({errors:[{message:token}]})};
  };
  await assert.rejects(inventory({...args,fetcher:failFetch}),e=>{
    assert.equal(e.code,'CLOUDFLARE_METADATA_HTTP_FAILED');
    assert.ok(!e.message.includes(token));return true;
  });
});
