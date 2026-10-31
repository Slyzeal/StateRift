import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectWasm } from '../web/wasm-inspector.js';

const header = [0, 97, 115, 109, 1, 0, 0, 0];
const text = (v) => [...new TextEncoder().encode(v)];
function moduleWithSymbols(importSymbol='promise_then') {
  const imp = [1, 3, ...text('env'), importSymbol.length, ...text(importSymbol), 0, 0];
  const exp = [1, 5, ...text('start'), 0, 0];
  return Uint8Array.from([...header, 2, imp.length, ...imp, 7, exp.length, ...exp]);
}

test('inspect actual WASM import/export sections without executing bytes', () => {
  const data = inspectWasm(moduleWithSymbols());
  assert.equal(data.imports[0].name, 'promise_then');
  assert.deepEqual(data.signals.asyncHostCalls, ['promise_then']);
  assert.deepEqual(data.signals.exportedFunctions, ['start']);
  assert.equal(data.format, 'wasm-structural-inspection');
});
test('reject invalid header, truncated section and overly large files', () => {
  assert.throws(() => inspectWasm(new Uint8Array([1,2,3,4,5,6,7,8])), /header/);
  assert.throws(() => inspectWasm(Uint8Array.from([...header, 2, 12, 1])), /Truncated/);
  assert.throws(() => inspectWasm(new Uint8Array(8 * 1024 * 1024 + 1)), /8 MiB/);
});
test('no async imports does not mean a contract is secure', () => {
  const data = inspectWasm(moduleWithSymbols('storage_read'));
  assert.equal(data.signals.usesNearAsyncHostCalls, false);
  assert.deepEqual(data.signals.storageHostCalls, ['storage_read']);
  assert.match(data.caveat, /do not establish a vulnerability/);
});
