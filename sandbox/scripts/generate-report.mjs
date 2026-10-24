import fs from 'node:fs';
import { extractSandboxEvidence } from './report-parser.mjs';

const [, , input, output] = process.argv;
if (!input || !output) throw new Error('Usage: node scripts/generate-report.mjs INPUT-LOG OUTPUT-JSON');
const log = fs.readFileSync(input, 'utf8');
const commit = process.env.GITHUB_SHA || null;
const runId = process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : null;
const report = extractSandboxEvidence(log, { commit, runId });
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Exported ${report.tests.length} proven NEAR Sandbox cases to ${output}`);
