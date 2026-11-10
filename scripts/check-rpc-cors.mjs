// Live smoke: prove an actual browser-style cross-origin POST can read a real
// archived testnet transaction from at least one provider. Never signs/writes.
import {VERIFIED_SAMPLE, RPC, ARCHIVAL_RPC} from '../web/transaction-evidence.js';

const origin='https://slyzeal.github.io';
const endpoints=[ARCHIVAL_RPC.testnet,RPC.testnet];
const accepts=(raw,needle)=>raw?.split(',').map(s=>s.trim().toLowerCase()).includes(needle.toLowerCase());
const allowsOrigin=(headers)=>{
  const value=headers.get('access-control-allow-origin');
  return value==='*'||value===origin;
};
const body=JSON.stringify({jsonrpc:'2.0',id:'staterift-cors-check',method:'tx',params:{
  tx_hash:VERIFIED_SAMPLE.hash,sender_account_id:VERIFIED_SAMPLE.signer,wait_until:'FINAL'
}});
const results=await Promise.all(endpoints.map(async(url)=>{
  try{
    const preflight=await fetch(url,{method:'OPTIONS',
      headers:{Origin:origin,'Access-Control-Request-Method':'POST',
        'Access-Control-Request-Headers':'content-type'},
      signal:AbortSignal.timeout(12000)});
    if(!preflight.ok||!allowsOrigin(preflight.headers)||
      !accepts(preflight.headers.get('access-control-allow-methods'),'POST')||
      !accepts(preflight.headers.get('access-control-allow-headers'),'content-type'))
      throw new Error('Browser CORS preflight denied POST with content-type: HTTP '+preflight.status+' ACAO='+preflight.headers.get('access-control-allow-origin')+' ACAM='+preflight.headers.get('access-control-allow-methods')+' ACAH='+preflight.headers.get('access-control-allow-headers'));
    const response=await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
      body,signal:AbortSignal.timeout(12000)});
    if(!response.ok||!allowsOrigin(response.headers))throw new Error('Browser cannot read cross-origin POST response');
    const json=await response.json();
    if(json.error||json.result?.transaction?.signer_id!==VERIFIED_SAMPLE.signer||
      !Array.isArray(json.result?.receipts_outcome))
      throw new Error('Live RPC returned no validated example receipt outcomes');
    console.log('PASS',url,'real receipts:',json.result.receipts_outcome.length);
    return true;
  }catch(e){console.error('FAIL',url,':',e.message);return false;}
}));
if(!results.some(Boolean)){
  console.error('Browser-facing live NEAR receipt lookup unavailable on all configured endpoints');
  process.exitCode=1;
}
