import { runSuite } from '../web/core.js';

const report = runSuite();
const failures = report.scenarios.filter(({ vulnerable }) => !vulnerable.passes).length;
const guarded = report.scenarios.filter(({ protected: p }) => p.passes).length;
console.log(JSON.stringify({ ...report, summary: { detectedFaults: failures, protectedCasesPassing: guarded } }, null, 2));
