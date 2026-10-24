import { NearBindgen, NearPromise, call, near, view } from 'near-sdk-js';
import type { PromiseIndex } from 'near-sdk-js';

const REMOTE_GAS = 25_000_000_000_000n;
const CALLBACK_GAS = 25_000_000_000_000n;

/** Marks settlement only after a successful remote receipt. */
@NearBindgen({})
class ProtectedSettlement {
  completed: number = 0;
  failed: number = 0;

  @call({})
  start(): NearPromise {
    // No optimistic mutation: a later self-callback decides the result.
    return NearPromise.new(near.currentAccountId())
      .functionCall('method_that_does_not_exist', '{}', 0n, REMOTE_GAS)
      .then(NearPromise.new(near.currentAccountId())
        .functionCall('on_complete', '{}', 0n, CALLBACK_GAS))
      .asReturn();
  }

  @call({ privateFunction: true })
  on_complete(): boolean {
    try {
      near.promiseResult(0 as PromiseIndex);
      this.completed += 1;
      return true;
    } catch (_error) {
      this.failed += 1;
      return false;
    }
  }

  @view({})
  get_completed(): number {
    return this.completed;
  }

  @view({})
  get_failed(): number {
    return this.failed;
  }
}
