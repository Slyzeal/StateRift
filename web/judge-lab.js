import {validateJudgeEvidence} from './judge-evidence.js';
const $=(id)=>document.getElementById(id);
const create=(tag,text,cls)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
};
const copy=async(value,button)=>{
  try{
    await navigator.clipboard.writeText(value);
    const old=button.textContent;
    button.textContent='Copied ✓';
    setTimeout(()=>button.textContent=old,1400);
  }catch{
    button.textContent='Select the text to copy';
  }
};
const STAGES=[
  {title:'The state mutation',description:'The error begins in contract logic, before any network result is available.',insight:'The order of the state update matters: an optimistic settlement increment remains even when an asynchronous receipt fails.',label:'SOURCE CODE'},
  {title:'The asynchronous execution',description:'Actual NEAR Sandbox receipt outcomes from a real CI run—not a simulated timeline.',insight:'Both variants contain one failed remote receipt. The overall call can still return success because the later callback handles the failure.',label:'ACTUAL RECEIPTS'},
  {title:'The accounting invariant',description:'View the final on-chain Sandbox state checks made by the runner after the callback.',insight:'The meaningful result is the state assertion, not simply whether the outer call threw an error.',label:'FINAL STATE'}
];
let evidence=null,variant='vulnerable',stage=0;
const switchButtons=[$('choose-vulnerable'),$('choose-protected')];
const stageButtons=[...document.querySelectorAll('[data-stage]')];
function render(){
  if(!evidence)return;
  const item=evidence.comparison[variant];
  const step=STAGES[stage];
  switchButtons.forEach(button=>{
    const active=button.id===`choose-${variant}`;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  stageButtons.forEach((button,index)=>{
    button.classList.toggle('active',index===stage);
    if(index===stage)button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  $('stage-number').textContent=`STEP 0${stage+1} / 03`;
  $('stage-title').textContent=step.title;
  $('stage-description').textContent=step.description;
  $('stage-label').textContent=`${variant.toUpperCase()} · ${step.label}`;
  $('stage-label').className=`outcome-badge ${variant}`;
  $('step-counter').textContent=`${stage+1} of 3`;
  $('prev-step').disabled=stage===0;
  $('next-step').disabled=stage===2;
  $('next-step').textContent=stage===0?'Next: inspect receipts →':stage===1?'Next: check state →':'Complete';
  $('insight-heading').textContent=stage===2?(item.passed?'Invariant maintained':'Invariant broken'):'Why this matters';
  $('insight-text').textContent=stage===2?item.analysis:step.insight;
  $('insight-text').className=variant==='vulnerable'&&stage===2?'attention':'';
  const code=$('code-content'),receipts=$('receipt-list'),assertions=$('assertion-panel');
  code.hidden=stage!==0;
  receipts.hidden=stage!==1;
  assertions.hidden=stage!==2;
  $('panel-heading').textContent=stage===0?'CONTRACT SOURCE EXCERPT':stage===1?'ACTUAL SANDBOX RECEIPTS':'POST-CALL ASSERTIONS';
  $('source-code-link').hidden=stage!==0;
  $('source-code-link').href=`https://github.com/Slyzeal/StateRift/blob/${evidence.source.contractSourceCommit}/${item.sourceFile}`;
  if(stage===0){
    code.replaceChildren();
    item.highlightedCode.split('\n').forEach((line,i)=>{
      const codeLine=create('span',line,'code-line');
      const highlight=variant==='vulnerable'?line.includes('this.completed += 1'):line.includes('No optimistic mutation');
      if(highlight)codeLine.classList.add(variant==='vulnerable'?'line-danger':'line-safe');
      codeLine.setAttribute('data-line',String(i+1).padStart(2,'0'));
      code.append(codeLine);
    });
  }else if(stage===1){
    receipts.replaceChildren();
    item.receiptOutcomes.forEach((r,i)=>{
      const li=create('li',undefined,`receipt ${r.status==='failure'?'receipt-failed':'receipt-success'}`);
      const number=create('span',String(i+1).padStart(2,'0'),'receipt-number');
      const body=create('div',undefined,'receipt-main');
      body.append(create('strong',r.executor,'receipt-executor'));
      body.append(create('small',`Gas burnt: ${r.gas} units`,'receipt-gas'));
      if(r.error)body.append(create('p',`RPC failure: ${r.error}`,'receipt-error'));
      const status=create('span',r.status.toUpperCase(),`receipt-status ${r.status}`);
      li.append(number,body,status);
      receipts.append(li);
    });
  }else{
    assertions.replaceChildren();
    const result=create('div',undefined,`invariant-result ${item.passed?'good':'bad'}`);
    result.append(create('div',item.passed?'EXPECTED RESULT VERIFIED':'THE INVARIANT WAS VIOLATED','result-eyebrow'));
    result.append(create('strong',item.passed?'PASS — PROTECTED':'FAIL — VULNERABLE'));
    result.append(create('p',`${item.checks.filter(s=>s.passed).length} of ${item.checks.length} checks passed · ${item.receiptFailures} failed asynchronous receipt`));
    assertions.append(result);
    item.checks.forEach(check=>{
      const row=create('div',undefined,'assertion-row');
      const name=create('div',undefined,'assertion-name');
      name.append(create('strong',check.label));
      name.append(create('span',`Expected ${JSON.stringify(check.expected)} · Observed ${JSON.stringify(check.observed)}`));
      row.append(name,create('span',check.passed?'PASS':'FAIL',`assertion-badge ${check.passed?'good':'bad'}`));
      assertions.append(row);
    });
    assertions.append(create('p',`WASM SHA-256: ${item.wasmSha256}`,'evidence-hash'));
  }
}

switchButtons.forEach(button=>button.addEventListener('click',()=>{
  variant=button.id==='choose-vulnerable'?'vulnerable':'protected';
  render();
}));
stageButtons.forEach((button,index)=>button.addEventListener('click',()=>{stage=index;render();}));
$('prev-step').addEventListener('click',()=>{stage=Math.max(0,stage-1);render();});
$('next-step').addEventListener('click',()=>{stage=Math.min(2,stage+1);render();});
$('copy-command').addEventListener('click',()=>copy($('command-text').textContent,$('copy-command')));

try{
  const response=await fetch('./data/judge-runner-evidence.json',{cache:'no-store'});
  if(!response.ok)throw new Error(`Evidence unavailable: HTTP ${response.status}`);
  evidence=validateJudgeEvidence(await response.json());
  $('verified-source').textContent='Pinned CI run #'+evidence.source.workflowRunId+' · independently verify on GitHub';
  $('evidence-link').href=evidence.source.workflowUrl;
  $('artifact-link').href=evidence.source.workflowUrl;
  render();
}catch(error){
  $('verified-source').textContent='Unable to verify evidence snapshot · '+error.message;
  $('verified-source').classList.add('source-error');
  $('code-content').textContent='Evidence could not be validated. Open the original GitHub Actions artifact to inspect the actual results.';
  switchButtons.forEach(b=>b.disabled=true);
  stageButtons.forEach(b=>b.disabled=true);
  $('next-step').disabled=true;
}
