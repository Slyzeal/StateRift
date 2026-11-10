/**
 * Keep the sidebar and breadcrumb in sync with the section that is visible.
 * This is navigation only: it never fetches RPC data or starts Sandbox tests.
 */
const targets = {
  lab: ['Overview', 'Mixed tools · clearly labeled'],
  'contract-inspector': ['Inspect contract', 'Real WASM · local inspection'],
  'tx-inspector': ['Live transactions', 'Live NEAR RPC · read-only'],
  'plan-workbench': ['Test plan builder', 'Local plan preparation'],
  'report-review': ['Review report', 'Local report · unverified upload'],
  'fault-lab': ['Fault laboratory', 'Deterministic simulation'],
  'sandbox-evidence': ['Verified evidence', 'Recorded Sandbox CI results'],
};
const links = [...document.querySelectorAll('.sidebar .side-link[href^="#"]')];
const activeLabel = document.getElementById('active-section-label');
const modeLabel = document.getElementById('active-mode-label');

export function setActiveSection(id) {
  if (!Object.hasOwn(targets, id)) return;
  for (const link of links) {
    const current = link.getAttribute('href') === '#' + id;
    link.classList.toggle('current', current);
    if (current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  if (activeLabel) activeLabel.textContent = targets[id][0];
  if (modeLabel) modeLabel.textContent = targets[id][1];
}

if (links.length) {
  const sections = Object.keys(targets).map(id => document.getElementById(id)).filter(Boolean);
  // One scroll listener for every section is unnecessary; choose the nearest
  // heading at/above the top of the viewport, independent of jump ordering.
  let scheduled = false;
  const update = () => {
    scheduled = false;
    let active = 'lab';
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 170) active = section.id;
    }
    setActiveSection(active);
  };
  const queue = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', queue, {passive:true});
  window.addEventListener('resize', queue);
  window.addEventListener('hashchange', queue);
  links.forEach(link => link.addEventListener('click', () => {
    const id = link.getAttribute('href').slice(1);
    setActiveSection(id);
  }));
  requestAnimationFrame(update);
}
