import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readTransaction,summarizeTransaction,checkInput,RPC} from '../web/transaction-evidence.js';
const hash='4'.repeat(44);
const signer='alice.testnet';
const good={transaction:{receiver_id:'contract.testnet',actions:[{FunctionCall:{method_name:'start'}}]},status:{SuccessValue:''},
  transaction_outcome:{outcome:{gas_burnt:'100'}},
  receipts_outcome:[
    {id:'receipt-one',outcome:{executor_id:'contract.testnet',status:{Failure:{ActionError:{kind:'MethodNotFound'}}},gas_burnt:'200',logs:['receipt failed']}},
    {id:'receipt-two',outcome:{executor_id:'contract.testnet',status:{SuccessValue:''},gas_burnt:'300',logs:[]}},
  ]};
test('read-only tx inspector separates overall success from a failed async receipt',()=>{
  const r=summarizeTransaction(good,'testnet',hash,signer);
  assert.equal(r.outcome,'success');
  assert.equal(r.receiptFailures,1);
  assert.equal(r.receipts[0].status,'failed');
  assert.equal(r.receiptCount,2);
  assert.equal(r.gasBurnt,'600');
  assert.equal(r.explorer,'https://testnet.nearblocks.io/txns/'+hash);
  assert.equal(r.kind,'observed-near-transaction');
});
test('input validation prevents invalid transactions and unsupported RPC networks',()=>{
  assert.throws(()=>checkInput({network:'localhost',hash,signer}),/Choose/);
  assert.throws(()=>checkInput({network:'mainnet',hash:'bad',signer}),/hash/);
  assert.throws(()=>checkInput({network:'mainnet',hash,signer:'../evil'}),/signer/);
  assert.equal(Object.keys(RPC).length,2);
});
test('readTransaction sends only a read-only JSON-RPC tx request',async()=>{
  let payload;
  const fetcher=async (url,options)=>{
    assert.equal(url,RPC.testnet);
    assert.equal(options.method,'POST');
    payload=JSON.parse(options.body);
    return {ok:true,json:async()=>({jsonrpc:'2.0',id:'staterift-readonly',result:good})};
  };
  const r=await readTransaction({network:'testnet',hash,signer},fetcher);
  assert.equal(payload.method,'tx');
  assert.equal(payload.params.tx_hash,hash);
  assert.equal(payload.params.sender_account_id,signer);
  assert.equal(r.receiptFailures,1);
});
test('RPC and malformed response errors are surfaced',async()=>{
  const fetcher=async()=>({ok:true,json:async()=>({error:{message:'UNKNOWN_TRANSACTION'}})});
  await assert.rejects(readTransaction({network:'testnet',hash,signer},fetcher),/UNKNOWN_TRANSACTION/);
  assert.throws(()=>summarizeTransaction({},'testnet',hash,signer),/Unexpected RPC/);
});
test('does not allow untrusted logs to become HTML',()=>{
  const html=fs.readFileSync(new URL('../web/transaction-inspector.js',import.meta.url),'utf8');
  assert.match(html,/textContent/);
  assert.doesNotMatch(html,/innerHTML|insertAdjacentHTML|eval\(/);
});
test('transaction inspector is discoverable and labels data provenance',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  assert.match(html,/id="tx-form"/);
  assert.match(html,/id="tx-output"/);
  assert.match(html,/src="\.\/transaction-inspector.js"/);
  assert.match(html,/live read-only NEAR RPC data/i);
});
