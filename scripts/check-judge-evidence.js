#!/usr/bin/env node
/**
 * Validate that the judge-facing historical case study remains semantically
 * consistent with fresh executions of the same purpose-built NEAR examples.
 * Fresh SHA-256 hashes are not required to match a pinned older build.
 * Historical provenance must be checked independently via the GitHub run.
 */
import {readFileSync} from 'node:fs';
import {validateJudgeEvidence} from '../web/judge-evidence.js';

const read=(path)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const pinned=validateJudgeEvidence(read('../web/data/judge-runner-evidence.json'));
const protectedRun=read('../sandbox/reports/protected.json');
const vulnerableRun=read('../sandbox/reports/vulnerable.json');

function requireMatch(condition,message){
  if(!condition)throw new Error('Judge evidence CI regression: '+message);
}
function check(run,variant){
  const sample=pinned.comparison[variant];
  const call=run.steps.find(s=>s.type==='call');
  const count=run.steps.find(s=>s.type==='assertView'&&s.method==='get_completed');
  requireMatch(run.engine==='near-sandbox','fresh runner must be real NEAR Sandbox');
  requireMatch(run.passed===sample.passed,variant+' overall verdict changed');
  requireMatch(call?.observed==='success',variant+' outer transaction outcome changed');
  requireMatch(call?.receiptFailures>=1,variant+' failed remote receipt was not actually observed');
  requireMatch(count?.expected===0,variant+' expected invariant changed');
  requireMatch(count?.actual===(variant==='protected'?0:1),variant+' final ledger state changed');
  requireMatch(count.passed===sample.passed,variant+' state assertion verdict changed');
  if(variant==='protected'){
    const failed=run.steps.find(s=>s.type==='assertView'&&s.method==='get_failed');
    requireMatch(failed?.actual===1&&failed.passed===true,'protected failed callback ledger changed');
  }
  return {variant,passed:run.passed,receiptFailures:call.receiptFailures,completed:count.actual,stepCount:run.steps.length};
}
const results=[check(protectedRun,'protected'),check(vulnerableRun,'vulnerable')];
console.log(JSON.stringify({
  engine:'near-sandbox',
  verification:'fresh CI results match the historical judge case study semantics',
  pinnedEvidence:pinned.source.workflowUrl,
  results
}));
