import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ui = fs.readFileSync(new URL('../web/receipt-debugger.js', import.meta.url), 'utf8');
const inspector=fs.readFileSync(new URL('../web/transaction-inspector.js',import.meta.url),'utf8');
test('read-only receipt debugger inserts external RPC logs only as text',()=>{
  assert.match(ui,/\.textContent/);
  assert.doesNotMatch(ui,/\.innerHTML|insertAdjacentHTML|eval\s*\(/);
});
test('receipt debugger filters only failed paths, with a pressed state',()=>{
  assert.match(ui,/failedPathIds/);
  assert.match(ui,/aria-pressed/);
  assert.match(ui,/onlyFailures/);
  assert.match(ui,/\.hidden\s*=/);
});
test('receipt debugger describes limits rather than inventing findings',()=>{
  assert.match(ui,/not automatically a vulnerability/);
  assert.match(ui,/does not establish exploitability/);
  assert.match(ui,/not a proven parent\/child chain/);
});
test('receipt debugger offers keyboard-operable receipt details and parent jumps',()=>{
  assert.match(ui,/el\('details'/);
  assert.match(ui,/el\('summary'/);
  assert.match(ui,/\.focus\(\)/);
});
test('transaction explorer renders new debugger without unsafe markup',()=>{
  assert.match(inspector,/renderReceiptDebugger\(result, output\)/);
  assert.doesNotMatch(inspector,/\.innerHTML|insertAdjacentHTML|eval\s*\(/);
});
