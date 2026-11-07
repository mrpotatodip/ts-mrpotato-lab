#!/usr/bin/env node
// Claude Code PostToolUse hook. Lints the .ts/.tsx files the tool just wrote:
// the edited file for Edit and Write, and for Bash every changed file in an
// app that was modified in the last few seconds. Exit 2 sends stderr to the agent.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RECENT_MS = 15_000;
const MAX_LINES = 30;
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const root = input.cwd ?? process.cwd();

const changed = () => {
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  const top = git(["rev-parse", "--show-toplevel"])[0] ?? root;
  const names = new Set([...git(["diff", "--name-only", "HEAD"]), ...git(["ls-files", "-o", "--exclude-standard"])]);
  return [...names]
    .map((name) => path.join(top, name))
    .filter((file) => fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < RECENT_MS);
};

const files = input.tool_name === "Bash" ? changed() : [input.tool_input?.file_path].filter(Boolean);

const byApp = new Map();
for (const file of files) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const app = file.match(/^(.*\/apps\/[^/]+)\/src\//)?.[1];
  if (!app || !fs.existsSync(path.join(app, "oxlint.config.ts"))) continue;
  byApp.set(app, [...(byApp.get(app) ?? []), path.relative(app, file)]);
}

const report = [];
for (const [app, list] of byApp) {
  const run = spawnSync("pnpm", ["exec", "oxlint", ...list], { cwd: app, encoding: "utf8" });
  if (run.status !== 0) report.push((run.stdout + run.stderr).trim());
}
if (report.length) {
  console.error(report.join("\n").split("\n").slice(0, MAX_LINES).join("\n"));
  process.exit(2);
}
