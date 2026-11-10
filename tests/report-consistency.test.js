import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExecutionReport} from '../web/report-validation.js';

const make=(step)=>({
  schemaVersion:1,engine:'near-sandbox',kind:'user-contract-execution-report',
  planName:'view-check',wasmSha256:'a'.repeat(64),passed:step.passed,steps:[step]
});
const view=(expected,actual,passed,error)=>({
  type:'assertView',method:'get_state',expected,actual,passed,
  ...(error===undefined?{}:{error})
});

test('view assertions accept genuine matching and mismatching states',()=>{
  assert.equal(validateExecutionReport(make(view({a:1,b:2},{b:2,a:1},true))).passed,true);
  assert.equal(validateExecutionReport(make(view(0,1,false))).passed,false);
});
test('rejects false positives in imported report files',()=>{
  assert.throws(()=>validateExecutionReport(make(view(0,1,true))),/View assertion verdict disagrees/);
  assert.throws(()=>validateExecutionReport(make(view(0,0,false))),/View assertion verdict disagrees/);
  assert.throws(()=>validateExecutionReport(make(view(0,0,true,'worker failed'))),/failed view call/);
  assert.throws(()=>validateExecutionReport(make({type:'assertView',method:'x',passed:true})),/Missing view assertion evidence/);
});
test('cannot pass a call while carrying execution errors',()=>{
 const call={type:'call',method:'start',expect:'success',observed:'success',passed:true,error:'worker crashed'};
 assert.throws(()=>validateExecutionReport(make(call)),/recorded execution error/);
});
