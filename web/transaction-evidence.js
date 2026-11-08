/**
 * Read-only NEAR execution evidence: never calls write methods or signs transactions.
 * A failed receipt is observable; it is not, by itself, proof of a vulnerability.
 */
const HASH = /^[1-9A-HJ-NP-Za-km-z]{40,60}$/;
const ACCOUNT = /^(?=.{2,64}$)[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
export const RPC = Object.freeze({
  mainnet: 'https://rpc.mainnet.near.org',
  testnet: 'https://rpc.testnet.near.org',
});
export const ARCHIVAL_RPC = Object.freeze({
  mainnet:'https://archival-rpc.mainnet.fastnear.com',
  testnet:'https://archival-rpc.testnet.fastnear.com',
});
export const VERIFIED_SAMPLE = Object.freeze({
  network:'testnet',
  hash:'CVyG2xLJ6fuKCtULAxMnWTh2GL5ey2UUiTcgYT3M6Pow',
  signer:'mike.testnet',
});
export function checkInput({network,hash,signer}) {
  if (!Object.hasOwn(RPC, network)) throw new Error('Choose mainnet or testnet.');
  if (!HASH.test(hash || '')) throw new Error('Enter a valid base58 NEAR transaction hash.');
  if (!ACCOUNT.test(signer || '')) throw new Error('Enter the exact signer account ID for that transaction.');
  return {network,hash,signer};
}
export function executionStatus(value) {
  if (value == null || typeof value !== 'object') return 'unknown';
  if (Object.hasOwn(value, 'Failure')) return 'failed';
  if (Object.hasOwn(value, 'SuccessValue') || Object.hasOwn(value, 'SuccessReceiptId')) return 'success';
  return 'unknown';
}
const numGas = (value) => {
  try {
    const n = BigInt(value ?? '0');
    return n >= 0n ? n : 0n;
  } catch { return 0n; }
};
const bounded = (s, max=250) => String(s ?? '').slice(0,max);
export function summarizeTransaction(data, network, hash, signer) {
  if (!data || typeof data !== 'object' || !data.transaction || !Array.isArray(data.receipts_outcome))
    throw new Error('Unexpected RPC transaction response.');
  const receipts = data.receipts_outcome.slice(0, 150).map((item,index) => {
    const o = item?.outcome || {};
    return {
      index:index+1,
      id:bounded(item?.id,100),
      spawnedIds:Array.isArray(o.receipt_ids) ? o.receipt_ids.slice(0,150).filter(x=>typeof x==='string').map(x=>bounded(x,100)) : [],
      executor:bounded(o.executor_id || '',100),
      status:executionStatus(o.status),
      gas:numGas(o.gas_burnt).toString(),
      logs:Array.isArray(o.logs) ? o.logs.slice(0,6).map(x=>bounded(x,500)) : [],
      error:executionStatus(o.status)==='failed' ? bounded(JSON.stringify(o.status?.Failure),600) : '',
    };
  });
  const gas = receipts.reduce((a,r)=>a+BigInt(r.gas), numGas(data.transaction_outcome?.outcome?.gas_burnt)).toString();
  const failures = receipts.filter(x=>x.status==='failed').length;
  const pending = receipts.filter(x=>x.status==='unknown').length;
  const actions = (data.transaction.actions || []).slice(0,25).map(action => {
    const k=action && typeof action==='object' ? Object.keys(action)[0] : null;
    const value=k ? action[k] : null;
    return {type:bounded(k || 'Unknown',55), method:bounded(value?.method_name || '',90)};
  });
  return {
    kind:'observed-near-transaction',network,hash,signer,
    receiver:bounded(data.transaction.receiver_id,100),
    outcome:executionStatus(data.status),
    receiptCount:receipts.length,receiptFailures:failures,unresolvedReceipts:pending,
    receiptTruncated:data.receipts_outcome.length>150,
    gasBurnt:gas,actions,receipts,
    initialReceiptIds:Array.isArray(data.transaction_outcome?.outcome?.receipt_ids) ? data.transaction_outcome.outcome.receipt_ids.slice(0,150).filter(x=>typeof x==='string').map(x=>bounded(x,100)) : [],
    scope:'Observed RPC transaction and receipt outcomes only. This does not establish contract exploitability, fund loss, or an audit finding.',
    explorer:network==='testnet'
      ? 'https://testnet.nearblocks.io/txns/'+encodeURIComponent(hash)
      : 'https://nearblocks.io/txns/'+encodeURIComponent(hash),
  };
}
/**
 * Query independently timed endpoints in parallel. A stalled provider must not
 * consume the entire budget before an archival provider can return historical
 * receipts. Every attempt is read-only and independently abortable.
 */
export async function readTransaction({network,hash,signer},fetcher=fetch,{signal}={}) {
  checkInput({network,hash,signer});
  if(signal?.aborted) throw signal.reason || new DOMException('Request aborted','AbortError');
  const body=JSON.stringify({
    jsonrpc:'2.0',id:'staterift-readonly',method:'tx',
    params:{tx_hash:hash,sender_account_id:signer,wait_until:'FINAL'},
  });
  // Historical transactions are often pruned from non-archival RPC. The
  // archival provider is first for testnet examples, but both start together.
  const providers=network==='testnet'
    ? [ARCHIVAL_RPC[network],RPC[network]]
    : [RPC[network],ARCHIVAL_RPC[network]];
  const controllers=providers.map(()=>new AbortController());
  const abortAll=()=>controllers.forEach(controller=>controller.abort());
  signal?.addEventListener('abort',abortAll,{once:true});
  try {
    const requests=providers.map(async(url,index)=>{
      const controller=controllers[index];
      const timer=setTimeout(()=>controller.abort(),8000);
      try {
        const response=await fetcher(url,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body,
          signal:controller.signal,
        });
        if(!response.ok) throw new Error('RPC HTTP '+response.status);
        const json=await response.json();
        if(json.error) throw new Error(bounded(json.error?.cause?.name || json.error?.message || 'RPC rejected request.',110));
        const result=summarizeTransaction(json.result,network,hash,signer);
        return {...result,rpcProvider:url};
      } finally {
        clearTimeout(timer);
      }
    });
    try {
      const result=await Promise.any(requests);
      abortAll(); // Cancel slower endpoints once a valid result is available.
      return result;
    } catch(error) {
      if(signal?.aborted) throw signal.reason || new DOMException('Request aborted','AbortError');
      const reasons=error instanceof AggregateError ? error.errors : [error];
      const details=reasons.map(e=>String(e?.message||e)).filter(Boolean);
      throw new Error(
        'Unable to retrieve this transaction from NEAR RPC providers. '+
        (details.some(e=>/abort/i.test(e))?'One or more requests timed out. ':'')+
        'Check the network, hash, signer or provider availability. '+
        'You can still inspect the transaction in NearBlocks.'
      );
    }
  } finally {
    abortAll();
    signal?.removeEventListener('abort',abortAll);
  }
}
