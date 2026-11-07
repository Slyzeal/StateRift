import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../sandbox/scripts/plan.mjs';

test('validate a developer-authored sandbox test plan', () => {
  const plan = validatePlan({schemaVersion:1,name:'sample',steps:[{type:'call',method:'start'},{type:'assertView',method:'get_state',equals:0}]});
  assert.equal(plan.steps[0].gas, '150000000000000');
  assert.equal(plan.steps[1].equals, 0);
});
test('reject invalid executable request plans', () => {
  const plan = (step) => ({schemaVersion:1,name:'sample',steps:[step]});
  assert.throws(() => validatePlan(plan({type:'call',method:'../../secrets'})), /Invalid step/);
  assert.throws(() => validatePlan(plan({type:'call',method:'start',gas:'999999999999999'})), /gas outside/);
  assert.throws(() => validatePlan(plan({type:'assertView',method:'count'})), /equals/);
  assert.throws(() => validatePlan({schemaVersion:1,name:'sample',steps:[]}), /1–40/);
});

test('receipt failure expectations are validated and preserved in exported executable plans',()=>{
  const valid=validatePlan({schemaVersion:1,name:'receipt-check',steps:[
    {type:'call',method:'start',args:{},expect:'success',expectReceiptFailure:true},
    {type:'assertView',method:'get_failed',equals:1}
  ]});
  assert.equal(valid.steps[0].expectReceiptFailure,true);
  assert.equal(valid.steps[1].equals,1);
  assert.throws(()=>validatePlan({schemaVersion:1,name:'receipt-check',steps:[
    {type:'call',method:'start',expectReceiptFailure:'true'}
  ]}),/expectReceiptFailure must be boolean/);
});
test('browser validator and Sandbox runner use one identical schema',async()=>{
  const {validatePlan: browserValidate}=await import('../web/plan-validation.js');
  assert.strictEqual(validatePlan,browserValidate);
});
