/**
 * Validate the pinned, human-readable summary of a specific public CI artifact.
 * This checks data consistency, not GitHub provenance or authenticity.
 */
const HEX64=/^[0-9a-f]{64}$/;
const SHA=/^[0-9a-f]{40}$/;
const same=(a,b)=>a===b;
export const PINNED_RUN=42385158139;
export const PINNED_ARTIFACT=13578329264;

export function validateJudgeEvidence(input){
  if(!input||input.schemaVersion!==1||input.type!=='pinned-github-actions-sandbox-evidence')
    throw new Error('Unsupported judge evidence document.');
  const s=input.source;
  if(!s||s.repository!=='Slyzeal/StateRift'||s.workflowRunId!==PINNED_RUN||
     s.artifactId!==PINNED_ARTIFACT||
     s.workflowUrl!==`https://github.com/Slyzeal/StateRift/actions/runs/${PINNED_RUN}`||
     typeof s.contractSourceCommit!=='string'||!SHA.test(s.contractSourceCommit)||
     !Number.isFinite(Date.parse(s.capturedAt)))
    throw new Error('Evidence source does not match the pinned CI run.');
  const c=input.comparison;
  if(!c||typeof c.scenario!=='string'||c.scenario.length>200||
     typeof c.expectedInvariant!=='string'||c.expectedInvariant.length>220)
    throw new Error('Missing scenario definition.');
  const expected={
    protected:{passed:true, completed:0,failed:1,sha:'be45df07d2be7ca669a7eb90011f0b067b621f3dd1bb3d56d47ef7f68463d20f'},
    vulnerable:{passed:false,completed:1,failed:0,sha:'70b11db72671ce09d473ae50f8a7c2cf33ce3545abff0fade5a70ef91adba298'}
  };
  for(const variant of ['protected','vulnerable']){
    const item=c[variant],spec=expected[variant];
    if(!item||item.passed!==spec.passed||item.wasmSha256!==spec.sha||!HEX64.test(item.wasmSha256)||
      typeof item.sourceFile!=='string'||item.sourceFile!==`sandbox/contracts/${variant==='protected'?'protected':'vulnerable'}.ts`||
      typeof item.highlightedCode!=='string'||item.highlightedCode.length>2500||
      typeof item.analysis!=='string'||item.analysis.length>600||
      !Number.isFinite(Date.parse(item.completedAt))||
      !Number.isSafeInteger(item.receiptCount)||item.receiptCount!==5||
      !Number.isSafeInteger(item.receiptFailures)||item.receiptFailures!==1||
      !Array.isArray(item.receiptOutcomes)||item.receiptOutcomes.length!==5||
      !Array.isArray(item.checks)||item.checks.length!==(variant==='protected'?3:2)||
      !/^\d+$/.test(item.gasBurnt))
      throw new Error('Pinned '+variant+' execution result is inconsistent.');
    if(item.receiptOutcomes.filter(x=>x?.status==='failure').length!==1)
      throw new Error('Pinned '+variant+' receipt statuses are inconsistent.');
    if(item.receiptOutcomes.some(x=>!['success','failure','unknown'].includes(x?.status)||
      typeof x.executor!=='string'||x.executor.length>100||!/^\d+$/.test(x.gas)))
      throw new Error('Invalid Sandbox receipt values.');
    if(item.checks.some(x=>typeof x.label!=='string'||x.label.length>100||typeof x.passed!=='boolean'))
      throw new Error('Invalid contract assertion values.');
    const completed=item.checks.find(x=>x.label==='get_completed()');
    if(!completed||completed.expected!==0||completed.observed!==spec.completed||completed.passed!==spec.passed)
      throw new Error('Pinned settlement invariant does not match artifact.');
    if(item.checks[0]?.label!=='Contract call start()'||item.checks[0]?.observed!=='success'||item.checks[0]?.passed!==true)
      throw new Error('Outer call result does not match artifact.');
    if(variant==='protected'){
      const failed=item.checks.find(x=>x.label==='get_failed()');
      if(!failed||failed.expected!==1||failed.observed!==1||failed.passed!==true)
        throw new Error('Protected failure callback observation is inconsistent.');
    }
  }
  return input;
}
