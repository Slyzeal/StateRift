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
