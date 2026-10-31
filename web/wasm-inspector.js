/**
 * Local, structural WASM inspection. No execution, RPC or backend transfer.
 * Neither imported host functions nor exported methods prove a security flaw.
 */
export const MAX_WASM_BYTES = 8 * 1024 * 1024;
const MAX_ITEMS = 20000;
const decoder = new TextDecoder('utf-8', { fatal: true });
const HOST_ASYNC = new Set(['promise_create', 'promise_then', 'promise_and', 'promise_return', 'promise_result', 'promise_results_count', 'promise_batch_create', 'promise_batch_then']);
const HOST_STORAGE = new Set(['storage_read', 'storage_write', 'storage_remove', 'storage_has_key']);
const WASM_KINDS = ['function', 'table', 'memory', 'global', 'tag'];

export function inspectWasm(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_WASM_BYTES) throw new Error('WASM must be between 8 bytes and 8 MiB');
  if (bytes[0] !== 0 || bytes[1] !== 97 || bytes[2] !== 115 || bytes[3] !== 109 || bytes[4] !== 1 || bytes[5] !== 0 || bytes[6] !== 0 || bytes[7] !== 0) {
    throw new Error('Invalid WASM header or unsupported binary version');
  }
  const cursor = { offset: 8, end: bytes.length };
  const imports = [], exports = [], sectionIds = [];
  let lastStandardSection = 0;
  let count = 0;
  function must(n, limit) {
    if (!Number.isInteger(n) || n < 0 || cursor.offset + n > limit) throw new Error('Truncated or malformed WASM section');
  }
  function uleb(limit) {
    let result = 0, shift = 0;
    for (let i = 0; i < 5; i++) {
      must(1, limit);
      const b = bytes[cursor.offset++];
      result += (b & 127) * 2 ** shift;
      if (result > 0xffffffff) throw new Error('Oversized WASM integer');
      if (!(b & 128)) return result;
      shift += 7;
    }
    throw new Error('Invalid WASM unsigned LEB128 integer');
  }
  function name(limit) {
    const size = uleb(limit);
    if (size > 32768) throw new Error('WASM symbol name exceeds limit');
    must(size, limit);
    const result = decoder.decode(bytes.subarray(cursor.offset, cursor.offset + size));
    cursor.offset += size;
    return result;
  }
  function limits(limit) {
    const flags = uleb(limit);
    if (flags > 7) throw new Error('Unsupported WASM limit encoding');
    uleb(limit);
    if (flags & 1) uleb(limit);
  }
  function importInfo(kind, limit) {
    if (kind === 0) uleb(limit); // function type
    else if (kind === 1) { must(1, limit); cursor.offset++; limits(limit); }
    else if (kind === 2) limits(limit);
    else if (kind === 3) { must(2, limit); cursor.offset += 2; }
    else if (kind === 4) { must(1, limit); cursor.offset++; uleb(limit); }
    else throw new Error('Unsupported WASM import kind');
  }
  while (cursor.offset < cursor.end) {
    if (++count > MAX_ITEMS) throw new Error('Too many WASM sections');
    const sectionId = bytes[cursor.offset++];
    if (sectionId > 13) throw new Error('Unsupported WASM section ID');
    const sectionLength = uleb(cursor.end);
    must(sectionLength, cursor.end);
    const end = cursor.offset + sectionLength;
    if (sectionId !== 0) {
      if (sectionId <= lastStandardSection) throw new Error('Invalid WASM section ordering');
      lastStandardSection = sectionId;
    }
    sectionIds.push(sectionId);
    if (sectionId === 2 || sectionId === 7) {
      const n = uleb(end);
      if (n > MAX_ITEMS) throw new Error('WASM symbol count exceeds limit');
      for (let i = 0; i < n; i++) {
        if (sectionId === 2) {
          const module = name(end);
          const symbol = name(end);
          must(1, end);
          const kind = bytes[cursor.offset++];
          importInfo(kind, end);
          imports.push({ module, name: symbol, kind: WASM_KINDS[kind] });
        } else {
          const symbol = name(end);
          must(1, end);
          const kind = bytes[cursor.offset++];
          if (kind > 4) throw new Error('Unsupported WASM export kind');
          const index = uleb(end);
          exports.push({ name: symbol, kind: WASM_KINDS[kind], index });
        }
      }
      if (cursor.offset !== end) throw new Error('Malformed WASM import/export payload');
    }
    cursor.offset = end;
  }
  const hostImports = imports.filter((i) => i.module === 'env').map((i) => i.name);
  const asyncSymbols = hostImports.filter((n) => HOST_ASYNC.has(n));
  const storageSymbols = hostImports.filter((n) => HOST_STORAGE.has(n));
  return {
    format: 'wasm-structural-inspection',
    formatVersion: 1,
    byteLength: bytes.byteLength,
    imports,
    exports,
    sections: sectionIds.length,
    signals: {
      usesNearAsyncHostCalls: asyncSymbols.length > 0,
      asyncHostCalls: [...new Set(asyncSymbols)].sort(),
      storageHostCalls: [...new Set(storageSymbols)].sort(),
      exportedFunctions: exports.filter((e) => e.kind === 'function').map((e) => e.name),
    },
    caveat: 'Structural inspection of actual WASM bytes only. These signals do not establish a vulnerability, and no contract methods were executed.'
  };
}
