import { NearBindgen, NearPromise, call, near, view } from 'near-sdk-js';
import type { PromiseIndex } from 'near-sdk-js';

const REMOTE_GAS = 25_000_000_000_000n;
const CALLBACK_GAS = 25_000_000_000_000n;

@NearBindgen({})
class ProtectedIdempotency {
  completed: number = 0;
  processed: Record<string, boolean> = {};

  @call({})
  start({ operation_id }: { operation_id: string }): NearPromise {
    if (typeof operation_id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(operation_id)) {
      throw new Error('Invalid operation_id');
    }
    return NearPromise.new(near.currentAccountId())
      .functionCall('ack', '{}', 0n, REMOTE_GAS)
      .then(NearPromise.new(near.currentAccountId())
        .functionCall('on_complete', JSON.stringify({ operation_id }), 0n, CALLBACK_GAS))
      .asReturn();
  }

  @call({ privateFunction: true })
  ack(): boolean { return true; }

  @call({ privateFunction: true })
  on_complete({ operation_id }: { operation_id: string }): boolean {
    try {
      near.promiseResult(0 as PromiseIndex);
      // Each callback is a serial state transition: mark once, ignore repeats.
      if (this.processed[operation_id]) return false;
      this.processed[operation_id] = true;
      this.completed += 1;
      return true;
    } catch (_error) {
      return false;
    }
  }

  @view({})
  get_completed(): number { return this.completed; }

  @view({})
  get_processed({ operation_id }: { operation_id: string }): boolean {
    return this.processed[operation_id] === true;
  }
}
