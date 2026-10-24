# Security model and limitations

StateRift v0.3 is a **developer demonstration**, not a security audit or production scanner.

## Two distinct execution paths

1. **Modeled execution:** The public browser dashboard runs deterministic JavaScript state models. Results describe those authored models only; no arbitrary user contract, NEAR RPC, or Wasm is executed.
2. **NEAR Sandbox integration:** Six sample contracts in `sandbox/` demonstrate three asynchronous state bugs and their corrections on a local NEAR Sandbox. The integration passed in GitHub Actions Run #40077916424. The dashboard displays a pinned, read-only snapshot linked to that run, not a live contract scan.

## Known limitations

- Neither static-analysis coverage nor exhaustive search of contract states exists.
- Simulated repeated completion represents application-level duplicate processing, **not a claim that NEAR duplicates promise callbacks automatically**.
- The demonstration uses integer accounting units, **not NEAR coins**. It never moves real funds.
- No uploaded contracts or private keys are accepted, stored, or transmitted.
- The dashboard does not query mainnet or testnet and doesn't establish whether a deployed protocol is vulnerable.
- The sample tests run in NEAR Sandbox but do not test real NEAR or FT token transfer/recovery; all accounting examples use internal units.
- Duplicate-operation tests process two requests for the same ID sequentially, not a high-concurrency adversarial race.
- CI log parsing confirms expected structured outputs and publishes a downloadable artifact, but is not a cryptographic proof of chain state.

## Safe next steps

- Add native NEAR / fungible token movement tests, explicit callback authorization tests and gas exhaustion checks.
- Emit verifiable NEAR receipt traces, contract build hashes and reproducible test configuration.
- Keep pinned website evidence in sync with independently verified GitHub Actions runs.
- Run arbitrary third-party contracts only in isolated short-lived workers with resource quotas, no secrets, restricted egress and explicit allowlisted test harnesses.
- Seek independent security review before relying on reports for real funds.
