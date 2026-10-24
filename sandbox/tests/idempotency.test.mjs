import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'near-workspaces';

test('two successful callbacks for the same operation must not double-count completion', { timeout: 180_000 }, async () => {
  const worker = await Worker.init();
  try {
    const root = worker.rootAccount;
    const alice = await root.createSubAccount('alice');
    const buggy = await root.devDeploy('./build/idempotency-vulnerable.wasm');
    const safe = await root.devDeploy('./build/idempotency-protected.wasm');

    for (let i = 0; i < 2; i++) {
      await alice.call(buggy, 'start', { operation_id: 'operation_7' }, { gas: '150000000000000' });
      await alice.call(safe, 'start', { operation_id: 'operation_7' }, { gas: '150000000000000' });
    }

    const buggyCount = Number(await buggy.view('get_completed', {}));
    const safeCount = Number(await safe.view('get_completed', {}));
    const marked = await safe.view('get_processed', { operation_id: 'operation_7' });

    assert.equal(buggyCount, 2, 'vulnerable implementation double counts');
    assert.equal(safeCount, 1, 'protected implementation counts operation only once');
    assert.equal(marked, true, 'operation ID is persisted in contract state');
    console.log(JSON.stringify({
      engine: 'near-sandbox',
      scenario: 'duplicate-successful-async-completion',
      vulnerableCompleted: buggyCount,
      protectedCompleted: safeCount,
      protectedMarked: marked
    }));
  } finally {
    await worker.tearDown();
  }
});
