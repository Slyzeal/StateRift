/**
 * Evaluate contract-call evidence without confusing RPC/worker errors with a
 * contract execution failure. Only callRaw outcomes are contract evidence.
 */
export function evaluateCallOutcome(step, execution, error = null) {
  const hasExecution = execution !== null && typeof execution === 'object';
  const outcomes = hasExecution && Array.isArray(execution.receipts_outcomes)
    ? execution.receipts_outcomes : [];
  const receiptFailures = outcomes.filter((receipt) =>
    receipt?.outcome?.status && Object.hasOwn(receipt.outcome.status, 'Failure')
  ).length;
  const observed = error || !hasExecution
    ? 'execution-error'
    : execution.failed ? 'failure' : 'success';
  const receiptMatch = step.expectReceiptFailure === undefined ||
    (outcomes.length > 0 && (receiptFailures > 0) === step.expectReceiptFailure);
  return {
    observed,
    passed: hasExecution && !error && observed === step.expect && receiptMatch,
    receiptCount: outcomes.length,
    receiptFailures,
    receiptMatch,
    outcomes,
  };
}
