import { runSuite, scenarios } from './core.js';
import { validateEvidenceSnapshot } from './evidence.js';

// A test run is executed only when the user presses Run.
let report = null;
const list = document.getElementById('scenario-list');
const results = document.getElementById('results');
const runButton = document.getElementById('run-tests');
const downloadButton = document.getElementById('download-report');
const overview = document.getElementById('overview');
const navButtons = Array.from(document.querySelectorAll('[data-filter]'));
let selected = 'premature-settlement';
let showVariant = 'vulnerable';
let ran = false;

function escapeHtml(raw) {
  return String(raw).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function drawList() {
  list.innerHTML = scenarios.map((scenario, index) => `
    <button class="scenario ${scenario.id === selected ? 'active' : ''}" data-scenario="${escapeHtml(scenario.id)}" aria-pressed="${scenario.id === selected}">
      <span class="scenario-number">0${index + 1}</span>
      <span class="scenario-main"><strong>${escapeHtml(scenario.name)}</strong><small>${escapeHtml(scenario.category)}</small></span>
      <span class="severity ${scenario.severity}">${escapeHtml(scenario.severity)}</span>
    </button>`).join('');
  list.querySelectorAll('[data-scenario]').forEach((button) => {
    button.addEventListener('click', () => { selected = button.dataset.scenario; drawList(); drawResult(); });
  });
}

function drawResult() {
  const scenario = scenarios.find((item) => item.id === selected);
  const result = report?.scenarios.find((item) => item.id === selected)?.[showVariant];
  const status = result ? (result.passes ? 'PASS' : 'INVARIANT BROKEN') : 'NOT RUN';
  results.innerHTML = `
    <div class="result-header">
      <div><p class="eyebrow">SELECTED TEST / ${escapeHtml(scenario.id.toUpperCase())}</p>
      <h3>${escapeHtml(scenario.name)}</h3><p class="muted">${escapeHtml(scenario.description)}</p></div>
      <span class="result-pill ${result ? (result.passes ? 'pass' : 'fail') : ''}">${status}</span>
    </div>
    <div class="mode-buttons" role="group" aria-label="Implementation variant">
      <button data-mode="vulnerable" class="${showVariant === 'vulnerable' ? 'selected' : ''}">Vulnerable contract</button>
      <button data-mode="protected" class="${showVariant === 'protected' ? 'selected' : ''}">Protected contract</button>
    </div>
    <div class="invariant"><span>INVARIANT</span><p>${escapeHtml(scenario.invariant)}</p></div>
    ${ran ? `
      <div class="state-grid">
        <div><span>Expected state</span><strong>${escapeHtml(result.expected)}</strong></div>
        <div><span>Actual state</span><strong class="${result.passes ? 'good' : 'bad'}">${escapeHtml(result.actual)}</strong></div>
        <div><span>Verdict</span><strong class="${result.passes ? 'good' : 'bad'}">${result.passes ? 'Maintained' : 'Violated'}</strong></div>
      </div>
      <p class="impact">${escapeHtml(result.impact)}</p>
      <div class="timeline-title">Execution trace <span>${result.steps.length} steps</span></div>
      <ol class="timeline">${result.steps.map((step) => `<li><div><strong>${escapeHtml(step.stage)}</strong><span>${escapeHtml(step.message)}</span></div></li>`).join('')}</ol>
    ` : `<div class="empty-state">Choose <strong>Run fault simulations</strong> to inspect state changes and execution traces.</div>`}
  `;
  results.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => { showVariant = button.dataset.mode; drawResult(); });
  });
}

runButton.addEventListener('click', () => {
  report = runSuite();
  ran = true;
  runButton.textContent = 'Rerun fault simulations';
  const failed = report.scenarios.filter((item) => !item.vulnerable.passes).length;
  const guarded = report.scenarios.filter((item) => item.protected.passes).length;
  overview.textContent = `${failed} deliberately vulnerable models failed · ${guarded} protected models passed`;
  downloadButton.disabled = false;
  drawResult();
});

downloadButton.addEventListener('click', () => {
  if (!ran || !report) return;
  const data = JSON.stringify(report, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'staterift-model-report.json';
  a.click();
  URL.revokeObjectURL(url);
});

navButtons.forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('selected'));
  button.classList.add('selected');
  showVariant = button.dataset.filter;
  drawResult();
}));
drawList();
drawResult();

// A read-only, pinned CI snapshot, never confused with live simulation.
// No wallets, RPCs or remote code are contacted to render this evidence.
const evidenceContainer = document.getElementById('sandbox-evidence-results');
if (evidenceContainer) {
  fetch('./data/sandbox-verification.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Evidence file unavailable: HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const evidence = validateEvidenceSnapshot(data);
      const runUrl = escapeHtml(evidence.runUrl);
      const observedDate = new Date(evidence.capturedAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
      });
      evidenceContainer.innerHTML = `
        <div class="evidence-meta">
          <span class="evidence-tag">3 / 3 TESTS PASSED</span>
          <span>Verified on ${escapeHtml(observedDate)} · Run #${evidence.runId} · commit ${escapeHtml(evidence.commit.slice(0, 7))}</span>
          <a href="${runUrl}" target="_blank" rel="noopener noreferrer">Inspect GitHub Actions logs ↗</a>
        </div>
        <div class="evidence-grid">${evidence.tests.map((item) => `
          <article class="evidence-card">
            <span class="evidence-check" aria-label="Test passed">✓ &nbsp; Verified test</span>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.method)}</p>
            <div class="evidence-compare"><span>Vulnerable sample</span><code>${escapeHtml(JSON.stringify(item.vulnerable))}</code></div>
            <div class="evidence-compare"><span>Protected sample</span><code>${escapeHtml(JSON.stringify(item.protected))}</code></div>
          </article>`).join('')}</div>
        <p class="evidence-disclaimer">${escapeHtml(evidence.scope)} <strong>This is a pinned historical result</strong>; it does not automatically change when future tests run.</p>`;
    })
    .catch(() => {
      evidenceContainer.textContent = 'Published evidence snapshot unavailable. Check the repository Actions tab for verified test runs.';
    });
}
