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
  const ids = ['scenario-list', 'results', 'run-tests', 'download-report', 'overview'];
  const nodes = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const oldDocument = globalThis.document;
  globalThis.document = {
    getElementById(id) { return nodes[id]; },
    querySelectorAll() { return []; },
  };
  try {
    await import('../web/app.js');
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
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
