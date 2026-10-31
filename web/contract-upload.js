import { inspectWasm, MAX_WASM_BYTES } from './wasm-inspector.js';

const picker = document.getElementById('contract-file');
const output = document.getElementById('contract-inspection-result');
const exportButton = document.getElementById('export-inspection');
let previousReport = null;
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
function saveJson(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
if (picker && output) {
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    previousReport = null;
    exportButton.disabled = true;
    if (!file) return;
    output.textContent = 'Inspecting the selected WASM locally…';
    try {
      if (file.size > MAX_WASM_BYTES) throw new Error('File exceeds the 8 MiB inspection limit');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspected = inspectWasm(bytes);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      previousReport = { ...inspected, filename: file.name, sha256, inspectedAt: new Date().toISOString(), execution: 'none: static inspection only' };
      exportButton.disabled = false;
      const out = inspected.signals;
      output.innerHTML = `
        <div class="inspection-head"><strong>${escape(file.name)}</strong><span class="inspection-good">WASM format detected</span></div>
        <div class="inspection-facts"><span>Size <b>${(inspected.byteLength / 1024).toFixed(1)} KiB</b></span><span>Imports <b>${inspected.imports.length}</b></span><span>Exports <b>${inspected.exports.length}</b></span></div>
        <p class="inspection-subtitle">NEAR asynchronous host calls</p>
        <div class="inspection-tags">${out.asyncHostCalls.length ? out.asyncHostCalls.map((n) => `<code>${escape(n)}</code>`).join('') : '<span>No matching imports detected</span>'}</div>
        <p class="inspection-subtitle">Exported functions</p>
        <div class="inspection-tags">${out.exportedFunctions.length ? out.exportedFunctions.slice(0, 32).map((n) => `<code>${escape(n)}</code>`).join('') : '<span>No exported functions found</span>'}</div>
        <p class="inspection-hash">SHA-256: <code>${sha256}</code></p>
        <p class="inspection-caveat">This reports actual binary structure, not proven security findings. Run an instrumented NEAR Sandbox test plan to check behavior.</p>`;
    } catch (error) {
      output.textContent = `Could not inspect this file: ${error.message}`;
    }
  });
  exportButton.addEventListener('click', () => {
    if (previousReport) saveJson('staterift-wasm-inspection.json', previousReport);
  });
}
