/**
 * StateRift deterministic transaction-state simulator.
 * IMPORTANT: This models NEAR-like receipt outcomes; it is NOT a NEAR Sandbox execution.
 * All amounts are illustrative integer units, not actual assets.
 */
const SCENARIOS = Object.freeze([
  {
    id: 'premature-settlement',
    name: 'Premature settlement',
    category: 'Asynchronous call failure',
    severity: 'high',
    description: 'A contract finalizes an operation before its remote receipt succeeds.',
    invariant: 'settled operations must never exceed successful remote operations',
    failure: 'An external contract rejects the requested operation.',
    expected: 'No completed operation should remain on the ledger after failure.',
  },
  {
    id: 'missing-refund',
    name: 'Missing failure refund',
    category: 'Callback state recovery',
    severity: 'high',
    description: 'An unsuccessful transfer debits the internal ledger without restoration.',
    invariant: 'failed transfers must restore the original internal balance',
    failure: 'A downstream transfer fails after an internal debit.',
    expected: 'The account should still have its original balance.',
  },
  {
    id: 'duplicate-callback',
    name: 'Repeated completion',
    category: 'Idempotency / reentrancy-like logic',
    severity: 'medium',
    description: 'Repeated completion processing credits a successful request twice.',
    invariant: 'each request may be settled exactly once',
    failure: 'Application logic processes the same successful completion twice.',
    expected: 'Only one credit should be recorded.',
  },
]);

export const scenarios = SCENARIOS;

function trace(stage, message, state) {
  return { stage, message, ...state };
}

/**
 * @param {'premature-settlement'|'missing-refund'|'duplicate-callback'} scenarioId
 * @param {'vulnerable'|'protected'} variant
 */
export function simulate(scenarioId, variant) {
  if (!SCENARIOS.some((item) => item.id === scenarioId)) throw new Error('Unknown scenario');
  if (!['vulnerable', 'protected'].includes(variant)) throw new Error('Unknown implementation');
  const secured = variant === 'protected';
  const steps = [];
  let actual;
  let expected;
  let impact;

  if (scenarioId === 'premature-settlement') {
    let completed = 0;
    let externalSuccess = 0;
    steps.push(trace('Request', 'Queue remote action', { completed, externalSuccess }));
    if (!secured) completed += 1;
    steps.push(trace('Awaiting receipt', secured ? 'Keep operation pending' : 'Bug: mark complete immediately', { completed, externalSuccess }));
    // Simulate a failed remote receipt; a NEAR callback is independently scheduled.
    steps.push(trace('Remote failure', 'Target call rejected', { completed, externalSuccess }));
    if (secured) completed = 0;
    steps.push(trace('Finalize', secured ? 'Do not settle unsuccessful action' : 'Stale completion remains', { completed, externalSuccess }));
    actual = completed;
    expected = externalSuccess;
    impact = `${completed} completed record(s) for ${externalSuccess} successful external action(s)`;
  } else if (scenarioId === 'missing-refund') {
    let balance = 20;
    const amount = 7;
    expected = 20;
    steps.push(trace('Initial state', 'Available internal balance', { balance }));
    balance -= amount;
    steps.push(trace('Debit', 'Reserve 7 units for transfer', { balance }));
    steps.push(trace('Remote failure', 'Outbound action failed; no value delivered', { balance }));
    if (secured) balance += amount;
    steps.push(trace('Finalize', secured ? 'Compensating refund applied' : 'Bug: missing compensation', { balance }));
    actual = balance;
    impact = `${expected - balance} internal unit(s) not restored after failure`;
  } else {
    let credits = 0;
    const seen = new Set();
    const requestId = 'request-42';
    expected = 1;
    steps.push(trace('Request', 'Remote action succeeded', { credits }));
    for (let i = 0; i < 2; i += 1) {
      if (!secured || !seen.has(requestId)) {
        credits += 1;
        seen.add(requestId);
      }
      steps.push(trace(`Completion ${i + 1}`, secured && i ? 'Repeated completion ignored' : 'Processed completion', { credits }));
    }
    actual = credits;
    impact = `${credits} credit(s) produced for 1 unique successful request`;
  }
  return {
    id: `${scenarioId}:${variant}`,
    scenarioId,
    variant,
    passes: actual === expected,
    expected,
    actual,
    impact,
    steps,
  };
}

export function runSuite() {
  return {
    schemaVersion: 1,
    engine: 'deterministic-state-simulator',
    network: 'none (local modeled execution)',
    warning: 'These are illustrative model checks, not deployed contract audits or NEAR Sandbox results.',
    scenarios: SCENARIOS.map((scenario) => ({
      ...scenario,
      vulnerable: simulate(scenario.id, 'vulnerable'),
      protected: simulate(scenario.id, 'protected'),
    })),
  };
}
