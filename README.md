# StateRift

**Fault-injection testing for asynchronous smart-contract workflows on NEAR.**

> Break the logic. Protect the chain.

[![Model tests](https://github.com/Slyzeal/StateRift/actions/workflows/ci.yml/badge.svg)](https://github.com/Slyzeal/StateRift/actions/workflows/ci.yml)

StateRift helps developers reason about accounting and state invariants when asynchronous cross-contract calls fail. It is a **working hackathon prototype**, not a production audit tool or automatic vulnerability scanner.

**Judge quick start:** [run StateRift in 5 minutes](docs/JUDGE_QUICKSTART.md) · [live website](https://slyzeal.github.io/StateRift/) · [verified Sandbox workflow](https://github.com/Slyzeal/StateRift/actions/workflows/contract-runner.yml).

**Start here for judges:** [Interactive verified execution case study](https://slyzeal.github.io/StateRift/judge-lab.html) — a guided code → real Sandbox receipts → final state comparison, sourced from [GitHub Actions run 42385158139](https://github.com/Slyzeal/StateRift/actions/runs/42385158139). No wallet required. The code example has an intentionally broken contract and a protected version; this is not an arbitrary-code vulnerability scan.

## What is implemented

- A dependency-free static browser workspace under `web/`. WASM inspection, plan preparation, and report review stay local; live NEAR transaction lookups use read-only RPC on demand.
- Three deterministic, repeatable **modeled** fault scenarios: premature settlement, missing compensation after a failed transfer, and repeated processing of a successful request.
- Side-by-side vulnerable and protected implementations, human-readable state traces and JSON export.
- Automated checks covering scenario invariants, deterministic output, evidence validation, CI report parsing, and dashboard interactions (`npm test`).
- An independent NEAR SDK JS + Workspaces integration (`sandbox/`) with **three original receipt-level scenarios** against six compiled NEAR Wasm contracts and an additional private-callback authorization test. The three historical evidence scenarios passed in [this pinned GitHub Actions run](https://github.com/Slyzeal/StateRift/actions/runs/40077916424); check [current Sandbox CI](https://github.com/Slyzeal/StateRift/actions/workflows/sandbox.yml) for newer runs.
- GitHub Actions model tests and independent Sandbox CI on pull requests, pushes, or manual runs. The Sandbox workflow generates a machine-readable verification artifact when all assertions pass.

## Try the local demo (no installation)

Run from the repository root:

```sh
python3 -m http.server 8000 --directory web
```

Open `http://localhost:8000`. Click **Run fault simulations**, explore the three scenarios and export the report.

> Browser simulations are **not NEAR chain executions**. The website runs no user-submitted contract or on-chain scan.

## Run automated modeled checks

Requires Node.js 20+; no npm install needed:

```sh
npm test
node scripts/report.js > report.json
```

The generated JSON file includes `engine: "deterministic-state-simulator"` so it cannot be mistaken for NEAR Sandbox evidence. The website separately shows a **pinned historical snapshot** of the verified GitHub Actions Sandbox result. It does not fetch live chain state.

## Run the experimental NEAR Sandbox test

```sh
cd sandbox
npm install
npm run verify
```

This path downloads dependencies and a Sandbox binary. See [`sandbox/README.md`](sandbox/README.md) for tests, real accounting limitations, and CI evidence artifacts. The CI snapshot in `web/data/sandbox-verification.json` is pinned to one specific run and **must not** be presented as live status.

## Deploy website for free

The website is deployed to **GitHub Pages** using [the automated Pages workflow](.github/workflows/deploy-pages.yml). No hosting key or paid service is needed. It serves the static `web/` directory. The standalone Sandbox test runner executes locally or in GitHub Actions—not on GitHub Pages. A separately hosted, secure arbitrary-WASM execution service has **not** been deployed.

## Roadmap

1. Persist reusable Sandbox receipt traces, hashes and reproducible test artifacts.
2. Add stronger failure-recovery tests that exercise real NEAR/FT token balances and callback authorizations.
3. Evaluate security assumptions under adversarial concurrency and gas exhaustion.
4. Introduce isolated scanning jobs only after strong process/resource isolation and abuse controls are implemented.

## Security & transparency

Read [`docs/SECURITY.md`](docs/SECURITY.md). StateRift is not a vulnerability scanner for arbitrary contracts and does not collect wallet keys or move real funds.

## License

MIT.

## Working with your own NEAR contract

- **Hosted bytecode inspection:** Select a compiled `.wasm` file on the website. StateRift inspects real imports and exports, identifies asynchronous host-call usage, computes SHA-256, and exports a structural report in your browser. It does **not** prove vulnerabilities.
- **Actual Sandbox execution:** The separate developer runner accepts your compiled Wasm and a JSON plan with contract calls and state assertions. It executes those checks on a fresh local NEAR Sandbox and emits a real execution report.
- The GitHub workflow tests the runner against both a correctly protected example and a deliberately vulnerable example. This proves the testing mechanism, not all arbitrary contracts.
- **Public execution backend:** Not yet available on GitHub Pages; it is a static host. Untrusted public uploads require an isolated authenticated worker service.

Read [Testing your own contract](docs/CONTRACT_TESTING.md) for the full procedure and security limits.


## Guided contract testing workflow

The public website now includes a **test-plan builder** next to WASM inspection. It uses the same validator as the local runner, can suggest exported methods from the inspected binary, and exports a validated JSON test plan. The separate near-workspaces CLI runs the contract in a fresh NEAR Sandbox, including optional failed-receipt assertions and state checks. Its machine-readable report can be imported into the browser's **report reviewer** for a clear step-by-step inspection. Reports provided by users are labeled **unverified**, unlike pinned GitHub CI evidence.

This is not one-click public execution. GitHub Pages does not run untrusted contracts server-side.

## Real transaction evidence explorer

The website also provides a **read-only NEAR transaction receipt explorer** for mainnet and testnet. Supply the transaction hash and its signer account, or press **Try verified testnet example** to inspect a known historical NEAR transaction with a live RPC request. Standard and FastNear archival RPC providers are queried with independent deadlines to avoid a stalled endpoint blocking historical lookups. It shows overall status, failed receipts, observed logs, receipt gas, NearBlocks links, and exports the observed result as JSON.

An RPC response can be unavailable depending on CORS, provider limits, or connectivity; failures are surfaced transparently. This feature is **not a vulnerability scanner**, and a failed receipt alone is not proof of exploitation.

## Interactive receipt lineage debugger

The live transaction explorer now includes a **receipt lineage debugger**. For an actual NEAR mainnet or testnet transaction, StateRift reads the receipt IDs created by the transaction and each subsequent receipt from the read-only RPC response, then shows expandable receipt details, failure-path filtering, execution gas, returned logs, and failure errors. The explorer also displays the important distinction between a successful outer transaction and an internally failed asynchronous receipt.

This graph represents **reported receipt creation relationships, not a chronological or causal security proof**. If the RPC does not expose a relationship, the browser explicitly marks its source as unlinked instead of guessing from array order. The public site does not deploy or execute submitted contracts; user-defined tests still use the documented NEAR Sandbox CLI.
