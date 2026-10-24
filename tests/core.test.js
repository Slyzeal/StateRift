import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite, scenarios, simulate } from '../web/core.js';

test('all three deliberately vulnerable examples break their invariants', () => {
  assert.equal(scenarios.length, 3);
  for (const { id } of scenarios) {
    assert.equal(simulate(id, 'vulnerable').passes, false, `${id} must fail`);
  }
});

test('all three protected examples preserve invariants', () => {
  for (const { id } of scenarios) {
    const result = simulate(id, 'protected');
    assert.equal(result.passes, true, `${id} must pass`);
    assert.equal(result.actual, result.expected);
  }
});

test('simulator is deterministic and traceable', () => {
  const a = runSuite();
  const b = runSuite();
  assert.deepEqual(a, b);
  assert.equal(a.scenarios.length, 3);
  for (const item of a.scenarios) {
    assert.ok(item.vulnerable.steps.length >= 3);
    assert.ok(item.protected.steps.length >= 3);
  }
});

test('rejects unknown scenarios and variants', () => {
  assert.throws(() => simulate('anything', 'vulnerable'), /Unknown scenario/);
  assert.throws(() => simulate('premature-settlement', 'anything'), /Unknown implementation/);
});

test('refund scenario models a compensating credit after failure', () => {
  const bad = simulate('missing-refund', 'vulnerable');
  const good = simulate('missing-refund', 'protected');
  assert.equal(bad.actual, 13);
  assert.equal(good.actual, 20);
});

test('duplicate completion is filtered in protected variant', () => {
  assert.equal(simulate('duplicate-callback', 'vulnerable').actual, 2);
  assert.equal(simulate('duplicate-callback', 'protected').actual, 1);
});
