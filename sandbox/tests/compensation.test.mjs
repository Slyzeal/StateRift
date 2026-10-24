import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'near-workspaces';

test('failed outbound operation: vulnerable accounting loses credits; protected accounting compensates', { timeout: 180_000 }, async () => {
  const worker = await Worker.init();
  try {
    const root = worker.rootAccount;
    const alice = await root.createSubAccount('alice');
    const buggy = await root.devDeploy('./build/compensation-vulnerable.wasm');
    const safe = await root.devDeploy('./build/compensation-protected.wasm');

    await alice.call(buggy, 'request_payout', {}, { gas: '150000000000000' });
    await alice.call(safe, 'request_payout', {}, { gas: '150000000000000' });

    const bAvailable = Number(await buggy.view('get_available', {}));
    const bPending = Number(await buggy.view('get_pending', {}));
    const bFailures = Number(await buggy.view('get_failures', {}));
    const sAvailable = Number(await safe.view('get_available', {}));
    const sPending = Number(await safe.view('get_pending', {}));
    const sFailures = Number(await safe.view('get_failures', {}));

    assert.deepEqual([bAvailable, bPending, bFailures], [0, 0, 1], 'bug retains incorrect internal balance');
    assert.deepEqual([sAvailable, sPending, sFailures], [10, 0, 1], 'safe implementation compensates exactly once');
    console.log(JSON.stringify({
      engine: 'near-sandbox',
      scenario: 'failed-outbound-operation-internal-credit-compensation',
      vulnerable: { available: bAvailable, pending: bPending, failures: bFailures },
      protected: { available: sAvailable, pending: sPending, failures: sFailures }
    }));
  } finally {
    await worker.tearDown();
  }
});
