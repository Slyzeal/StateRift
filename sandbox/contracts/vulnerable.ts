import { NearBindgen, NearPromise, call, near, view } from 'near-sdk-js';
import type { PromiseIndex } from 'near-sdk-js';

const REMOTE_GAS = 25_000_000_000_000n;
const CALLBACK_GAS = 25_000_000_000_000n;

/** DELIBERATELY UNSAFE: marks success before a remote receipt is confirmed. */
@NearBindgen({})
class VulnerableSettlement {
  completed: number = 0;

  @call({})
  start(): NearPromise {
    // This ledger entry is WRONG: the remote call has not succeeded yet.
    this.completed += 1;
    return NearPromise.new(near.currentAccountId())
      .functionCall('method_that_does_not_exist', '{}', 0n, REMOTE_GAS)
      .then(NearPromise.new(near.currentAccountId())
        .functionCall('on_complete', '{}', 0n, CALLBACK_GAS))
      .asReturn();
  }

  @call({ privateFunction: true })
  on_complete(): boolean {
    // Intentionally never corrects a failed remote operation.
    try {
      near.promiseResult(0 as PromiseIndex);
      return true;
    } catch (_error) {
      return false;
    }
  }

  @view({})
  get_completed(): number {
    return this.completed;
  }
}
