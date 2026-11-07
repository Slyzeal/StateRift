import {validateExecutionReport} from './report-validation.js';
const input=document.getElementById('report-file');
const output=document.getElementById('report-results');
const MAX=256*1024;
const append=(parent,tag,value,cls)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  e.textContent=String(value);
  parent.append(e);
  return e;
};
if(input&&output) {
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];
    if(!file)return;
    output.replaceChildren();
    try {
      if(file.size>MAX)throw new Error('Report exceeds the 256 KiB size limit.');
      const report=validateExecutionReport(JSON.parse(await file.text()));
      append(output,'p','USER-PROVIDED FILE · NOT INDEPENDENTLY VERIFIED','report-provenance');
      const top=append(output,'div','','report-overview');
      append(top,'strong',report.passed?'ALL ASSERTIONS PASSED':'ASSERTIONS FAILED',report.passed?'report-pass':'report-fail');
      append(top,'span',report.planName,'report-name');
      append(output,'p','WASM SHA-256: '+report.wasmSha256,'report-hash');
      append(output,'p',report.steps.filter(s=>s.passed).length+' of '+report.steps.length+' checks passed. This report reflects the supplied test plan only.','report-explain');
      const list=append(output,'ol','','report-steps');
      for(const [i,step] of report.steps.entries()) {
        const li=append(list,'li','','report-step');
        append(li,'span',String(i+1).padStart(2,'0')+' · '+step.type+' · '+step.method,'report-label');
        append(li,'strong',step.passed?'PASS':'FAIL',step.passed?'report-pass':'report-fail');
        if(step.type==='call') {
          append(li,'div','Expected call: '+step.expect+' · Observed: '+step.observed,'report-detail');
          if(step.receiptCount!==undefined)append(li,'div','Actual receipts: '+step.receiptCount+' · Failed receipts: '+step.receiptFailures,'report-detail');
          if(step.expectReceiptFailure!==undefined)append(li,'div','Required async receipt failure: '+String(step.expectReceiptFailure),'report-detail');
          if(step.error)append(li,'pre',String(step.error).slice(0,2000),'report-error');
          for(const receipt of (step.receipts||[]).slice(0,24)) {
            append(li,'div',String(receipt.executor||'Unknown')+' · '+String(receipt.status||'unknown')+' · gas '+String(receipt.gasBurnt||'0'),'report-receipt');
            if(receipt.error) append(li,'pre',String(receipt.error).slice(0,900),'report-error');
            for(const line of (Array.isArray(receipt.logs)?receipt.logs:[]).slice(0,6))
              append(li,'pre',String(line).slice(0,500),'report-detail');
          }
        } else {
          append(li,'pre','Expected: '+JSON.stringify(step.expected)+'\nObserved: '+JSON.stringify(step.actual),'report-detail');
          if(step.error)append(li,'pre',String(step.error).slice(0,2000),'report-error');
        }
      }
      append(output,'p','File parsing confirms format and internal consistency, NOT that these results were produced by a trusted runner. Independently verified CI results are displayed below.','report-explain');
    } catch(error) {
      append(output,'p','Unable to open report: '+(error.message||'Invalid JSON file'),'report-error');
    }
  });
}
