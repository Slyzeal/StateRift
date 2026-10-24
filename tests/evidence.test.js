import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateEvidenceSnapshot } from '../web/evidence.js';
import { extractSandboxEvidence } from '../sandbox/scripts/report-parser.mjs';

const snapshot = JSON.parse(fs.readFileSync(new URL('../web/data/sandbox-verification.json', import.meta.url), 'utf8'));

test('published sandbox snapshot has known source and all expected assertions', () => {
  assert.strictEqual(validateEvidenceSnapshot(snapshot), snapshot);
  assert.match(snapshot.runUrl, /^https:\/\/github\.com\/Slyzeal\/StateRift\/actions\/runs\/\d+$/);
});

test('published evidence rejects forged success flags and malicious source URLs', () => {
  const fake = structuredClone(snapshot);
  fake.runUrl = 'https://example.org/redirect';
  assert.throws(() => validateEvidenceSnapshot(fake), /Invalid evidence provenance/);
  const fakeData = structuredClone(snapshot);
  fakeData.tests[0].protected.completed = 1;
  assert.throws(() => validateEvidenceSnapshot(fakeData), /invariants/);
  const duplicate = structuredClone(snapshot);
  duplicate.tests[1].id = duplicate.tests[0].id;
  assert.throws(() => validateEvidenceSnapshot(duplicate), /duplicate/);
});

function successLog() {
  return [
    '# {"engine":"near-sandbox","scenario":"failed-outbound-operation-internal-credit-compensation","vulnerable":{"available":0,"pending":0,"failures":1},"protected":{"available":10,"pending":0,"failures":1}}',
    '# {"engine":"near-sandbox","scenario":"duplicate-successful-async-completion","vulnerableCompleted":2,"protectedCompleted":1,"protectedMarked":true}',
    '# {"engine":"near-sandbox","buggyCount":1,"protectedCount":0,"failedCount":1}',
  ].join('\n');
}

test('report parser extracts all three real sandbox result types', () => {
  const data = extractSandboxEvidence(successLog(), { commit: 'a'.repeat(40), runId: 8, capturedAt: '2026-10-24T08:27:58Z' });
  assert.equal(data.tests.length, 3);
  assert.equal(data.runId, 8);
  assert.equal(data.kind, 'github-actions-evidence-artifact');
});

test('report parser refuses missing or inconsistent receipts', () => {
  assert.throws(() => extractSandboxEvidence(successLog().replace('"protectedCompleted":1', '"protectedCompleted":2')), /Invalid or missing assertion/);
  assert.throws(() => extractSandboxEvidence(successLog().split('\n').slice(0, 2).join('\n')), /Invalid or missing assertion/);
  assert.throws(() => extractSandboxEvidence(successLog() + '\n' + successLog().split('\n')[0]), /duplicate sandbox/);
});
