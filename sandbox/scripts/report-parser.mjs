/** Parse stdout of the NEAR Workspaces test runner into an auditable CI artifact.
 * Not a static analysis result or arbitrary contract scanner.
 */
const expected = Object.freeze({
  'premature-settlement': (item) =>
    item.buggyCount === 1 && item.protectedCount === 0 && item.failedCount === 1,
  'missing-refund': (item) =>
    item.vulnerable?.available === 0 && item.vulnerable?.pending === 0 && item.vulnerable?.failures === 1 &&
    item.protected?.available === 10 && item.protected?.pending === 0 && item.protected?.failures === 1,
  'duplicate-callback': (item) =>
    item.vulnerableCompleted === 2 && item.protectedCompleted === 1 && item.protectedMarked === true,
});

export function extractSandboxEvidence(rawLog, { commit = null, runId = null, capturedAt = null } = {}) {
  if (typeof rawLog !== 'string') throw new TypeError('Log must be a string');
  const records = [];
  for (const line of rawLog.split(/\r?\n/)) {
    const match = line.match(/^\s*#\s*(\{.*\})\s*$/);
    if (!match) continue;
    let record;
    try { record = JSON.parse(match[1]); } catch { continue; }
    if (record?.engine === 'near-sandbox') records.push(record);
  }
  const byScenario = {};
  for (const record of records) {
    const id = record.scenario === 'failed-outbound-operation-internal-credit-compensation'
      ? 'missing-refund'
      : record.scenario === 'duplicate-successful-async-completion'
        ? 'duplicate-callback'
        : record.buggyCount !== undefined ? 'premature-settlement' : null;
    if (!id || byScenario[id]) throw new Error('Unknown or duplicate sandbox report');
    byScenario[id] = record;
  }
  for (const [id, check] of Object.entries(expected)) {
    if (!byScenario[id] || !check(byScenario[id])) throw new Error(`Invalid or missing assertion for ${id}`);
  }
  if (commit !== null && !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid commit SHA');
  if (runId !== null && (!Number.isSafeInteger(runId) || runId <= 0)) throw new Error('Invalid run ID');
  const date = capturedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(date))) throw new Error('Invalid capture date');
  return {
    schemaVersion: 1,
    engine: 'near-sandbox',
    kind: 'github-actions-evidence-artifact',
    capturedAt: date,
    commit,
    runId,
    scope: 'Purpose-built NEAR smart contract examples only; no real tokens, uploaded Wasm scanning, or parallel adversarial load testing.',
    tests: Object.entries(byScenario).map(([id, record]) => ({ id, passed: true, observed: record })),
  };
}
