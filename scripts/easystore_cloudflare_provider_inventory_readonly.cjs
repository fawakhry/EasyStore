'use strict';
/**
 * ACC225 independent EasyStore Cloudflare provider inventory (metadata GET only).
 * Never deploys, mutates D1, reads financial rows, guesses a tenant, or authorizes finance.
 * Supply names/credentials via private runtime environment, NEVER commit tokens.
 */
const API='https://api.cloudflare.com/client/v4';
const isAccount=x=>typeof x==='string'&&/^[a-fA-F0-9]{32}$/.test(x);
const isName=x=>typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,120}$/.test(x);
const fail=(code)=>{const e=new Error(code);e.code=code;throw e;};
function validate({accountId,token,workerName,d1Name}){
  if(!isAccount(accountId)||!isName(workerName)||!isName(d1Name)||
    typeof token!=='string'||token.length<16)fail('EXPLICIT_PRIVATE_PROVIDER_INPUT_REQUIRED');
  if(workerName==='trendos-d1-api'||d1Name==='trendos-main')
    fail('TRENDOS_PROVIDER_NOT_EASYSTORE_INDEPENDENT');
}
async function inventory({accountId,token,workerName,d1Name,fetcher=globalThis.fetch}={}){
  validate({accountId,token,workerName,d1Name});
  if(typeof fetcher!=='function')fail('FETCH_UNAVAILABLE');
  async function get(path){
    const url=API+path;
    let response;
    try{
      response=await fetcher(url,{method:'GET',redirect:'error',
        headers:{Authorization:'Bearer '+token,Accept:'application/json'},
        signal:AbortSignal.timeout(12000)});
    }catch{fail('CLOUDFLARE_METADATA_NETWORK_FAILED');}
    if(!response||!response.ok)fail('CLOUDFLARE_METADATA_HTTP_FAILED');
    let payload;try{payload=await response.json();}catch{fail('CLOUDFLARE_METADATA_JSON_INVALID');}
    if(!payload||payload.success!==true)fail('CLOUDFLARE_METADATA_PROVIDER_REJECTED');
    return payload.result;
  }
  const base='/accounts/'+accountId;
  const scripts=await get(base+'/workers/scripts');
  if(!Array.isArray(scripts))fail('CLOUDFLARE_WORKER_LIST_SHAPE_UNKNOWN');
  const workers=scripts.filter(x=>x&&x.id===workerName);
  if(workers.length!==1)fail('EXACT_EASYSTORE_WORKER_NOT_FOUND');
  const matches=[];
  for(let page=1;page<=10;page++){
    const result=await get(base+'/d1/database?per_page=100&page='+page);
    if(!Array.isArray(result))fail('CLOUDFLARE_D1_LIST_SHAPE_UNKNOWN');
    for(const db of result)if(db&&db.name===d1Name)matches.push(db);
    if(result.length<100)break;
    if(page===10)fail('CLOUDFLARE_D1_PAGINATION_INCOMPLETE');
  }
  if(matches.length!==1||typeof matches[0].uuid!=='string'||
     !/^[a-fA-F0-9-]{36}$/.test(matches[0].uuid))
    fail('EXACT_EASYSTORE_D1_NOT_FOUND');
  const settings=await get(base+'/workers/scripts/'+workerName+'/settings');
  if(!settings||!Array.isArray(settings.bindings))fail('WORKER_BINDINGS_UNVERIFIED');
  const binding=settings.bindings.filter(b=>b&&b.type==='d1'&&
    (b.id===matches[0].uuid||b.database_id===matches[0].uuid));
  if(binding.length!==1)fail('WORKER_D1_EXACT_BINDING_NOT_ATTESTED');
  const data=await get(base+'/workers/scripts/'+workerName+'/deployments');
  const deployments=Array.isArray(data)?data:(data&&data.deployments);
  if(!Array.isArray(deployments)||!deployments.length)fail('WORKER_ACTIVE_DEPLOYMENT_UNVERIFIED');
  const active=deployments[0],previous=deployments[1];
  if(!active||typeof active.id!=='string'||!Array.isArray(active.versions)||
     !active.versions.length||active.versions.some(v=>!v||typeof v.version_id!=='string'))
    fail('WORKER_VERSION_UNVERIFIED');
  return {
    verification:'PROVIDER_METADATA_READ_ONLY',accountId,workerName,d1Name,
    d1Uuid:matches[0].uuid,d1BindingName:binding[0].name||null,
    deploymentId:active.id,versions:active.versions.map(v=>({
      versionId:v.version_id,percentage:v.percentage
    })),previousDeploymentId:previous&&typeof previous.id==='string'?previous.id:null,
    gitSourceSha:'NOT_ATTESTED',stageApiUrl:'NOT_ATTESTED',
    rollbackRestoreTest:'NOT_TESTED',sourceCustomerOwnership:'NOT_ATTESTED',
    financeRelease:'NO_GO',financeWrites:'OFF',gates:'G1-G5_OPEN',
    postedMoney:false
  };
}
module.exports={inventory,validate};
if(require.main===module){
  inventory({accountId:process.env.EASYSTORE_CF_ACCOUNT_ID,
    token:process.env.EASYSTORE_CF_READ_TOKEN,
    workerName:process.env.EASYSTORE_WORKER_NAME,
    d1Name:process.env.EASYSTORE_D1_NAME
  }).then(result=>console.log(JSON.stringify(result,null,2)))
    .catch(error=>{console.error('EASYSTORE_PROVIDER_INVENTORY_STOP:',error.code||'UNKNOWN');process.exitCode=1;});
}
