import { NearBindgen, NearPromise, call, near, view } from 'near-sdk-js';
import type { PromiseIndex } from 'near-sdk-js';

const REMOTE_GAS = 25_000_000_000_000n;
const CALLBACK_GAS = 25_000_000_000_000n;
const AMOUNT = 10;

/**
 * Safely compensates the internal credit debit if a cross-contract operation
 * fails. This models accounting credits, not actual transferred NEAR tokens.
 */
@NearBindgen({})
class ProtectedCompensation {
  available: number = AMOUNT;
  pending: number = 0;
  failures: number = 0;

  @call({})
  request_payout(): NearPromise {
    if (this.available < AMOUNT) throw new Error('Insufficient internal credits');
    this.available -= AMOUNT;
    this.pending += AMOUNT;
    return NearPromise.new(near.currentAccountId())
      .functionCall('method_that_does_not_exist', '{}', 0n, REMOTE_GAS)
      .then(NearPromise.new(near.currentAccountId())
        .functionCall('on_complete', '{}', 0n, CALLBACK_GAS))
      .asReturn();
  }

  @call({ privateFunction: true })
  on_complete(): boolean {
    this.pending -= AMOUNT;
    try {
      near.promiseResult(0 as PromiseIndex);
      return true;
    } catch (_error) {
      this.available += AMOUNT; // Re-credit the failed outbound operation.
      this.failures += 1;
      return false;
    }
  }

  @view({})
  get_available(): number { return this.available; }

  @view({})
  get_pending(): number { return this.pending; }

  @view({})
  get_failures(): number { return this.failures; }
}
