// End-to-end browser checks for the actual static website, not mocked DOMs.
// Run with: npm install --no-save playwright && npx playwright install chromium
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

const port=19783;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','web'],{stdio:'ignore'});
let browser;
const base='http://127.0.0.1:'+port;
const errors=[];
const attach=page=>{
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error') errors.push('console: '+m.text());});
};
const wasm=Buffer.from('0061736d010000000104016000000302010007090105737461727400000a040102000b','hex');
const report={
 schemaVersion:1,engine:'near-sandbox',kind:'user-contract-execution-report',planName:'protected-settlement',
 wasmSha256:'a'.repeat(64),passed:true,steps:[
   {type:'call',method:'start',expect:'success',observed:'success',passed:true,receiptCount:1,receiptFailures:0,receipts:[]},
   {type:'assertView',method:'get_completed',expected:0,actual:0,passed:true}
 ]
};
const receipt={
 jsonrpc:'2.0',result:{
  status:{SuccessValue:''},
  transaction:{signer_id:'mike.testnet',receiver_id:'example.testnet',actions:[{FunctionCall:{method_name:'start'}}]},
  transaction_outcome:{outcome:{gas_burnt:'1',receipt_ids:['receipt-one']}},
  receipts_outcome:[{id:'receipt-one',outcome:{
   executor_id:'example.testnet',status:{SuccessValue:''},gas_burnt:'123',logs:[],receipt_ids:[]
  }}]
 }
};
try{
  for(let i=0;i<40;i++){
    if(server.exitCode!==null)throw new Error('Local server exited');
    try{const res=await fetch(base);if(res.ok)break;}catch{}
    await delay(250);
    if(i===39)throw new Error('Local server never became ready');
  }
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({acceptDownloads:true});
  attach(page);
  await page.goto(base+'/index.html',{waitUntil:'networkidle'});

  // Fault lab: actual button, results, variant switch, downloaded JSON.
  await page.locator('#run-tests').click();
  assert.match(await page.locator('#overview').innerText(),/3 deliberately vulnerable models failed/);
  await page.locator('#results [data-mode="protected"]').click();
  assert.match(await page.locator('#results').innerText(),/Maintained/);
  const modelDownload=page.waitForEvent('download');
  await page.locator('#download-report').click();
  assert.match((await modelDownload).suggestedFilename(),/staterift-model-report.json/);

  // Contract inspection discovers real WASM exports, then plan download works.
  await page.locator('#contract-file').setInputFiles({name:'sample.wasm',mimeType:'application/wasm',buffer:wasm});
  await page.locator('#contract-inspection-result').getByText('WASM format detected').waitFor();
  assert.match(await page.locator('#plan-wasm-note').innerText(),/Detected 1 exported function/);
  const planDownload=page.waitForEvent('download');
  await page.locator('#plan-export').click();
  assert.match((await planDownload).suggestedFilename(),/staterift-settlement-protected.json/);

  // Plan upload is correctly rejected; execution report upload is accepted,
  // but still prominently labeled as unverified local user data.
  await page.locator('#report-file').setInputFiles({
   name:'plan.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({schemaVersion:1,name:'test',steps:[{type:'call',method:'start'}]}))
  });
  assert.match(await page.locator('#report-results').innerText(),/TEST PLAN, not an execution report/);
  await page.locator('#report-file').setInputFiles({
   name:'report.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(report))
  });
  assert.match(await page.locator('#report-results').innerText(),/ALL ASSERTIONS PASSED/);
  assert.match(await page.locator('#report-results').innerText(),/NOT INDEPENDENTLY VERIFIED/);
  
  // Exercise the real receipt UI with an isolated, deterministic RPC mock.
  // Live network access is independently tested in check-rpc-cors.mjs.
  await page.route('https://*.near.org/**',route=>route.fulfill({status:200,
    headers:{'access-control-allow-origin':'*','content-type':'application/json'},
    body:JSON.stringify(receipt)}));
  await page.route('https://*.fastnear.com/**',route=>route.fulfill({status:200,
    headers:{'access-control-allow-origin':'*','content-type':'application/json'},
    body:JSON.stringify(receipt)}));
  await page.locator('#tx-sample').click();
  await page.locator('.tx-summary').waitFor();
  assert.match(await page.locator('#tx-output').innerText(),/Receipt execution trace/);
  const txDownload=page.waitForEvent('download');
  await page.locator('#tx-export').click();
  assert.equal((await txDownload).suggestedFilename(),'staterift-transaction-evidence.json');

  await page.goto(base+'/judge-lab.html',{waitUntil:'networkidle'});
  await page.waitForFunction(() => document.querySelector('#verified-source')?.textContent?.includes('Pinned CI run'));
  await page.locator('#choose-protected').click();
  await page.locator('#next-step').click();
  assert.match(await page.locator('#stage-title').innerText(),/asynchronous execution/);
  await page.locator('[data-stage="2"]').click();
  assert.match(await page.locator('#stage-title').innerText(),/accounting invariant/);
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log('PASS: homepage, simulations, WASM, plan, reports, RPC receipt UI, downloads, judge walkthrough');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
