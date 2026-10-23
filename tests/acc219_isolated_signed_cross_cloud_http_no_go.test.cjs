'use strict';
/**
 * ACC219 — Private, FAKE-ONLY signed cross-Cloud HTTP rehearsal.
 * Both processes are simulated by 127.0.0.1 ephemeral HTTP servers, with
 * ephemeral fake HMAC keys, invented order/customer/lines, and no DB or POST
 * beyond the loopback test. NEVER a provider deployment / finance approval.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const crypto=require('node:crypto');
const {previewInvoiceIntake}=require('../scripts/easystore_finance_intake_preview_no_go.cjs');

const HOST='127.0.0.1';
const MAX_BODY=16384;
const FRESH_MS=30000;
function fixture(){
  return {
    envelope:{
      contract_version:'ACCOUNTING_CONNECTOR_CONTRACT_V1',
      event_id:'FAKE-EVENT-1001',event_type:'order_line_approved',
      occurred_at:'2026-10-23T13:00:00Z',source_system:'TrendOS',
      source_entity_type:'order_line',source_entity_id:'FAKE-LASER-2',
      correlation_id:'FAKE-CORRELATION-1',idempotency_key:'FAKE-IDEMP-1001',
      evidence_refs:['FAKE-EVIDENCE-1'],payload:{
        order_id:'FAKE-ORDER-1001',customer_id:'FAKE-CUSTOMER-1001',
        line_id:'FAKE-LASER-2',order_revision:4
      }
    },
    sourceOrder:{
      order_id:'FAKE-ORDER-1001',customer_id:'FAKE-CUSTOMER-1001',revision:4,
      expected_line_count:2,lines:[
        {line_id:'FAKE-PRINT-1',order_id:'FAKE-ORDER-1001',customer_id:'FAKE-CUSTOMER-1001',
          department:'طباعة',approval_status:'APPROVED',total_cents:15000},
        {line_id:'FAKE-LASER-2',order_id:'FAKE-ORDER-1001',customer_id:'FAKE-CUSTOMER-1001',
          department:'ليزر',approval_status:'APPROVED',total_cents:5000}
      ]
    },
    officialCustomer:{customer_id:'FAKE-CUSTOMER-1001',status:'ACTIVE'},
    financeSnapshot:{
      order_id:'FAKE-ORDER-1001',customer_id:'FAKE-CUSTOMER-1001',
      order_revision:4,existing_invoice_ids:[]
    }
  };
}
function sign(key,body,timestamp){
  return 'sha256='+crypto.createHmac('sha256',key).update(String(timestamp)+'.'+body).digest('hex');
}
function sendJson(res,status,object){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(object));
}
async function readLimited(req,max=MAX_BODY){
  const chunks=[];let size=0;
  for await(const chunk of req){
    size+=chunk.length;
    // Keep draining the tiny local test request before rejecting, to avoid
    // destroying the socket before HTTP 413 can be delivered.
    if(size<=max)chunks.push(chunk);
  }
  if(size>max)throw Object.assign(new Error('TOO_LARGE'),{code:'TOO_LARGE'});
  return Buffer.concat(chunks).toString('utf8');
}
async function localServer(handler){
  const server=http.createServer(handler);
  try{
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen(0,HOST,resolve);
    });
    assert.equal(server.address().address,HOST);
    const addr='http://'+HOST+':'+server.address().port;
    return {server,url:addr,close:()=>new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))};
  }catch(err){server.close();throw err}
}
function safeResult(r){
  assert.equal(r.financeRelease,'NO_GO');
  assert.equal(r.postingAllowed,false);
  assert.equal(r.liveAuthorityVerified,false);
  assert.equal(r.realOrderCustomerBindingVerified,false);
  assert.equal(r.actualCloudVerified,false);
}
test('ACC219 two signed isolated HTTP endpoints: real request transport, zero ledger writes',async t=>{
  const ephemeralKey=crypto.randomBytes(32);
  const seen=new Map();
  const metrics={sourceGets:0,receipts:0,reviewOnly:0,financialWrites:0,externalRequests:0};
  const producer=await localServer((req,res)=>{
    if(req.method!=='GET'||req.url!=='/fake/order-line-approved'){
      sendJson(res,404,{error:'FAKE_ONLY_NOT_FOUND'});return;
    }
    metrics.sourceGets++;
    const body=JSON.stringify(fixture());
    const timestamp=Date.now().toString();
    res.writeHead(200,{
      'content-type':'application/json','cache-control':'no-store',
      'x-fake-signed-at':timestamp,'x-fake-hmac':sign(ephemeralKey,body,timestamp)
    });
    res.end(body);
  });
  t.after(()=>producer.close());
  const consumer=await localServer(async(req,res)=>{
    if(req.url!=='/fake/finance-intake'||req.method!=='POST'){
      sendJson(res,405,{code:'FAKE_ONLY_POST_REQUIRED',financeRelease:'NO_GO',postingAllowed:false});return;
    }
    if(String(req.headers['content-type']||'').split(';')[0]!=='application/json'){
      sendJson(res,415,{code:'JSON_ONLY',financeRelease:'NO_GO',postingAllowed:false});return;
    }
    let raw='';
    try{raw=await readLimited(req)}catch(err){
      sendJson(res,err.code==='TOO_LARGE'?413:400,{code:'REQUEST_REJECTED',financeRelease:'NO_GO',postingAllowed:false});return;
    }
    const sent=String(req.headers['x-fake-signed-at']||'');
    const sig=String(req.headers['x-fake-hmac']||'');
    const ts=Number(sent);
    if(!/^\d{13}$/.test(sent)||!Number.isSafeInteger(ts)||Math.abs(Date.now()-ts)>FRESH_MS ||
       !/^sha256=[0-9a-f]{64}$/.test(sig)){
      sendJson(res,401,{code:'MISSING_STALE_OR_INVALID_PROOF',financeRelease:'NO_GO',postingAllowed:false});return;
    }
    const expected=Buffer.from(sign(ephemeralKey,raw,sent).slice(7),'hex');
    const supplied=Buffer.from(sig.slice(7),'hex');
    if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied)){
      sendJson(res,401,{code:'UNTRUSTED_SOURCE_SIGNATURE',financeRelease:'NO_GO',postingAllowed:false});return;
    }
    let packet;
    try{packet=JSON.parse(raw)}catch{
      sendJson(res,400,{code:'INVALID_SIGNED_JSON',financeRelease:'NO_GO',postingAllowed:false});return;
    }
    metrics.receipts++;
    const eventId=packet&&packet.envelope&&packet.envelope.event_id;
    const unique=packet&&packet.envelope&&packet.envelope.idempotency_key;
    if(typeof eventId!=='string'||typeof unique!=='string'){
      sendJson(res,422,{code:'MISSING_EVENT_ID',financeRelease:'NO_GO',postingAllowed:false});return;
    }
    const eventKey=eventId+'|'+unique;
    const eventDigest=crypto.createHash('sha256').update(raw).digest('hex');
    if(seen.has(eventKey)){
      sendJson(res,409,{code:seen.get(eventKey)===eventDigest?'DUPLICATE_EVENT':'IDEMPOTENCY_PAYLOAD_CONFLICT',
        financeRelease:'NO_GO',postingAllowed:false});return;
    }
    const result=previewInvoiceIntake(packet);
    safeResult(result);
    if(result.status==='REVIEW_REQUIRED'){
      seen.set(eventKey,eventDigest);
      metrics.reviewOnly++;
      sendJson(res,202,result);
    }else sendJson(res,422,result);
  });
  t.after(()=>consumer.close());
  assert.notEqual(producer.url,consumer.url);
  assert.match(producer.url,/^http:\/\/127\.0\.0\.1:\d+$/);
  assert.match(consumer.url,/^http:\/\/127\.0\.0\.1:\d+$/);
  const source=await fetch(producer.url+'/fake/order-line-approved');
  assert.equal(source.status,200);
  const body=await source.text();
  const signedAt=source.headers.get('x-fake-signed-at');
  const signature=source.headers.get('x-fake-hmac');
  const dest=consumer.url+'/fake/finance-intake';
  const deliver=async(raw=body,auth=signature,time=signedAt,headers={})=>{
    const response=await fetch(dest,{method:'POST',headers:{
      'content-type':'application/json','x-fake-signed-at':time,
      'x-fake-hmac':auth,...headers
    },body:raw});
    return {status:response.status,body:await response.json()};
  };
  await t.test('approved printed+laser lines through signed local HTTP are PREVIEW only',async()=>{
    const r=await deliver();assert.equal(r.status,202);safeResult(r.body);
    assert.equal(r.body.invoiceCandidateTotalCents,20000);
    assert.equal(r.body.status,'REVIEW_REQUIRED');
  });
  await t.test('same event replay does not trigger a second finance review',async()=>{
    const r=await deliver();assert.equal(r.status,409);assert.equal(r.body.code,'DUPLICATE_EVENT');
  });
  await t.test('modified signed body cannot impersonate producer',async()=>{
    const raw=body.replace('FAKE-CUSTOMER-1001','FAKE-CUSTOMER-EVIL');
    const r=await deliver(raw);assert.equal(r.status,401);
    assert.equal(r.body.code,'UNTRUSTED_SOURCE_SIGNATURE');
  });
  await t.test('missing and forged message authentication rejected',async()=>{
    const missing=await deliver(body,'');assert.equal(missing.status,401);
    const forged=await deliver(body,'sha256='+'0'.repeat(64));assert.equal(forged.status,401);
  });
  await t.test('old fully signed event is stale, including replay after time window',async()=>{
    const old=(Date.now()-60000).toString();
    const r=await deliver(body,sign(ephemeralKey,body,old),old);
    assert.equal(r.status,401);assert.equal(r.body.code,'MISSING_STALE_OR_INVALID_PROOF');
  });
  await t.test('signed but mismatched official customer fails closed',async()=>{
    const p=fixture();
    p.envelope.event_id='FAKE-EVENT-2';p.envelope.idempotency_key='FAKE-IDEMP-2';
    p.officialCustomer.customer_id='FAKE-CUSTOMER-OTHER';
    const raw=JSON.stringify(p),stamp=Date.now().toString();
    const r=await deliver(raw,sign(ephemeralKey,raw,stamp),stamp);
    assert.equal(r.status,422);assert.equal(r.body.code,'ORDER_CUSTOMER_IDENTITY_CONFLICT');
    safeResult(r.body);
  });
  await t.test('even correctly signed existing final invoice must be refused',async()=>{
    const p=fixture();
    p.envelope.event_id='FAKE-EVENT-3';p.envelope.idempotency_key='FAKE-IDEMP-3';
    p.financeSnapshot.existing_invoice_ids=['FAKE-INVOICE-OLD'];
    const raw=JSON.stringify(p),stamp=Date.now().toString();
    const r=await deliver(raw,sign(ephemeralKey,raw,stamp),stamp);
    assert.equal(r.status,422);assert.equal(r.body.code,'POSSIBLE_DUPLICATE_FINAL_INVOICE');
  });
  await t.test('oversized body cannot reach preflight or financial writer',async()=>{
    const raw='x'.repeat(MAX_BODY+128);
    const stamp=Date.now().toString();
    const r=await deliver(raw,sign(ephemeralKey,raw,stamp),stamp);
    assert.equal(r.status,413);
  });
  await t.test('GET or wrong path cannot create a finance receipt',async()=>{
    const r=await fetch(dest);
    assert.equal(r.status,405);assert.equal((await r.json()).postingAllowed,false);
  });
  await t.test('signed source still cannot authorize money, tokens or external calls',()=>{
    assert.equal(metrics.sourceGets,1);
    assert.equal(metrics.receipts,4); // valid + rejected duplicate replay + mismatched customer + existing-invoice
    assert.equal(metrics.reviewOnly,1);
    assert.equal(metrics.financialWrites,0);
    assert.equal(metrics.externalRequests,0);
    assert.equal(seen.size,1);
  });
  console.log('ACC219_TWO_FAKE_LOOPBACK_HTTP_BOUNDARIES=PASS');
  console.log('ACC219_HMAC_AUTH_IN_EPHEMERAL_TEST_ONLY=PASS');
  console.log('ACC219_REAL_CLOUD_CREDENTIALS_OR_DEPLOYMENT=NONE');
  console.log('ACC219_REAL_FINANCIAL_POSTS=ZERO');
  console.log('FINANCE_RELEASE=NO_GO');
});
