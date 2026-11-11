#!/usr/bin/env node
// pnpm scan:run https://github.com/owner/name [--ref BRANCH] [--model ID] [--effort LEVEL] [--skill lite|full] [--local]
// Starts a scan, waits for it to end and prints what it found. A lite scan costs real money.
import { callEngine, engineUrl, parseArgs } from "./engine-call.mjs";

const { flags, rest } = parseArgs(process.argv.slice(2));
if (!rest[0]) {
  console.error("Usage: pnpm scan:run https://github.com/owner/name [--ref BRANCH] [--model ID] [--effort LEVEL] [--skill lite|full] [--local]");
  process.exit(1);
}

const body = {
  repo: rest[0],
  skill: typeof flags.skill === "string" ? flags.skill : "lite",
  model: typeof flags.model === "string" ? flags.model : "claude-haiku-5-5",
  effort: typeof flags.effort === "string" ? flags.effort : "high",
  ...(typeof flags.ref === "string" && { ref: flags.ref }),
};
console.error(`Starting on ${engineUrl(flags)}: ${JSON.stringify(body)}`);
const queued = await callEngine(flags, "POST", "/scans", body);
console.error(`Scan ${queued.scanId} queued`);

const started = Date.now();
let scan;
for (;;) {
  scan = await callEngine(flags, "GET", `/scans/${queued.scanId}`);
  if (scan.status === "succeeded" || scan.status === "failed") break;
  if (Date.now() - started > 15 * 60_000) throw new Error(`Gave up after 15 minutes; ${queued.scanId} is still ${scan.status}.`);
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}

const { findings } = scan.status === "succeeded" ? await callEngine(flags, "GET", `/findings?scanId=${queued.scanId}&limit=100`) : { findings: [] };
console.log(
  JSON.stringify(
    {
      scanId: scan.scanId,
      status: scan.status,
      error: scan.error ? scan.error.slice(0, 300) : null,
      commit: scan.commitSha ?? null,
      branch: scan.branch ?? null,
      tracked: Boolean(scan.branchId),
      untrackedReason: scan.untrackedReason ?? null,
      costUsd: scan.usage?.costUsd ?? null,
      turns: scan.usage?.turns ?? null,
      seconds: scan.usage?.durationMs ? Math.round(scan.usage.durationMs / 1000) : null,
      recheck: scan.summary?.recheck ?? null,
      findings: findings.map((finding) => ({ severity: finding.severity, title: finding.title, where: finding.file ? `${finding.file}:${finding.line ?? ""}` : null })),
    },
    null,
    2,
  ),
);
process.exit(scan.status === "succeeded" ? 0 : 1);
