#!/usr/bin/env node
// Quiet check runner. Runs each project's `check` script for every app or
// package with staged changes (`--all`: every one). Silent output on success
// except one line; on failure, the tail of each failing project, lines cut.
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const git = (args) => spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
const all = process.argv.includes("--all");
const TAIL_LINES = 25;
const LINE_WIDTH = 180;

const folders = (root) => (fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `${root}/${e.name}`) : []);
const projects = all
  ? [...folders("apps"), ...folders("packages")]
  : [...new Set(git(["diff", "--cached", "--name-only"]).split("\n").map((f) => f.match(/^((?:apps|packages)\/[^/]+)\//)?.[1]).filter(Boolean))];

const failures = [];
let ran = 0;
for (const dir of projects) {
  if (!fs.existsSync(`${dir}/package.json`)) continue;
  const run = spawnSync("pnpm", ["--dir", dir, "run", "--if-present", "check"], { encoding: "utf8" });
  ran += 1;
  if (run.status !== 0) {
    const tail = (run.stdout + run.stderr).split("\n").filter(Boolean).slice(-TAIL_LINES).map((l) => l.slice(0, LINE_WIDTH));
    failures.push(`${dir}: check failed\n${tail.join("\n")}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}
console.log(`check ok (${ran} projects)`);
