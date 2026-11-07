# StateRift judge quick start — verifiable security evidence

This project is a prototype. **Real execution evidence and local illustrative models are never presented as interchangeable.**

## 1. Live public receipt inspection (website)

Open [StateRift](https://slyzeal.github.io/StateRift/#tx-inspector).

Select **Try verified testnet example**. This fills in a real published NEAR testnet transaction hash, its signer, and the network. The browser attempts a live read-only JSON-RPC lookup, falling back to FastNear's archival RPC for older transactions. It displays the actual transaction outcome and execution receipts and can export the observed report as JSON. If the RPC provider rejects browser traffic or the network is offline, the site shows an error instead of fictitious data.

Source: [FastNear RPC transaction examples](https://docs.fastnear.com/rpc/examples). The example is a **normal transaction**, not a claimed vulnerability.

## 2. Reproduce local model tests

From repository root, with Node.js 20+:

```sh
npm test
```

The browser's three scripted scenarios are deterministic *models* of asynchronous failure modes. Those are not NEAR chain executions.

## 3. Run a real contract test

The separate CLI uses local NEAR Sandbox to execute a developer-supplied WASM and a JSON plan. Instructions: [docs/CONTRACT_TESTING.md](CONTRACT_TESTING.md).

The integration workflow compiles the demonstration contracts and confirms that a protected plan passes while a deliberately vulnerable plan violates an assertion. See the [CI workflow](https://github.com/Slyzeal/StateRift/actions/workflows/contract-runner.yml). This uses a **local isolated Sandbox**, not NEAR mainnet or a publicly hosted user-upload executor.

## 4. Evidence provenance

- Published Sandbox snapshot: [historical run 40077916424](https://github.com/Slyzeal/StateRift/actions/runs/40077916424).
- Developer-supplied runner: [contract runner CI runs](https://github.com/Slyzeal/StateRift/actions/workflows/contract-runner.yml).
- Read-only public archived transaction smoke: [receipt lookup workflow](https://github.com/Slyzeal/StateRift/actions/workflows/near-rpc-smoke.yml).
- New live lookups are made only on demand, to NEAR JSON-RPC, without wallets, private keys, paid APIs or mutation.
- RPC failures, simulated outcomes, and genuinely observed receipt failures are labeled distinctly.

**Limitations:** StateRift does not automatically find unknown vulnerabilities in arbitrary contracts. A failed NEAR receipt can be perfectly normal and is not proof of exploitability. No production security audit is implied.
