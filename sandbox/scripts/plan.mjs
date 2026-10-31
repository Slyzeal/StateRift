/** Test plan validator for the user-supplied Wasm Sandbox runner. */
const namePattern = /^[a-zA-Z0-9_.-]{1,96}$/;
const methodPattern = /^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/;
const gasDefault = '150000000000000';
const strictObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function validatePlan(plan) {
  if (!strictObj(plan) || plan.schemaVersion !== 1) throw new Error('Plan schemaVersion must be 1');
  if (typeof plan.name !== 'string' || !namePattern.test(plan.name)) throw new Error('Invalid plan name');
  if (!Array.isArray(plan.steps) || !plan.steps.length || plan.steps.length > 40) throw new Error('Plan must contain 1–40 steps');
  const steps = plan.steps.map((step, idx) => {
    if (!strictObj(step) || !['call', 'assertView'].includes(step.type) || !methodPattern.test(step.method ?? '')) throw new Error(`Invalid step ${idx + 1}`);
    if (step.args !== undefined && !strictObj(step.args)) throw new Error(`Step ${idx + 1}: args must be a JSON object`);
    if (JSON.stringify(step.args ?? {}).length > 10000) throw new Error(`Step ${idx + 1}: args too large`);
    if (step.type === 'call') {
      const expect = step.expect ?? 'success';
      const gas = step.gas ?? gasDefault;
      if (!['success', 'failure'].includes(expect)) throw new Error(`Step ${idx + 1}: invalid expect`);
      if (typeof gas !== 'string' || !/^\d{1,15}$/.test(gas) || BigInt(gas) > 300_000_000_000_000n || BigInt(gas) < 5_000_000_000_000n) throw new Error(`Step ${idx + 1}: gas outside supported range`);
      return { type: 'call', method: step.method, args: step.args ?? {}, expect, gas };
    }
    if (!Object.hasOwn(step, 'equals')) throw new Error(`Step ${idx + 1}: assertView must define equals`);
    // Deep JSON type guards, and report limits.
    if (JSON.stringify(step.equals) === undefined || JSON.stringify(step.equals).length > 10000) throw new Error(`Step ${idx + 1}: invalid equals`);
    return { type: 'assertView', method: step.method, args: step.args ?? {}, equals: step.equals };
  });
  return { schemaVersion: 1, name: plan.name, steps };
}
