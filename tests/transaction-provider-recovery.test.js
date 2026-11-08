import test from 'node:test';
import assert from 'node:assert/strict';
import {readTransaction,RPC,ARCHIVAL_RPC} from '../web/transaction-evidence.js';
const hash='4'.repeat(44),signer='tester.testnet';
const outcome={transaction:{receiver_id:'contract.testnet',actions:[]},status:{SuccessValue:''},transaction_outcome:{outcome:{gas_burnt:'4'}},receipts_outcome:[{id:'abc',outcome:{status:{SuccessValue:''},executor_id:'contract.testnet',gas_burnt:'8',receipt_ids:[],logs:[]}}]};
const args={network:'testnet',hash,signer};

test('archival RPC succeeds while primary RPC hangs indefinitely until aborted',async()=>{
  const called=[];
  const fetcher=(url,options)=>{
    called.push(url);
    if(url===ARCHIVAL_RPC.testnet) return Promise.resolve({ok:true,json:async()=>({result:outcome})});
    return new Promise((resolve,reject)=>{
      options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
    });
  };
  const result=await readTransaction(args,fetcher);
  assert.deepEqual(new Set(called),new Set([RPC.testnet,ARCHIVAL_RPC.testnet]));
  assert.equal(result.rpcProvider,ARCHIVAL_RPC.testnet);
  assert.equal(result.receiptCount,1);
});

test('standard RPC still works if archival RPC rejects',async()=>{
  const fetcher=async(url)=>{
    if(url===ARCHIVAL_RPC.testnet) throw new TypeError('Failed to fetch');
    return {ok:true,json:async()=>({result:outcome})};
  };
  const result=await readTransaction(args,fetcher);
  assert.equal(result.rpcProvider,RPC.testnet);
});

test('no provider success means explicit failure, not a fabricated result',async()=>{
  const fetcher=async()=>({ok:false,status:503});
  await assert.rejects(readTransaction(args,fetcher),/Unable to retrieve this transaction/);
});

test('external abort before request stops all attempts',async()=>{
  const controller=new AbortController();
  controller.abort(new DOMException('User cancelled','AbortError'));
  const fetcher=()=>{throw new Error('Should not fetch');};
  await assert.rejects(readTransaction(args,fetcher,{signal:controller.signal}),/User cancelled/);
});

test('failed lookup renders external blockchain-explorer fallback without replacing it with fake data',async()=>{
  const fs=await import('node:fs');
  const ui=fs.readFileSync(new URL('../web/transaction-inspector.js',import.meta.url),'utf8');
  assert.match(ui,/Open this transaction in NearBlocks/);
  assert.match(ui,/No result was verified by StateRift/);
  assert.doesNotMatch(ui,/innerHTML|insertAdjacentHTML/);
});
