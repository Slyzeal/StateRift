import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'near-workspaces';

// Unlike the browser model, these tests execute built Wasm on an actual local NEAR Sandbox.
test('failed remote receipt exposes optimistic settlement and protects deferred settlement', { timeout: 180_000 }, async () => {
  const worker = await Worker.init();
  try {
    const root = worker.rootAccount;
    const alice = await root.createSubAccount('alice');
    const buggy = await root.devDeploy('./build/vulnerable.wasm');
    const protectedContract = await root.devDeploy('./build/protected.wasm');

    // A missing method triggers a failed remote receipt; the private self-callback still runs.
    await alice.call(buggy, 'start', {}, { gas: '150000000000000' });
    await alice.call(protectedContract, 'start', {}, { gas: '150000000000000' });

    const buggyCount = await buggy.view('get_completed', {});
    const protectedCount = await protectedContract.view('get_completed', {});
    const failedCount = await protectedContract.view('get_failed', {});

    assert.equal(Number(buggyCount), 1, 'buggy contract keeps false settlement');
    assert.equal(Number(protectedCount), 0, 'protected contract must not settle');
    assert.equal(Number(failedCount), 1, 'protected callback records the failure');
    console.log(JSON.stringify({ engine: 'near-sandbox', buggyCount, protectedCount, failedCount }));
  } finally {
    await worker.tearDown();
  }
});
