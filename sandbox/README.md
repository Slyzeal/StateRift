# NEAR Sandbox integration (experimental)

This folder contains **actual NEAR smart-contract source**, not the browser's simplified model. It demonstrates only **one** case so far: optimistic completion before a failed cross-contract receipt.

Run from this `sandbox/` folder, with Node.js 20+ and network access for the initial package installation and NEAR Sandbox binary download:

```sh
npm install
npm run verify
```

This builds two NEAR SDK JS Wasm contracts, starts a local sandbox using NEAR Workspaces, invokes an intentionally missing method asynchronously, and checks the final contract state after callbacks. No mainnet/testnet wallet, credentials, or real funds are used.

**Status:** This integration is a starter implementation and has **not yet been executed end-to-end in the author's restricted development environment**. The build and sandbox workflow must pass before describing this as verified. GitHub's manual `NEAR Sandbox` workflow can perform that validation, independently of the deterministic simulator CI.

Never upload arbitrary untrusted Wasm to a shared long-running runner. Public arbitrary-contract scanning requires disposable process/container isolation, time/memory quotas, and an authenticated job queue; those features are not implemented here.
