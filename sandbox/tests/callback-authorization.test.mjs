import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'near-workspaces';

// A callback that mutates settlement state must not be invocable by a public caller.
test('protected settlement callback rejects an external attacker', {timeout:180_000}, async()=>{
  const worker=await Worker.init({network:'sandbox'});
  try {
    const root=worker.rootAccount;
    const attacker=await root.createSubAccount('attacker');
    const protectedContract=await root.devDeploy('./build/protected.wasm');
    await assert.rejects(
      attacker.call(protectedContract,'on_complete',{}, {gas:'100000000000000'}),
      'external account must not invoke a private settlement callback'
    );
    const completed=await protectedContract.view('get_completed',{});
    const failed=await protectedContract.view('get_failed',{});
    assert.equal(Number(completed),0,'unauthorized callback must not settle an operation');
    assert.equal(Number(failed),0,'unauthorized callback must not mutate failure ledger');
    // This extra adversarial test is verified by node:test. Keep the original
    // three-scenario evidence JSON schema unchanged for the published snapshot.
    console.log('NEAR Sandbox callback access control verified: external call rejected; completed=0; failed=0');
  } finally {
    await worker.tearDown();
  }
});