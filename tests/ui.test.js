import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Dependency-free DOM contract test for the static dashboard.
 * Not a replacement for cross-browser visual testing.
 */
test('dashboard runs the engine on click and switches scenarios and protections', async () => {
  class FakeElement {
    constructor(id = '') {
      this.id = id;
      this._html = '';
      this.textContent = '';
      this.disabled = id === 'download-report';
      this.dataset = {};
      this.listeners = new Map();
      this.childrenMap = new Map();
    }
    set innerHTML(html) { this._html = html; this.childrenMap.clear(); }
    get innerHTML() { return this._html; }
    addEventListener(event, callback) { this.listeners.set(event, callback); }
    click() { this.listeners.get('click')?.(); }
    querySelectorAll(selector) {
      const attr = selector === '[data-scenario]' ? 'scenario' : selector === '[data-mode]' ? 'mode' : null;
      if (!attr) return [];
      if (this.childrenMap.has(attr)) return this.childrenMap.get(attr);
      const re = new RegExp(`data-${attr}="([^"]+)"`, 'g');
      const children = [...this._html.matchAll(re)].map((match) => {
        const child = new FakeElement();
        child.dataset[attr] = match[1];
        return child;
      });
      this.childrenMap.set(attr, children);
      return children;
    }
  }
  const ids = ['scenario-list', 'results', 'run-tests', 'download-report', 'overview', 'sandbox-evidence-results'];
  const nodes = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const oldDocument = globalThis.document;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, './data/sandbox-verification.json');
    const fs = await import('node:fs');
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(new URL('../web/data/sandbox-verification.json', import.meta.url), 'utf8')) };
  };
  globalThis.document = {
    getElementById(id) { return nodes[id]; },
    querySelectorAll() { return []; },
  };
  try {
    await import('../web/app.js');
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(nodes['sandbox-evidence-results'].innerHTML, /3 \/ 3 TESTS PASSED/);
    assert.match(nodes['sandbox-evidence-results'].innerHTML, /GitHub Actions logs/);
    assert.match(nodes['sandbox-evidence-results'].innerHTML, /historical result/);
    assert.match(nodes.results.innerHTML, /NOT RUN/);
    assert.equal(nodes['download-report'].disabled, true);
    nodes['run-tests'].click();
    assert.match(nodes.results.innerHTML, /INVARIANT BROKEN/);
    assert.match(nodes.overview.textContent, /3 deliberately vulnerable models failed/);
    assert.equal(nodes['download-report'].disabled, false);
    nodes.results.querySelectorAll('[data-mode]')[1].click();
    assert.match(nodes.results.innerHTML, />PASS</);
    for (const id of ['missing-refund', 'duplicate-callback', 'premature-settlement']) {
      const target = nodes['scenario-list'].querySelectorAll('[data-scenario]').find((btn) => btn.dataset.scenario === id);
      assert.ok(target);
      target.click();
      assert.match(nodes.results.innerHTML, />PASS</);
      nodes.results.querySelectorAll('[data-mode]')[0].click();
      assert.match(nodes.results.innerHTML, /INVARIANT BROKEN/);
      nodes.results.querySelectorAll('[data-mode]')[1].click();
    }
    nodes['run-tests'].click();
    assert.match(nodes.results.innerHTML, />PASS</);
  } finally {
    if (oldFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = oldFetch;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
