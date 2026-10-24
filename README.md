# StateRift

**Fault-injection testing for asynchronous smart-contract workflows on NEAR.**

> Break the logic. Protect the chain.

[![Model tests](https://github.com/Slyzeal/StateRift/actions/workflows/ci.yml/badge.svg)](https://github.com/Slyzeal/StateRift/actions/workflows/ci.yml)

StateRift helps developers reason about accounting and state invariants when asynchronous cross-contract calls fail. It is an **early proof of concept**, not a production audit tool.

## What is implemented

- A fully local, dependency-free browser dashboard under `web/`.
- Three deterministic, repeatable **modeled** fault scenarios: premature settlement, missing compensation after a failed transfer, and repeated processing of a successful request.
- Side-by-side vulnerable and protected implementations, human-readable state traces and JSON export.
- Seven automated checks covering scenario invariants, determinism, invalid inputs, and dashboard interactions (`npm test`).
- A separate **experimental** NEAR SDK JS + NEAR Workspaces integration (`sandbox/`) with actual contract source for the premature-settlement test. It must be verified through the manual sandbox workflow before any end-to-end performance or security claim.
- GitHub Actions model tests and an independent, manually triggered sandbox integration workflow (not yet executed successfully).

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

The generated JSON file includes `engine: "deterministic-state-simulator"` so it cannot be mistaken for a NEAR Sandbox report.

## Run the experimental NEAR Sandbox test

```sh
cd sandbox
npm install
npm run verify
```

This path requires external downloads (NEAR SDK dependencies, Sandbox binary) and should be executed separately. See [`sandbox/README.md`](sandbox/README.md) for status and limitations.

## Deploy website for free

The demo is a **static website**. In Cloudflare Pages, connect this GitHub repository, select the `main` branch, use **no framework preset**, set output directory to `web`, and leave the build command empty. Pages publishes the static demo. The sandbox test runner remains on GitHub Actions, not Cloudflare Pages.

## Roadmap

1. Verify the actual NEAR Sandbox build and failure-callback test.
2. Add concrete NEAR Sandbox tests for refunds, idempotency, and callback permissions.
3. Generate machine-verifiable receipt traces and replayable test artifacts.
4. Introduce isolated scanning jobs only after strong process/resource isolation and abuse controls are implemented.

## Security & transparency

Read [`docs/SECURITY.md`](docs/SECURITY.md). StateRift v0.1 is not a vulnerability scanner for arbitrary contracts and does not collect wallet keys or move real funds.

## License

MIT.
