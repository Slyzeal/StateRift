import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateExecutionReport} from '../web/report-validation.js';
const good={
  schemaVersion:1,engine:'near-sandbox',kind:'user-contract-execution-report',
  planName:'protected-settlement',wasmSha256:'a'.repeat(64),passed:true,
  steps:[{type:'call',method:'start',expect:'success',observed:'success',passed:true,receiptCount:2,receiptFailures:1,receipts:[]},
    {type:'assertView',method:'get_completed',expected:0,actual:0,passed:true}]
};
test('accepts a structurally consistent user-provided receipt report',()=>{
  assert.equal(validateExecutionReport(good),good);
});
test('rejects simulated reports masquerading as Sandbox evidence',()=>{
  assert.throws(()=>validateExecutionReport({...good,engine:'deterministic-state-simulator'}),/Not a StateRift/);
  assert.throws(()=>validateExecutionReport({...good,passed:false}),/verdict disagrees/);
  assert.throws(()=>validateExecutionReport({...good,steps:[{...good.steps[0],receiptFailures:-1}]}),/receipt failure count/);
});
test('report viewer handles external values as inert text and has provenance disclosure',()=>{
  const js=fs.readFileSync(new URL('../web/report-review.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|eval\(/);
  assert.match(js,/textContent/);
  assert.match(html,/id="report-file"/);
  assert.match(html,/id="report-results"/);
  assert.match(html,/NOT independently verified/);
});
