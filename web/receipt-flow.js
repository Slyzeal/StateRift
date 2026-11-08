/**
 * Link NEAR's reported receipt outcomes using their `receipt_ids` edges.
 * This is an execution lineage, NOT a causal vulnerability diagnosis.
 * Unknown links remain unknown; never infer them from array order.
 */
export function analyzeReceiptFlow(receipts, initialReceiptIds = []) {
  const items = Array.isArray(receipts) ? receipts.slice(0, 150) : [];
  const byId = new Map(items.filter(item => typeof item?.id === 'string' && item.id).map(item => [item.id, item]));
  const roots = new Set(Array.isArray(initialReceiptIds) ? initialReceiptIds.filter(id => typeof id === 'string') : []);
  const parents = new Map();
  for (const item of items) {
    const children = Array.isArray(item?.spawnedIds) ? item.spawnedIds : [];
    for (const child of children) {
      if (typeof child !== 'string' || !byId.has(child) || child === item.id || roots.has(child) || parents.has(child)) continue;
      parents.set(child, item.id);
    }
  }
  function lineage(id) {
    const visited = new Set([id]);
    const ancestors = [];
    let current = id;
    let cycle = false;
    while (parents.has(current)) {
      const parent = parents.get(current);
      if (visited.has(parent)) { cycle = true; break; }
      visited.add(parent);
      ancestors.push(parent);
      current = parent;
      if (ancestors.length >= 150) { cycle = true; break; }
    }
    return { ancestors, cycle };
  }
  const failedPathIds = new Set();
  const nodes = items.map((item, index) => {
    const id = item?.id;
    const trace = lineage(id);
    if (item?.status === 'failed') {
      failedPathIds.add(id);
      for (const ancestor of trace.ancestors) failedPathIds.add(ancestor);
    }
    const parentId = parents.get(id) || null;
    const origin = roots.has(id) ? 'transaction' : parentId ? 'receipt' : 'unlinked';
    return {
      ...item,
      index: item.index || index + 1,
      origin,
      parentId,
      parentIndex: parentId ? byId.get(parentId)?.index || items.findIndex(r => r.id === parentId) + 1 : null,
      depth: trace.ancestors.length,
      cyclicLink: trace.cycle,
    };
  });
  const linked = nodes.filter(node => node.origin !== 'unlinked').length;
  return {
    nodes,
    failedPathIds: [...failedPathIds],
    linkedCount: linked,
    unlinkedCount: nodes.length - linked,
    rootCount: nodes.filter(node => node.origin === 'transaction').length,
    hasLinkData: roots.size > 0 || parents.size > 0,
    truncated: Array.isArray(receipts) && receipts.length > 150,
  };
}
