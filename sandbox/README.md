# NEAR Sandbox integration

Three real NEAR Sandbox integration tests run independently of the browser's deterministic model.

## Scenarios

1. **Premature settlement:** a missing method fails asynchronously; a vulnerable contract still claims completion, while the corrected contract records failure without claiming completion.
2. **Failed outbound operation / internal-credit compensation:** a simulated payout operation (a deliberately missing asynchronous function call) fails. The vulnerable accounting ledger loses 10 internal credits; the corrected version restores the 10 credits. **This does not send real NEAR or FT tokens**, and it does not exercise token transfer callbacks.
3. **Duplicate completion:** two successful asynchronous self-calls for the same operation ID produce two callbacks. The vulnerable contract increments the counter twice; the corrected contract persists the ID and increments once.

Run locally with Node.js 22+:

```sh
npm install
npm run verify
```

The verification command compiles six Wasm contracts, runs three receipt-level tests, and shuts down each temporary sandbox. No real keys, mainnet RPCs or live funds are used.

The workflow `.github/workflows/sandbox.yml` runs on relevant pull requests and pushes to main; it is also manually triggerable. Look at the GitHub Actions result to confirm actual end-to-end status. A source-only commit is **not evidence** that these cases passed.

## Current limits and security

- These are purpose-written example contracts, not a generic vulnerability detector for uploaded Wasm.
- The compensation example manipulates **internal accounting credits**. It does **not** prove native token or FT refund correctness.
- The duplicate test submits the same ID twice in order, not a high-contention adversarial concurrency benchmark.
- Public arbitrary-contract scanning will require disposable isolation, quotas, timeouts and an authenticated job queue.
- This prototype does not audit financial protocols and provides no security warranty.
