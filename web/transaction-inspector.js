import {readTransaction, VERIFIED_SAMPLE} from './transaction-evidence.js';
const form=document.getElementById('tx-form');
const output=document.getElementById('tx-output');
const exportButton=document.getElementById('tx-export');
const submit=form?.querySelector('button[type="submit"]');
const sampleButton=document.getElementById('tx-sample');
let lastResult;
const append=(parent, tag, value, cls)=>{
  const node=document.createElement(tag);
  if(cls) node.className=cls;
  node.textContent=String(value);
  parent.append(node);
  return node;
};
if(form && output && submit && exportButton) {
  sampleButton?.addEventListener('click',()=>{
    form.elements.namedItem('network').value=VERIFIED_SAMPLE.network;
    form.elements.namedItem('hash').value=VERIFIED_SAMPLE.hash;
    form.elements.namedItem('signer').value=VERIFIED_SAMPLE.signer;
    form.requestSubmit();
  });
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    exportButton.disabled=true;
    lastResult=null;
    const values={
      network:form.elements.namedItem('network').value,
      hash:form.elements.namedItem('hash').value.trim(),
      signer:form.elements.namedItem('signer').value.trim().toLowerCase(),
    };
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    submit.disabled=true;
    output.replaceChildren();
    append(output,'p','Requesting actual transaction receipts from NEAR RPC…','tx-loading');
    try {
      const result=await readTransaction(values,fetch,{signal:controller.signal});
      lastResult=result;
      exportButton.disabled=false;
      output.replaceChildren();
      const summary=append(output,'div','','tx-summary');
      append(summary,'strong',result.outcome.toUpperCase(),'tx-status '+result.outcome);
      append(summary,'span',result.receiptCount+' receipts · '+result.receiptFailures+' failed receipts · '+result.unresolvedReceipts+' unresolved','tx-sub');
      const link=document.createElement('a');
      link.href=result.explorer;
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent='Inspect transaction on NearBlocks ↗';
      summary.append(link);
      const meta=append(output,'div','','tx-meta');
      for(const [name,value] of [['Receiver',result.receiver],['Gas burnt (units)',result.gasBurnt],['Executed actions',result.actions.map(a=>a.method?a.type+' '+a.method:a.type).join(' · ')||'None listed']]) {
        const block=append(meta,'div','','tx-meta-item');
        append(block,'span',name);
        append(block,'strong',value);
      }
      append(output,'h3','Execution receipts','tx-heading');
      const ol=append(output,'ol','','tx-receipts');
      for(const receipt of result.receipts) {
        const li=append(ol,'li','','tx-receipt');
        append(li,'span','Receipt '+receipt.index,'tx-index');
        append(li,'strong',receipt.status.toUpperCase(),'tx-status '+receipt.status);
        append(li,'span',receipt.executor || 'Unknown executor','tx-sub');
        const more=append(li,'div','Gas '+receipt.gas+' · '+receipt.id,'tx-detail');
        more.title='Receipt ID and execution gas';
        if(receipt.error) append(li,'pre',receipt.error,'tx-error');
        for(const log of receipt.logs) append(li,'pre',log,'tx-log');
      }
      if(result.receiptTruncated) append(output,'p','Only the first 150 receipts are shown. Exported report is also limited to those receipts.','tx-notice');
      append(output,'p',result.scope,'tx-notice');
    } catch(error) {
      output.replaceChildren();
      append(output,'p',error.name==='AbortError'?'RPC request timed out. Try again.':error.message || 'Unable to load transaction.','tx-error-message');
    } finally {clearTimeout(timeout);submit.disabled=false;}
  });
  exportButton.addEventListener('click',()=>{
    if(!lastResult) return;
    const blob=new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='staterift-transaction-evidence.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
}
