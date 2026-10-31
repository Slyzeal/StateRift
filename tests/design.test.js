import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../web/styles.css', import.meta.url), 'utf8');

test('new design preserves every interactive integration point', () => {
  for (const id of ['lab', 'results', 'scenario-list', 'run-tests', 'download-report', 'overview', 'sandbox-evidence', 'sandbox-evidence-results']) {
    assert.match(html, new RegExp(`\\bid="${id}"`), `missing #${id}`);
  }
  assert.match(html, /type="module" src="\.\/app\.js"/);
  assert.match(html, /href="\.\/styles\.css"/);
});

test('responsive, accessible workspace has meaningful navigation and focus treatment', () => {
  assert.match(html, /Skip to workspace/);
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test('UI is transparent about simulations versus verified sample contract runs', () => {
  assert.match(html, /Local model/);
  assert.match(html, /these are deterministic examples/i);
  assert.match(html, /This is not a security audit/);
  assert.match(html, /Verified Sandbox evidence/);
  assert.doesNotMatch(html, /upload a contract to scan/i);
});