import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateJudgeEvidence, PINNED_RUN, PINNED_ARTIFACT } from '../web/judge-evidence.js';
const path=new URL('../web/data/judge-runner-evidence.json',import.meta.url);
const fixture=JSON.parse(fs.readFileSync(path,'utf8'));
const clone=()=>structuredClone(fixture);
test('judge walkthrough requires the exact publicly verifiable NEAR Sandbox CI evidence',()=>{
  const e=validateJudgeEvidence(clone());
  assert.equal(e.source.workflowRunId,PINNED_RUN);
  assert.equal(e.source.artifactId,PINNED_ARTIFACT);
  assert.match(e.source.workflowUrl,/github.com\/Slyzeal\/StateRift\/actions\/runs/);
  assert.equal(e.comparison.protected.receiptFailures,1);
  assert.equal(e.comparison.vulnerable.receiptFailures,1);
});
test('the vulnerable example fails its actual state assertion while the protected example passes',()=>{
  const e=validateJudgeEvidence(clone()).comparison;
  assert.equal(e.vulnerable.passed,false);
  assert.equal(e.vulnerable.checks.find(s=>s.label==='get_completed()').observed,1);
  assert.equal(e.protected.passed,true);
  assert.equal(e.protected.checks.find(s=>s.label==='get_completed()').observed,0);
  assert.equal(e.protected.checks.find(s=>s.label==='get_failed()').observed,1);
  assert.equal(e.vulnerable.checks[0].observed,'success');
  assert.equal(e.protected.checks[0].observed,'success');
});
test('does not accept altered source information, forged passes or changed state',()=>{
  const changed=clone();changed.comparison.vulnerable.passed=true;
  assert.throws(()=>validateJudgeEvidence(changed),/inconsistent/);
  const changed2=clone();changed2.comparison.protected.checks[1].observed=1;
  assert.throws(()=>validateJudgeEvidence(changed2),/invariant/);
  const changed3=clone();changed3.source.workflowRunId=123;
  assert.throws(()=>validateJudgeEvidence(changed3),/pinned CI/);
  const changed4=clone();changed4.comparison.protected.receiptFailures=0;
  assert.throws(()=>validateJudgeEvidence(changed4),/inconsistent/);
});
test('security claims and sandbox-local network disclosure remain visible',()=>{
  const html=fs.readFileSync(new URL('../web/judge-lab.html',import.meta.url),'utf8');
  assert.match(html,/not NEAR mainnet or NEAR testnet/i);
  assert.match(html,/not a completed security audit/i);
  assert.match(html,/The vulnerable command intentionally exits with code 1/i);
  assert.match(html,/id="choose-vulnerable"/);
  assert.match(html,/id="choose-protected"/);
  assert.match(html,/id="next-step"/);
  assert.match(html,/id="receipt-list"/);
  assert.match(html,/id="assertion-panel"/);
});
test('judge page renders externally sourced content through safe text nodes',()=>{
  const js=fs.readFileSync(new URL('../web/judge-lab.js',import.meta.url),'utf8');
  assert.match(js,/\.textContent/);
  assert.match(js,/\.replaceChildren\(/);
  assert.doesNotMatch(js,/\.innerHTML|insertAdjacentHTML|eval\s*\(/);
});
