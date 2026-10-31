# Testing your own compiled NEAR contract

StateRift v0.4 has **two different real inputs**. The hosted website can read your `.wasm` file, inspect its actual imports/exports and generate a SHA-256 report **entirely in the browser**. It does not execute the contract and cannot claim whether it is safe. The CLI runs caller-provided methods on a **fresh local NEAR Sandbox** and checks your explicit assertions.

## Use the website (no installation)

Go to **Inspect contract**, select a compiled `.wasm` file (8 MiB maximum), and export the structural inspection. No private keys, wallet connection, or network RPC is involved. Imported `promise_*` host calls indicate a possible asynchronous execution surface; their presence does not prove a vulnerability, and their absence does not prove safety.

## Execute an actual contract

Requirements: Node.js 22+, enough RAM/storage to run the NEAR Sandbox binary, and network access for one-time dependency installation. Do not run untrusted contracts on a sensitive machine; use a disposable VM/container with no secrets and with resource limits.

From the project root:

```sh
cd sandbox
npm install
node scripts/scan-contract.mjs \
  --wasm /absolute/path/to/your-compiled-contract.wasm \
  --plan plans/settlement-protected.json \
  --output ./contract-report.json
```

**Important:** The sample plan uses `start`, `get_completed` and `get_failed`. You must customize the methods, arguments, and expectations for your contract. An unknown contract cannot be safely and accurately tested against guessed methods.

Plan example:

```json
{
  "schemaVersion": 1,
  "name": "my-contract-check",
  "steps": [
    { "type": "call", "method": "my_mutating_method", "args": {}, "expect": "success" },
    { "type": "assertView", "method": "get_balance", "args": {}, "equals": "100" }
  ]
}
```

- `call` invokes your contract as the generated `tester` account. Set `expect` to `failure` if you are deliberately testing a rejected call. If the contract catches an asynchronous subreceipt failure and returns normally, set `expect` to `success`, then **assert state** with `assertView`.
- `assertView` queries an actual Sandbox contract method and compares the JSON value to `equals` exactly (types matter: `100` differs from `"100"`).
- At most 40 steps; methods must be valid WASM export identifiers; gas limit is 5–300 Tgas.
- Exit code 0 = all checks passed; 1 = one or more assertions failed; 2 = invalid invocation, deployment failure or runner error.
- Output JSON includes actual outcomes, assertion status, the compiled Wasm SHA-256 and execution timestamp; it does not fabricate detected bugs.

## Verified integration

The `Developer contract runner integration` GitHub Action compiles StateRift's two sample contracts and proves both the expected protected success **and** an intentional assertion failure on the vulnerable implementation. This validates the executor, not every possible user contract.

## Why not one-click remote scans on GitHub Pages?

GitHub Pages is a static host. Running arbitrary user-uploaded Wasm in NEAR Sandbox requires a server-side sandbox worker with strong isolation, per-user authentication, file size limits, execution quotas, and protections against denial of service. StateRift intentionally does **not** upload untrusted contracts to an unrestricted public GitHub Actions runner. The locally executable runner is the real execution path until a controlled worker service is deployed.
