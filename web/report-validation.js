/** Validate structure of a user-supplied NEAR Sandbox execution report.
 * Passing validation does NOT establish authenticity of the uploaded file.
 */
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function validateExecutionReport(r) {
  if(!isObject(r)||r.schemaVersion!==1||r.kind!=='user-contract-execution-report'||r.engine!=='near-sandbox')
    throw new Error('Not a StateRift NEAR Sandbox execution report.');
  if(typeof r.wasmSha256!=='string'||!/^[0-9a-f]{64}$/.test(r.wasmSha256))
    throw new Error('Invalid WASM fingerprint.');
  if(typeof r.planName!=='string'||r.planName.length>96||r.planName.length===0)
    throw new Error('Invalid plan name.');
  if(typeof r.passed!=='boolean'||!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>40)
    throw new Error('Invalid execution steps.');
  for(const [i,step] of r.steps.entries()) {
    if(!isObject(step)||!['call','assertView'].includes(step.type)||typeof step.method!=='string'||step.method.length>128||typeof step.passed!=='boolean')
      throw new Error('Invalid step '+(i+1)+'.');
    if(step.type==='call') {
      if(!['success','failure'].includes(step.observed)||!['success','failure'].includes(step.expect))
        throw new Error('Invalid call outcome in step '+(i+1)+'.');
      if(step.receiptFailures!==undefined&&(!Number.isSafeInteger(step.receiptFailures)||step.receiptFailures<0))
        throw new Error('Invalid receipt failure count.');
      if(step.receiptCount!==undefined&&(!Number.isSafeInteger(step.receiptCount)||step.receiptCount<0))
        throw new Error('Invalid receipt count.');
      if(step.receipts!==undefined&&(!Array.isArray(step.receipts)||step.receipts.length>24))
        throw new Error('Invalid receipt list.');
    }
  }
  if(r.passed!==r.steps.every(s=>s.passed))throw new Error('Overall verdict disagrees with step assertions.');
  return r;
}
