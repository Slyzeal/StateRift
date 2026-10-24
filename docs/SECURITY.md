# Security model and limitations

StateRift v0.1 is a **developer demonstration**, not a security audit or production scanner.

## Two distinct execution paths

1. **Modeled execution:** The public browser dashboard runs deterministic JavaScript state models. Results describe those authored models only; no arbitrary user contract, NEAR RPC, or Wasm is executed.
2. **NEAR Sandbox integration:** Optional sample contracts in `sandbox/` demonstrate a failed remote call and callback state handling on a local NEAR Sandbox. Until its workflow is executed successfully, the integration is unverified.

## Known limitations

- Neither static-analysis coverage nor exhaustive search of contract states exists.
- Simulated repeated completion represents application-level duplicate processing, **not a claim that NEAR duplicates promise callbacks automatically**.
- The demonstration uses integer accounting units, **not NEAR coins**. It never moves real funds.
- No uploaded contracts or private keys are accepted, stored, or transmitted.
- The dashboard does not query mainnet or testnet and doesn't establish whether a deployed protocol is vulnerable.
- Contract error handling and gas limits require further testing with actual sandbox execution.

## Safe next steps

- Get actual sandbox build and call assertions passing in CI.
- Add deterministic cases for compensating refunds and request-id idempotency in real sample contracts.
- Emit machine-readable NEAR receipt traces, contract build hashes and test configuration.
- Run arbitrary third-party contracts only in isolated short-lived workers with resource quotas, no secrets, restricted egress and explicit allowlisted test harnesses.
- Seek independent security review before relying on reports for real funds.
