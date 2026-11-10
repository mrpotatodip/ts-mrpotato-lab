#!/usr/bin/env node
// Runs before `wrangler deploy`. A deploy ships the working tree, so edits that
// are not committed go live with it: the app's own folder and `packages/` (the
// contracts and the database package are bundled into every app).
// Usage: node scripts/deploy-guard.mjs apps/<app>
// Commit or stash those edits first. ALLOW_DIRTY_DEPLOY=1 ships them knowingly.
import { spawnSync } from "node:child_process";

const app = process.argv[2];
if (!app) {
  console.error("deploy-guard: pass the app folder, for example apps/elise-engine-api");
  process.exit(2);
}

const status = spawnSync("git", ["status", "--porcelain", "--", app, "packages"], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
if (status.length === 0) process.exit(0);

const list = status.slice(0, 20).join("\n");
const more = status.length > 20 ? `\n...and ${status.length - 20} more` : "";
if (process.env.ALLOW_DIRTY_DEPLOY === "1") {
  console.warn(`deploy-guard: shipping ${status.length} uncommitted change(s) (ALLOW_DIRTY_DEPLOY=1):\n${list}${more}`);
  process.exit(0);
}

console.error(`deploy-guard: ${status.length} uncommitted change(s) under ${app} or packages/ would ship with this deploy:\n${list}${more}\n\nCommit them, then deploy the commit from a clean copy that ignores your working tree: node scripts/deploy-clean.mjs ${app}. Or stash them, or set ALLOW_DIRTY_DEPLOY=1 to ship them on purpose (the live Worker then matches no commit).`);
process.exit(1);
