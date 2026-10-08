import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API='https://trendos-d1-api.trendmall-contact.workers.dev/v1/employee/accounting';
const ACTOR='ضياء';
const READS=new Set(['getAccounting','getDeptInvoiceDraftV1887','getPartyAccountV1858','getCustomerAccountV1915','getEasyStoreCustomers','searchCustomers','getEasyStoreSuppliers','easyStoreSystemHealth','calculateAccountingLaserQuoteV1913','getDailyDepartmentReportV1920','previewAccountingAutomationV1921']);
const quote=v=>'"'+String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r')+'"';

export function requestPlatform(action,params={},token='') {
  if(token && /[\x00-\x20\x7f]/.test(token))throw Error('Invalid session binding format');
  const lines=['url = '+quote(action?API:API+'/health'),'request = '+quote(action?'POST':'GET')];
  if(action) {
    if(!token)throw Error('Missing secure binding EASYSTORE_EMPLOYEE_SESSION_TOKEN');
    lines.push('header = '+quote('Content-Type: application/json'));
    lines.push('header = '+quote('Authorization: Bearer '+token));
    lines.push('data = '+quote(JSON.stringify({...params,action,username:ACTOR})));
  }
  // Credential travels through stdin, never argv, saved request files or logs.
  const r=spawnSync('curl',['--silent','--show-error','--max-time','20','--config','-','--write-out','\n%{http_code}'],{input:lines.join('\n')+'\n',encoding:'utf8',maxBuffer:8*1024*1024});
  if(r.status!==0)throw Error('Platform transport failed; do not repeat a financial command before D1 reconciliation');
  const i=r.stdout.lastIndexOf('\n'),status=Number(r.stdout.slice(i+1));
  let data;try{data=JSON.parse(r.stdout.slice(0,i));}catch{throw Error('Invalid platform response; financial outcome requires D1 reconciliation');}
  if(status<200||status>=300||data.success!==true)throw Error('Platform rejected request (HTTP '+status+', '+String(data.code||'operation-denied').replace(/[^a-zA-Z0-9_-]/g,'')+')');
  return data;
}

export function requireBoundedCustodyHealth(h,now=Date.now()) {
  if(h.mode!=='CANARY'||h.writeAuthorityMode!=='CANARY_BOUNDED'||h.authoritativeWrites!==true)throw Error('Server is not in approved bounded CANARY');
  if(h.writeCanaryAllowedUserCount!==1||h.writeCanaryAllowedActionCount!==1||h.writeCanaryMaxAmount!==0||h.writeCanaryMaxCommands!==1)throw Error('Canary scope mismatch');
  if(h.writeCanaryCommandsStarted!==0)throw Error('Command budget consumed; inspect D1, never retry');
  const remaining=Number(h.writeCanaryExpiresAtMs)-now;
  if(!(remaining>0&&remaining<=15*60*1000))throw Error('Canary expiry outside approved short window');
}

export function readPlatform(action,params,token,request=requestPlatform) {
  if(!READS.has(action))throw Error('Action is not an approved read');
  if(!token)throw Error('Missing secure binding EASYSTORE_EMPLOYEE_SESSION_TOKEN');
  return request(action,params,token);
}

export function executeZeroCustody({token,stateFile='/workspace/scratch/easystore-agent-attempt.json',request=requestPlatform,now=Date.now()}) {
  if(!token)throw Error('Missing secure binding EASYSTORE_EMPLOYEE_SESSION_TOKEN');
  if(fs.existsSync(stateFile))throw Error('A prior attempt is recorded; inspect D1 before any further financial action');
  requireBoundedCustodyHealth(request(),now);
  const id=randomUUID().replaceAll('-','').toUpperCase();
  const payload={requestId:'A213-CCLOSE-'+id,employee:'A2-CANARY-CUSTODY-'+id,department:'عام',workDate:'2099-12-31'};
  fs.mkdirSync(path.dirname(stateFile),{recursive:true});
  const fd=fs.openSync(stateFile,'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify({status:'SENT_UNKNOWN_NO_AUTOMATIC_RETRY',actor:ACTOR,payload}));}finally{fs.closeSync(fd);}
  const response=request('closePurchaseCustodyV1920',payload,token);
  if(response.success!==true||!response.closeId||Number(response.balanceBefore)!==0||response.settlementType!=='NONE'||Number(response.settlementAmount)!==0||Number(response.balanceAfter)!==0)throw Error('Custody response mismatch; inspect D1 before any further action');
  fs.writeFileSync(stateFile,JSON.stringify({status:'RESPONSE_OK_AWAITING_INDEPENDENT_D1_AUDIT',actor:ACTOR,payload,closeId:response.closeId}),{mode:0o600});
  return {requestId:payload.requestId,closeId:response.closeId,status:'AWAITING_D1_AUDIT'};
}

function redact(v) {
  if(Array.isArray(v))return v.map(redact);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,/token|password|secret|credential/i.test(k)?'[REDACTED]':redact(x)]));
  return v;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const command=process.argv[2]||'status',token=process.env.EASYSTORE_EMPLOYEE_SESSION_TOKEN||'';
    let output;
    if(command==='status')output=requestPlatform();
    else if(command==='connect-check') {
      readPlatform('easyStoreSystemHealth',{},token);
      output={authenticated:true,actor:ACTOR};
    } else if(command==='read') {
      const params=process.argv[4]?JSON.parse(fs.readFileSync(process.argv[4],'utf8')):{};
      output=readPlatform(process.argv[3],params,token);
    } else if(command==='execute-zero-custody')output=executeZeroCustody({token});
    else throw Error('Use status, connect-check, read <approved-action> [params.json], or execute-zero-custody');
    console.log(JSON.stringify(redact(output),null,2));
  } catch(e) { console.error(e.message); process.exitCode=1; }
}
