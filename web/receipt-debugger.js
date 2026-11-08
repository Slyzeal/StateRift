import { analyzeReceiptFlow } from './receipt-flow.js';

// All external RPC values are inserted as text nodes; never interpret logs as HTML.
const el = (tag, className = '', text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};

export function renderReceiptDebugger(result, container) {
  const flow = analyzeReceiptFlow(result.receipts, result.initialReceiptIds);
  const failedIds = new Set(flow.failedPathIds);
  const header = el('div', 'flow-heading');
  const titles = el('div');
  titles.append(el('h3', 'tx-heading', 'Receipt execution trace'));
  titles.append(el('p', 'flow-help', 'Each line is an observed NEAR receipt. Connections show creation relationships reported by the RPC, not an inferred execution order.'));
  header.append(titles);
  const toolbar = el('div', 'flow-toolbar');
  const failureButton = el('button', 'secondary flow-filter', `Failure paths · ${result.receiptFailures}`);
  failureButton.type = 'button';
  failureButton.disabled = !result.receiptFailures;
  failureButton.setAttribute('aria-pressed', 'false');
  failureButton.title = 'Show failed receipts and the receipts that created them';
  toolbar.append(failureButton);
  header.append(toolbar);
  container.append(header);
  const summary = el('p', 'flow-diagnosis');
  if (result.outcome === 'success' && result.receiptFailures) {
    summary.classList.add('flow-warning');
    summary.textContent = `The overall transaction succeeded, but ${result.receiptFailures} inner receipt(s) failed. A callback may have handled the failure; inspect the return state and receipt trail. This is not automatically a vulnerability.`;
  } else if (result.receiptFailures) {
    summary.classList.add('flow-warning');
    summary.textContent = `${result.receiptFailures} failed receipt(s) observed. Open each failure to inspect the RPC error and nearby receipts; this alone does not establish exploitability.`;
  } else if (result.receiptCount) {
    summary.classList.add('flow-neutral');
    summary.textContent = `No failed receipts were observed among the ${result.receiptCount} returned receipt(s). This does not prove the contract is secure.`;
  } else {
    summary.textContent = 'The RPC returned no execution receipts. No receipt-level conclusions can be drawn.';
  }
  container.append(summary);
  const provenance = el('p', 'flow-provenance');
  provenance.textContent = flow.hasLinkData
    ? `${flow.linkedCount} receipt(s) linked to a transaction or another receipt; ${flow.unlinkedCount} origin(s) not provided in the returned data. ${flow.truncated ? 'Only the first 150 receipts are displayed.' : ''}`
    : 'This RPC response does not include usable receipt creation links. Shown order is the returned list, not a proven parent/child chain.';
  container.append(provenance);
  const list = el('ol', 'flow-list');
  list.setAttribute('aria-label', 'Observed NEAR receipt execution lineage');
  const nodeElements = new Map();
  const summaryElements = new Map();
  for (const receipt of flow.nodes) {
    const li = el('li', `flow-item flow-${receipt.status}`);
    li.style.setProperty('--flow-level', String(Math.min(receipt.depth, 5)));
    const details = el('details', 'flow-details');
    if (receipt.status === 'failed') details.open = true;
    const heading = el('summary', 'flow-summary');
    heading.append(el('span', 'flow-branch', receipt.parentId ? '↳' : '●'));
    const identity = el('span', 'flow-identity');
    identity.append(el('strong', '', `Receipt ${receipt.index}`));
    identity.append(el('span', 'flow-executor', receipt.executor || 'Unknown executor'));
    heading.append(identity);
    heading.append(el('span', `tx-status ${receipt.status}`, receipt.status.toUpperCase()));
    details.append(heading);
    const body = el('div', 'flow-body');
    const source = el('div', 'flow-origin');
    if (receipt.parentId) {
      source.append(el('span', '', 'Created by '));
      const jump = el('button', 'flow-jump', `receipt ${receipt.parentIndex}`);
      jump.type = 'button';
      jump.addEventListener('click', () => {
        const parentItem = nodeElements.get(receipt.parentId);
        if (parentItem) {
          parentItem.hidden = false;
          parentItem.scrollIntoView({block:'center'});
          summaryElements.get(receipt.parentId)?.focus();
        }
      });
      source.append(jump);
    } else {
      source.textContent = receipt.origin === 'transaction'
        ? 'Created by the transaction'
        : 'Creator not linked in this RPC response';
    }
    body.append(source);
    body.append(el('p', 'flow-facts', `Receipt ID: ${receipt.id || 'not provided'} · Gas burnt: ${receipt.gas || '0'} units`));
    if (receipt.cyclicLink) body.append(el('p', 'flow-warning', 'Inconsistent circular receipt links in the response. Lineage cannot be trusted.'));
    if (receipt.error) {
      body.append(el('div', 'flow-subheading', 'RPC FAILURE'));
      body.append(el('pre', 'tx-error', receipt.error));
    }
    if (receipt.logs?.length) {
      body.append(el('div', 'flow-subheading', 'CONTRACT LOGS'));
      for (const log of receipt.logs) body.append(el('pre', 'tx-log', log));
    } else if (receipt.status === 'failed' && !receipt.error) {
      body.append(el('p', 'flow-facts', 'No error detail was returned for this receipt.'));
    }
    details.append(body);
    li.append(details);
    list.append(li);
    nodeElements.set(receipt.id, li);
    summaryElements.set(receipt.id, heading);
  }
  container.append(list);
  let onlyFailures = false;
  failureButton.addEventListener('click', () => {
    onlyFailures = !onlyFailures;
    failureButton.setAttribute('aria-pressed', String(onlyFailures));
    failureButton.textContent = onlyFailures ? 'Show all receipts' : `Failure paths · ${result.receiptFailures}`;
    for (const receipt of flow.nodes) {
      const li = nodeElements.get(receipt.id);
      if (li) li.hidden = onlyFailures && !failedIds.has(receipt.id);
    }
  });
}
