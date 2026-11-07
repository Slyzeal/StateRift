import {validatePlan} from './plan-validation.js';

const container=document.getElementById('plan-steps');
const form=document.getElementById('plan-builder');
const status=document.getElementById('plan-status');
const addCall=document.getElementById('plan-add-call');
const addAssertion=document.getElementById('plan-add-assert');
const exportButton=document.getElementById('plan-export');
const loadSample=document.getElementById('plan-load-sample');
const wasmNote=document.getElementById('plan-wasm-note');
const examples=document.getElementById('plan-known-methods');
let knownMethods=[];

function control(type, options={}) {
  const el=document.createElement(type);
  for(const [key,value] of Object.entries(options)) {
    if(key==='text') el.textContent=value;
    else if(key==='value') el.value=value;
    else if(key==='className') el.className=value;
    else el.setAttribute(key,value);
  }
  return el;
}
const sample=()=>[
  {type:'call',method:'start',args:'{}',expect:'success',gas:'150000000000000',receiptFailure:'yes'},
  {type:'assertView',method:'get_completed',args:'{}',equals:'0'},
  {type:'assertView',method:'get_failed',args:'{}',equals:'1'},
];
const fields={call:[
  ['method','Method name','start'],
  ['args','Arguments (JSON object)','{}'],
  ['expect','Expected call outcome','success'],
  ['receiptFailure','Async receipt failure','any'],
  ['gas','Attached gas (units)','150000000000000'],
],assertView:[
  ['method','View method','get_completed'],
  ['args','Arguments (JSON object)','{}'],
  ['equals','Expected JSON result','0'],
]};
function makeRow(step={type:'call',method:'',args:'{}',expect:'success',receiptFailure:'any',gas:'150000000000000'}) {
  const row=control('div',{className:'plan-row'});
  row.dataset.type=step.type;
  const heading=control('div',{className:'plan-row-heading'});
  const title=control('strong',{text:step.type==='call'?'Call method':'Assert contract state'});
  const remove=control('button',{type:'button',className:'plan-remove',text:'Remove step','aria-label':'Remove test step'});
  remove.addEventListener('click',()=>{row.remove(); renumber();});
  heading.append(title,remove);
  const grid=control('div',{className:'plan-input-grid'});
  for(const [key,labelText,placeholder] of fields[step.type]) {
    const label=control('label',{className:'plan-input'});
    label.append(control('span',{text:labelText}));
    let input;
    if(key==='expect' || key==='receiptFailure') {
      input=control('select',{'data-field':key,'aria-label':labelText});
      const values=key==='expect'?
        [['success','Success'],['failure','Failure']]:
        [['any','Not checked'],['yes','Must have failed receipt'],['no','Must have no failed receipt']];
      for(const [value,text] of values) input.append(control('option',{value,text}));
    } else {
      input=control('input',{
        type:'text',placeholder,
        'data-field':key,
        'aria-label':labelText,
        autocomplete:'off',spellcheck:'false',
        maxlength:key==='equals'||key==='args'?'10000':'150',
      });
      if(key==='method') input.setAttribute('list','plan-known-methods');
    }
    input.value=String(step[key] ?? (key==='method'?'':placeholder));
    label.append(input);grid.append(label);
  }
  row.append(heading,grid);container.append(row);renumber();
  return row;
}
function renumber() {
  [...container.children].forEach((row,i)=>{
    row.querySelector('.plan-row-heading strong').textContent=
      String(i+1).padStart(2,'0')+' · '+(row.dataset.type==='call'?'Call method':'Assert contract state');
  });
}
function jsonValue(text,context) {
  let data;
  try {data=JSON.parse(text);}catch{throw new Error(context+' must be valid JSON.');}
  if(!data || typeof data!=='object' || Array.isArray(data)) {
    if(context.endsWith('arguments')) throw new Error(context+' must be a JSON object.');
  }
  return data;
}
function build() {
  const name=form.elements.namedItem('name').value.trim();
  const rows=[...container.children];
  const steps=rows.map((row,i)=>{
    const f=(key)=>row.querySelector('[data-field="'+key+'"]')?.value?.trim();
    const args=jsonValue(f('args'),'Step '+(i+1)+' arguments');
    if(row.dataset.type==='call') {
      const s={type:'call',method:f('method'),args,expect:f('expect'),gas:f('gas')};
      if(f('receiptFailure')!=='any') s.expectReceiptFailure=f('receiptFailure')==='yes';
      return s;
    }
    const raw=f('equals');
    let equals;
    try{equals=JSON.parse(raw);}catch{throw new Error('Step '+(i+1)+' expected value must be valid JSON.');}
    return {type:'assertView',method:f('method'),args,equals};
  });
  return validatePlan({schemaVersion:1,name,steps});
}
function download(name,content) {
  const blob=new Blob([JSON.stringify(content,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=control('a',{href:url,download:name});
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function inform(message,isError=false) {
  status.textContent=message;
  status.classList.toggle('plan-error',isError);
}
if(form && container && status && exportButton) {
  addCall.addEventListener('click',()=>makeRow({type:'call',method:'',args:'{}',expect:'success',receiptFailure:'any',gas:'150000000000000'}));
  addAssertion.addEventListener('click',()=>makeRow({type:'assertView',method:'',args:'{}',equals:'0'}));
  loadSample.addEventListener('click',()=>{
    container.replaceChildren();form.elements.namedItem('name').value='settlement-protected';
    for(const step of sample()) makeRow(step);
    inform('Loaded the StateRift protected-settlement example. Replace methods and expectations before testing your own contract.');
  });
  exportButton.addEventListener('click',()=>{
    try {
      const plan=build();
      download('staterift-'+plan.name+'.json',plan);
      inform('Test plan validated and downloaded. To execute: run the NEAR Sandbox CLI with your compiled WASM and this plan. No chain execution occurred in this browser.');
    } catch(error) {
      inform(error.message,true);
    }
  });
  document.addEventListener('staterift:wasm-inspected',(event)=>{
    knownMethods=event.detail?.signals?.exportedFunctions || [];
    examples.replaceChildren(...knownMethods.slice(0,64).map(method=>control('option',{value:method})));
    wasmNote.textContent=knownMethods.length
      ? 'Detected '+knownMethods.length+' exported function(s) from '+String(event.detail.filename || 'the uploaded WASM')+'. Choose methods above; actual callable behavior is not guaranteed by an export alone.'
      : 'No callable exported functions detected. The test plan must match the actual contract ABI.';
  });
  loadSample.click();
}

export {jsonValue};