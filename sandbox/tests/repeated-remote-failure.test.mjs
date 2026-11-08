import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'near-workspaces';

/**
 * Real Sandbox adversarial regression:
 * A caller repeats a request whose asynchronous remote action fails.
 * The protected contract must account for each failure without recording a
 * successful settlement; the intentionally broken sample exposes the defect.
 * This is sequential retry behavior, NOT a parallel race/stress claim.
 */
test('repeated failed remote operations cannot falsely settle protected state', {timeout:180_000}, async()=>{
  const worker=await Worker.init({network:'sandbox'});
  try {
    const root=worker.rootAccount;
    const caller=await root.createSubAccount('retry');
    const vulnerable=await root.devDeploy('./build/vulnerable.wasm');
    const protectedContract=await root.devDeploy('./build/protected.wasm');
    const executions=[];
    for(let attempt=0;attempt<2;attempt++){
      for(const [name,contract] of [['protected',protectedContract],['vulnerable',vulnerable]]){
        const result=await caller.callRaw(contract,'start',{}, {gas:'150000000000000'});
        assert.equal(result.failed,false,`${name}: outer callback should handle missing remote method`);
        const outcomes=Array.isArray(result.receipts_outcomes)?result.receipts_outcomes:[];
        const failures=outcomes.filter(r=>r?.outcome?.status&&Object.hasOwn(r.outcome.status,'Failure')).length;
        assert.ok(failures>=1,`${name}: expected actual failed async receipt, not simulated data`);
        executions.push({name,attempt:attempt+1,receipts:outcomes.length,failedReceipts:failures});
      }
    }
    const vulnerableCompleted=Number(await vulnerable.view('get_completed',{}));
    const protectedCompleted=Number(await protectedContract.view('get_completed',{}));
    const protectedFailures=Number(await protectedContract.view('get_failed',{}));
    assert.equal(vulnerableCompleted,2,'unprotected optimistic mutation incorrectly counted both failed operations');
    assert.equal(protectedCompleted,0,'protected contract must never mark either failed operation complete');
    assert.equal(protectedFailures,2,'private callback must record both failures');
    console.log('Repeated remote-failure regression verified on real NEAR Sandbox: vulnerableCompleted=2, protectedCompleted=0, protectedFailures=2');
  }finally{
    await worker.tearDown();
  }
});
