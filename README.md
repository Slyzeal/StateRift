# StateRift

**Fault-injection testing for asynchronous smart-contract workflows on NEAR.**

> Break the logic. Protect the chain.

[![Model tests](https://github.com/Slyzeal/StateRift/actions/workflows/ci.yml/badge.svg)](https://github.com/Slyzeal/StateRift/actions/workflows/ci.yml)

StateRift helps developers reason about accounting and state invariants when asynchronous cross-contract calls fail. It is an **early proof of concept**, not a production audit tool.

## What is implemented

- A fully local, dependency-free browser dashboard under `web/`.
- Three deterministic, repeatable **modeled** fault scenarios: premature settlement, missing compensation after a failed transfer, and repeated processing of a successful request.
- Side-by-side vulnerable and protected implementations, human-readable state traces and JSON export.
- Automated checks covering scenario invariants, deterministic output, evidence validation, CI report parsing, and dashboard interactions (`npm test`).
- An independent NEAR SDK JS + Workspaces integration (`sandbox/`) with **three receipt-level tests** against six compiled NEAR Wasm contracts. All three passed in [this GitHub Actions run](https://github.com/Slyzeal/StateRift/actions/runs/40077916424).
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

The demo is a **static website**. In Cloudflare Pages, connect this GitHub repository, select the `main` branch, use **no framework preset**, set output directory to `web`, and leave the build command empty. Pages publishes the static demo. The sandbox test runner remains on GitHub Actions, not Cloudflare Pages.

## Roadmap

1. Persist reusable Sandbox receipt traces, hashes and reproducible test artifacts.
2. Add stronger failure-recovery tests that exercise real NEAR/FT token balances and callback authorizations.
3. Evaluate security assumptions under adversarial concurrency and gas exhaustion.
4. Introduce isolated scanning jobs only after strong process/resource isolation and abuse controls are implemented.

## Security & transparency

Read [`docs/SECURITY.md`](docs/SECURITY.md). StateRift v0.3 is not a vulnerability scanner for arbitrary contracts and does not collect wallet keys or move real funds.

## License

MIT.

## Working with your own NEAR contract (v0.4)

- **Hosted bytecode inspection:** Select a compiled `.wasm` file on the website. StateRift inspects real imports and exports, identifies asynchronous host-call usage, computes SHA-256, and exports a structural report in your browser. It does **not** prove vulnerabilities.
- **Actual Sandbox execution:** The separate developer runner accepts your compiled Wasm and a JSON plan with contract calls and state assertions. It executes those checks on a fresh local NEAR Sandbox and emits a real execution report.
- The GitHub workflow tests the runner against both a correctly protected example and a deliberately vulnerable example. This proves the testing mechanism, not all arbitrary contracts.
- **Public execution backend:** Not yet available on GitHub Pages; it is a static host. Untrusted public uploads require an isolated authenticated worker service.

Read [Testing your own contract](docs/CONTRACT_TESTING.md) for the full procedure and security limits.
