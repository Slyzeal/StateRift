import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('guided plan workbench is wired into the existing contract UI',()=>{
  const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const js=fs.readFileSync(new URL('../web/plan-builder.js',import.meta.url),'utf8');
  const inspector=fs.readFileSync(new URL('../web/contract-upload.js',import.meta.url),'utf8');
  assert.match(html,/id="plan-workbench"/);
  assert.match(html,/id="plan-add-call"/);
  assert.match(html,/id="plan-add-assert"/);
  assert.match(html,/id="plan-export"/);
  assert.match(html,/id="plan-known-methods"/);
  assert.match(html,/src="\.\/plan-builder\.js"/);
  assert.match(js,/validatePlan/);
  assert.match(js,/expectReceiptFailure/);
  assert.match(inspector,/staterift:wasm-inspected/);
  assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|eval\(/);
});
