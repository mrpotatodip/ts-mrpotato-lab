#!/usr/bin/env node
// pnpm -s --filter elise-engine-api live:get /repos <accountId>
// Prints { status, body } for one GET route of the app, run in-process against
// the live database (DATABASE_URL, or packages/db-elise/.env). Read only: the
// method is fixed to GET. No service token is needed or used.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [route, account] = process.argv.slice(2);
if (!route?.startsWith("/") || !account) {
  console.error("Usage: pnpm -s --filter elise-engine-api live:get /repos <accountId>");
  process.exit(2);
}

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync(path.resolve(appDir, "../../packages/db-elise/.env"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "");
};

const out = path.join(os.tmpdir(), `live-get-${process.pid}.json`);
const run = spawnSync("pnpm", ["exec", "vitest", "run", "-c", "vitest.live.config.ts", "--reporter=dot"], {
  cwd: appDir,
  encoding: "utf8",
  env: { ...process.env, NODE_NO_WARNINGS: "1", LIVE_DATABASE_URL: databaseUrl(), LIVE_PATH: route, LIVE_ACCOUNT: account, LIVE_OUT: out },
});
if (run.status !== 0 || !fs.existsSync(out)) {
  console.error((run.stdout + run.stderr).trim().split("\n").slice(-25).join("\n"));
  process.exit(1);
}
process.stdout.write(fs.readFileSync(out, "utf8") + "\n");
