/**
 * Renders a PUBLISHED snapshot of an already successful GitHub Actions run.
 * This parser checks document shape, not independent authenticity of CI.
 */
export const expectedEvidenceIds = Object.freeze(['premature-settlement', 'missing-refund', 'duplicate-callback']);

export function validateEvidenceSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1 || snapshot.kind !== 'verified-sandbox-snapshot' || snapshot.engine !== 'near-sandbox') {
    throw new Error('Unrecognized evidence snapshot');
  }
  if (!Number.isSafeInteger(snapshot.runId) || snapshot.runId <= 0 ||
      snapshot.runUrl !== `https://github.com/Slyzeal/StateRift/actions/runs/${snapshot.runId}` ||
      !/^[a-f0-9]{40}$/.test(snapshot.commit) ||
      !Number.isFinite(Date.parse(snapshot.capturedAt))) {
    throw new Error('Invalid evidence provenance');
  }
  if (!Array.isArray(snapshot.tests) || snapshot.tests.length !== expectedEvidenceIds.length) {
    throw new Error('Unexpected evidence case count');
  }
  if (new Set(snapshot.tests.map((test) => test.id)).size !== expectedEvidenceIds.length ||
      !expectedEvidenceIds.every((id) => snapshot.tests.some((test) => test.id === id))) {
    throw new Error('Missing or duplicate evidence case');
  }
  for (const test of snapshot.tests) {
    if (test.passed !== true || typeof test.name !== 'string' || typeof test.method !== 'string' ||
        !test.vulnerable || typeof test.vulnerable !== 'object' ||
        !test.protected || typeof test.protected !== 'object') {
      throw new Error('Invalid case result');
    }
  }
  // We validate expected assertions, not merely a cosmetic 'passed' flag.
  const cases = Object.fromEntries(snapshot.tests.map((test) => [test.id, test]));
  if (cases['premature-settlement'].vulnerable.completed !== 1 ||
      cases['premature-settlement'].protected.completed !== 0 ||
      cases['premature-settlement'].protected.failed !== 1 ||
      cases['missing-refund'].vulnerable.available !== 0 ||
      cases['missing-refund'].protected.available !== 10 ||
      cases['missing-refund'].vulnerable.pending !== 0 ||
      cases['missing-refund'].protected.pending !== 0 ||
      cases['duplicate-callback'].vulnerable.completed !== 2 ||
      cases['duplicate-callback'].protected.completed !== 1 ||
      cases['duplicate-callback'].protected.processed !== true) {
    throw new Error('Evidence values fail expected invariants');
  }
  return snapshot;
}
