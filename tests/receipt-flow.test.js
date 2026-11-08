import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeReceiptFlow } from '../web/receipt-flow.js';
import {summarizeTransaction} from '../web/transaction-evidence.js';
const receipt = (id,status='success',spawnedIds=[]) => ({id,status,spawnedIds});
test('builds NEAR execution lineage only from explicit spawned receipt IDs',()=>{
  const result=analyzeReceiptFlow([receipt('root','success',['callback']),receipt('callback')], ['root']);
  assert.equal(result.nodes[0].origin,'transaction');
  assert.equal(result.nodes[1].origin,'receipt');
  assert.equal(result.nodes[1].parentId,'root');
  assert.equal(result.nodes[1].parentIndex,1);
  assert.equal(result.nodes[1].depth,1);
  assert.equal(result.linkedCount,2);
});
test('tracks only actual failure paths, excluding healthy sibling branches',()=>{
  const result=analyzeReceiptFlow([
    receipt('start','success',['a','b']),
    receipt('a','failed',['c']),
    receipt('b'),
    receipt('c'),
  ], ['start']);
  assert.deepEqual(new Set(result.failedPathIds),new Set(['start','a']));
  assert.equal(result.nodes[3].parentId,'a');
  assert.equal(result.nodes[3].depth,2);
});
test('out-of-order receipts still have correct ancestry',()=>{
  const result=analyzeReceiptFlow([receipt('child','failed'),receipt('root','success',['child'])], ['root']);
  assert.equal(result.nodes[0].parentIndex,2);
  assert.deepEqual(new Set(result.failedPathIds),new Set(['child','root']));
});
test('does not invent provenance when RPC has no link data',()=>{
  const result=analyzeReceiptFlow([receipt('a','failed'),receipt('b')]);
  assert.equal(result.hasLinkData,false);
  assert.equal(result.unlinkedCount,2);
  assert.equal(result.nodes[0].origin,'unlinked');
  assert.deepEqual(result.failedPathIds,['a']);
});
test('handles duplicate edges and self-links without false parents',()=>{
  const result=analyzeReceiptFlow([receipt('a','success',['a','b','b']),receipt('b','failed',['b'])], ['a']);
  assert.equal(result.nodes[0].parentId,null);
  assert.equal(result.nodes[1].parentId,'a');
});
test('detects cyclic edges defensively rather than looping',()=>{
  const result=analyzeReceiptFlow([receipt('a','failed',['b']),receipt('b','success',['a'])]);
  assert.equal(result.nodes.some(n=>n.cyclicLink),true);
});
test('caps browser graph at 150 outcomes',()=>{
  const result=analyzeReceiptFlow(Array.from({length:160},(_,i)=>receipt('r'+i)),['r0']);
  assert.equal(result.nodes.length,150);
  assert.equal(result.truncated,true);
});
test('NEAR tx RPC receipt_ids become explicit parent and child edges',()=>{
  const hash='4'.repeat(44), signer='alice.testnet';
  const raw={
    transaction:{receiver_id:'contract.testnet',actions:[{FunctionCall:{method_name:'start'}}]},
    status:{SuccessValue:''},
    transaction_outcome:{outcome:{gas_burnt:'8',receipt_ids:['root']}},
    receipts_outcome:[
      {id:'root',outcome:{executor_id:'contract.testnet',status:{SuccessReceiptId:'next'},gas_burnt:'9',receipt_ids:['next'],logs:[]}},
      {id:'next',outcome:{executor_id:'contract.testnet',status:{Failure:{ActionError:{kind:'MethodNotFound'}}},gas_burnt:'10',receipt_ids:[],logs:[]}}
    ]
  };
  const result=summarizeTransaction(raw,'testnet',hash,signer);
  assert.deepEqual(result.initialReceiptIds,['root']);
  assert.deepEqual(result.receipts[0].spawnedIds,['next']);
  assert.deepEqual(result.receipts[1].spawnedIds,[]);
  const flow=analyzeReceiptFlow(result.receipts,result.initialReceiptIds);
  assert.equal(flow.nodes[1].parentId,'root');
  assert.deepEqual(new Set(flow.failedPathIds),new Set(['root','next']));
  assert.equal(result.outcome,'success');
  assert.equal(result.receiptFailures,1);
});
