#!/usr/bin/env node
// node scripts/deploy-clean.mjs apps/<app> [ref] [--dry]
// Deploys a COMMITTED ref (default HEAD) from a temporary git worktree, so uncommitted
// edits in your working tree never ship, and the live Worker matches a commit you can
// return to. The deploy guard (scripts/deploy-guard.mjs) is the other way: it refuses a dirty
// tree. --dry makes the worktree, says what it would run, and removes it.
// Live Worker: ask first.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const [app, ref = "HEAD"] = args.filter((arg) => arg !== "--dry");

const STEPS = {
  "apps/elise-engine-api": [["pnpm", ["exec", "wrangler", "deploy"]]],
  "apps/elise-frontend-web": [
    ["pnpm", ["exec", "vite", "build"]],
    ["pnpm", ["exec", "wrangler", "deploy"]],
  ],
};

if (!app || !(app in STEPS)) {
  console.error(`Usage: node scripts/deploy-clean.mjs ${Object.keys(STEPS).join("|")} [ref] [--dry]`);
  process.exit(2);
}

const run = (command, commandArgs, cwd) => {
  const result = spawnSync(command, commandArgs, { cwd, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${commandArgs.join(" ")} exited with ${result.status}`);
};
const git = (...gitArgs) => {
  const result = spawnSync("git", gitArgs, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${gitArgs.join(" ")}: ${result.stderr.trim()}`);
  return result.stdout.trim();
};

const sha = git("rev-parse", "--verify", `${ref}^{commit}`);
const root = git("rev-parse", "--show-toplevel");
const dir = mkdtempSync(join(tmpdir(), "elise-deploy-"));
let made = false;

try {
  git("worktree", "add", "--detach", dir, sha);
  made = true;
  console.log(`deploy-clean: ${app} from commit ${sha.slice(0, 7)} (${git("log", "-1", "--format=%s", sha)})`);
  if (dry) {
    console.log(`deploy-clean: --dry, would run pnpm install --frozen-lockfile, then ${STEPS[app].map(([c, a]) => `${c} ${a.join(" ")}`).join(", then ")} in ${join(dir, app)}`);
  } else {
    run("pnpm", ["install", "--frozen-lockfile"], dir);
    for (const [command, commandArgs] of STEPS[app]) run(command, commandArgs, join(dir, app));
    console.log(`deploy-clean: deployed commit ${sha.slice(0, 7)}`);
  }
} finally {
  if (made) spawnSync("git", ["worktree", "remove", "--force", dir], { cwd: root });
  rmSync(dir, { recursive: true, force: true });
}
