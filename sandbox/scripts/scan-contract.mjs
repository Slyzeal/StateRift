#!/usr/bin/env node
/** Execute developer-provided Wasm and JSON plan on a fresh NEAR Sandbox. */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { Worker } from 'near-workspaces';
import { validatePlan } from './plan.mjs';
import { evaluateCallOutcome } from './call-verdict.mjs';

function argsFrom(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--wasm', '--plan', '--output'].includes(argv[i]) || !argv[i + 1]) throw new Error('Usage: node scripts/scan-contract.mjs --wasm path.wasm --plan plan.json --output report.json');
    opts[argv[i].slice(2)] = argv[i + 1];
  }
  if (!opts.wasm || !opts.plan || !opts.output) throw new Error('Provide --wasm, --plan and --output');
  return opts;
}

export async function runContractPlan({ wasmPath, planPath, outputPath }) {
  // Force a local Sandbox. Never accept a testnet/mainnet override from environment.
  if (process.env.NEAR_WORKSPACES_NETWORK && process.env.NEAR_WORKSPACES_NETWORK !== 'sandbox') {
    throw new Error('This runner is Sandbox-only; remove NEAR_WORKSPACES_NETWORK override');
  }
  const fileInfo = await stat(wasmPath);
  if (fileInfo.size < 8 || fileInfo.size > 8 * 1024 * 1024) throw new Error('WASM outside the 8 MiB limit');
  const wasmBytes = await readFile(wasmPath);
  if (!wasmBytes.subarray(0, 8).equals(Buffer.from([0,97,115,109,1,0,0,0]))) throw new Error('Invalid WASM header');
  const planBytes = await readFile(planPath, 'utf8');
  if (planBytes.length > 100000) throw new Error('Test plan too large');
  const plan = validatePlan(JSON.parse(planBytes));
  const report = {
    schemaVersion: 1,
    engine: 'near-sandbox',
    kind: 'user-contract-execution-report',
    planName: plan.name,
    wasmSha256: createHash('sha256').update(wasmBytes).digest('hex'),
    network: 'local sandbox',
    completedAt: null,
    passed: false,
    steps: [],
    disclaimer: 'Results are limited to the methods, inputs, and assertions supplied by the developer. This is not an exhaustive audit.'
  };
  let worker;
  try {
    worker = await Worker.init({ network: 'sandbox' });
    const root = worker.rootAccount;
    const caller = await root.createSubAccount('tester');
    const contract = await root.devDeploy(wasmPath);
    for (const step of plan.steps) {
      if (step.type === 'call') {
        let error = null, execution = null;
        try {
          // callRaw captures *individual async receipt outcomes*. A successful
          // final callback can still conceal a failed remote receipt.
          execution = await caller.callRaw(contract, step.method, step.args, { gas: step.gas });
        } catch (e) {
          error = String(e?.message ?? e).slice(0, 2000);
        }
        const verdict = evaluateCallOutcome(step, execution, error);
        const { outcomes, receiptFailures, passed, observed } = verdict;
        const receipts = outcomes.slice(0, 24).map((r) => {
          const status = r?.outcome?.status ?? {};
          return {
            id: String(r?.id ?? '').slice(0, 120),
            executor: String(r?.outcome?.executor_id ?? '').slice(0, 120),
            status: Object.hasOwn(status, 'Failure') ? 'failure' :
              (Object.hasOwn(status, 'SuccessValue') || Object.hasOwn(status, 'SuccessReceiptId')) ? 'success' : 'unknown',
            gasBurnt: String(r?.outcome?.gas_burnt ?? '0'),
            logs: Array.isArray(r?.outcome?.logs)
              ? r.outcome.logs.slice(0, 6).map(line => String(line).slice(0, 500)) : [],
            ...(Object.hasOwn(status, 'Failure')
              ? { error: JSON.stringify(status.Failure).slice(0, 900) } : {}),
          };
        });
        report.steps.push({
          type: 'call', method: step.method, expect: step.expect,
          observed, passed,
          receiptCount: outcomes.length, receiptFailures, receiptTruncated: outcomes.length > 24,
          ...(step.expectReceiptFailure === undefined ? {} : { expectReceiptFailure: step.expectReceiptFailure }),
          ...(execution?.result?.transaction?.hash ? { transactionHash: String(execution.result.transaction.hash) } : {}),
          ...(execution ? { gasBurnt: String(execution.gas_burnt ?? '0'), durationMs: execution.durationMs, receipts } : {}),
          ...(error ? { error } : {}),
        });
      } else {
        let actual = null, error = null, passed = false;
        try {
          actual = await contract.view(step.method, step.args);
          passed = isDeepStrictEqual(actual, step.equals);
        } catch (e) {
          error = String(e?.message ?? e).slice(0, 2000);
        }
        report.steps.push({ type: 'assertView', method: step.method, expected: step.equals, actual, passed, ...(error ? { error } : {}) });
      }
    }
    report.passed = report.steps.every((step) => step.passed);
    return report;
  } finally {
    report.completedAt = new Date().toISOString();
    if (worker) await worker.tearDown();
    await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const options = argsFrom(process.argv.slice(2));
    const report = await runContractPlan({
      wasmPath: resolve(options.wasm),
      planPath: resolve(options.plan),
      outputPath: resolve(options.output)
    });
    console.log(`NEAR Sandbox contract run: ${report.steps.filter((x) => x.passed).length}/${report.steps.length} assertions passed`);
    console.log(`Report: ${resolve(options.output)}`);
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error('Unable to run contract test:', error.message);
    process.exitCode = 2;
  }
}
