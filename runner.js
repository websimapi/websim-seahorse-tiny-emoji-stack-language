import { parseProgram, SeahorseVM } from './lang.js';

/* ...existing code... (none) ... */

const programEl = document.getElementById('program');
const runBtn = document.getElementById('run');
const stepBtn = document.getElementById('step');
const resetBtn = document.getElementById('reset');
const outputEl = document.getElementById('output');
const stackEl = document.getElementById('stack');
const traceEl = document.getElementById('trace');
const inputEl = document.getElementById('input');

let vm = new SeahorseVM({
  instructions: [],
  inputProvider: ()=>inputEl.value,
  onOutput: (s)=> { outputEl.textContent = s; },
  onTrace: (s)=> { traceEl.textContent += s + '\n'; refreshUI(); }
});

function refreshUI(){
  stackEl.textContent = vm.stack.slice().reverse().map((v,i)=>`${v}`).join('\n');
}

function loadProgramFromEditor(){
  const text = programEl.value;
  const instructions = parseProgram(text);
  vm.reset(instructions);
  outputEl.textContent = "";
  traceEl.textContent = "";
  refreshUI();
}

runBtn.addEventListener('click', ()=>{
  loadProgramFromEditor();
  vm.running = true;
  try{
    vm.run();
  }catch(e){
    traceEl.textContent += "Runtime error: " + String(e) + '\n';
  }
  refreshUI();
});

stepBtn.addEventListener('click', ()=>{
  if (vm.instructions.length === 0) loadProgramFromEditor();
  vm.step();
  refreshUI();
});

resetBtn.addEventListener('click', ()=>{
  loadProgramFromEditor();
});

/* simple sample program auto-load if empty */
if (!programEl.value.trim()) {
  programEl.value = "🧜‍♂️🧜‍♂️🧜‍♂️🧜‍♂️🧜‍♂️ 🧜‍♂️🧜‍♂️🧜‍♂️🧜‍♂️🧜‍♂️🧜‍♂️ 10 14";
  loadProgramFromEditor();
} else {
  loadProgramFromEditor();
}

