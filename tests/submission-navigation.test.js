import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const nav=readFileSync(new URL('../web/workspace-navigation.js',import.meta.url),'utf8');
const model=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');

test('sidebar links match actual tool sections and appear in page order',()=>{
  const ids=['contract-inspector','tx-inspector','plan-workbench','report-review','fault-lab','sandbox-evidence'];
  let last=-1;
  for(const id of ids){
    assert.match(html,new RegExp('id="'+id+'"'),id+' section missing');
    const section=html.indexOf('id="'+id+'"');
    assert.ok(section>last,id+' section order changed');
    last=section;
    assert.match(html,new RegExp('class="side-link" href="#'+id+'"'),id+' navigation missing');
  }
  assert.match(html,/href="#lab" aria-current="location"/);
});

test('entry choices distinguish historical evidence, live RPC and local contract inspection',()=>{
  assert.match(html,/class="task-guide"/);
  assert.match(html,/See a verified example[\s\S]*Recorded real NEAR Sandbox results/);
  assert.match(html,/Inspect a live transaction[\s\S]*Live NEAR RPC/);
  assert.match(html,/Test your own contract[\s\S]*execute via CLI/);
  assert.doesNotMatch(html,/LIVE WALKTHROUGH/);
  assert.match(html,/INTERACTIVE · RECORDED SANDBOX DATA/);
});

test('mode badge and breadcrumb update with active section rather than claiming everything is a local model',()=>{
  assert.match(html,/id="active-section-label"/);
  assert.match(html,/id="active-mode-label"/);
  assert.match(html,/src="\.\/workspace-navigation\.js"/);
  assert.match(nav,/Live NEAR RPC · read-only/);
  assert.match(nav,/Deterministic simulation/);
  assert.match(nav,/Recorded Sandbox CI results/);
  assert.match(nav,/aria-current/);
  assert.doesNotMatch(nav,/\.innerHTML|eval\(/);
});

test('running simulations guides visitors to the generated results',()=>{
  assert.match(model,/getElementById\('fault-lab'\)\?\.scrollIntoView\?\./);
  assert.match(html,/id="fault-lab"/);
});
