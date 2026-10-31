import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../web/index.html', import.meta.url),'utf8');
test('contract upload is a visible, accessible workflow with local-only disclosure', () => {
  assert.match(html, /id="contract-file"/);
  assert.match(html, /for="contract-file"/);
  assert.match(html, /id="contract-inspection-result"[^>]*aria-live="polite"/);
  assert.match(html, /src="\.\/contract-upload\.js"/);
  assert.match(html, /Static hosting cannot run the Sandbox service/);
});
