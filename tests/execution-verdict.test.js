import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCallOutcome} from '../sandbox/scripts/call-verdict.mjs';
import {validateExecutionReport} from '../web/report-validation.js';
const success={failed:false,receipts_outcomes:[{outcome:{status:{SuccessValue:''}}}]};
const rejected={failed:true,receipts_outcomes:[{outcome:{status:{Failure:{ActionError:'MethodNotFound'}}}}]};
const makeReport=(step)=>({
 schemaVersion:1,kind:'user-contract-execution-report',engine:'near-sandbox',
 planName:'test',wasmSha256:'a'.repeat(64),passed:step.passed,steps:[{type:'call',method:'start',expect:'failure',...step}]
});
test('contract execution errors cannot satisfy a plan expecting failure',()=>{
 const verdict=evaluateCallOutcome({expect:'failure'},null,'worker crashed');
 assert.equal(verdict.observed,'execution-error');
 assert.equal(verdict.passed,false);
 assert.equal(verdict.receiptCount,0);
 assert.equal(verdict.receiptFailures,0);
 assert.throws(()=>validateExecutionReport(makeReport({observed:'execution-error',passed:true})),/Execution errors cannot/);
});
test('expected failure passes only when actual callRaw returns a failed contract result',()=>{
 const verdict=evaluateCallOutcome({expect:'failure',expectReceiptFailure:true},rejected);
 assert.deepEqual({observed:verdict.observed,passed:verdict.passed,receiptFailures:verdict.receiptFailures},
   {observed:'failure',passed:true,receiptFailures:1});
});
test('an expected failure cannot PASS if it actually succeeds',()=>{
 const verdict=evaluateCallOutcome({expect:'failure'},success);
 assert.equal(verdict.observed,'success');
 assert.equal(verdict.passed,false);
 assert.throws(()=>validateExecutionReport(makeReport({observed:'success',passed:true})),/mismatched observed/);
});
test('a receipt failure expectation cannot pass when no receipts are present',()=>{
 const verdict=evaluateCallOutcome({expect:'success',expectReceiptFailure:false},{failed:false,receipts_outcomes:[]});
 assert.equal(verdict.passed,false);
});
test('report loader explains confusing test-plan uploads before generic format rejection',()=>{
 const plan={schemaVersion:1,name:'settlement-protected',steps:[{type:'call',method:'start'}]};
 assert.throws(()=>validateExecutionReport(plan),/TEST PLAN, not an execution report/);
 assert.throws(()=>validateExecutionReport({kind:'observed-near-transaction'}),/live transaction evidence/);
});
test('report validation rejects contradictory async receipt counts',()=>{
 assert.throws(()=>validateExecutionReport(makeReport({observed:'failure',passed:true,receiptCount:1,receiptFailures:2})),/exceeds observed/);
 assert.throws(()=>validateExecutionReport(makeReport({observed:'failure',passed:true,receiptCount:1,receiptFailures:0,expectReceiptFailure:true})),/contradicts recorded/);
});
test('failed execution errors are displayed safely as failed checks instead of contract failures',()=>{
 const report=makeReport({observed:'execution-error',passed:false,error:'Sandbox worker unavailable'});
 assert.equal(validateExecutionReport(report),report);
});
