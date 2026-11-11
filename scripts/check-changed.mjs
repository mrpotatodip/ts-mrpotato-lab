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

// A deploy writes the `vars` of wrangler.jsonc over the live Worker's variables, so a
// variable that points only at this machine (a lone localhost URL) breaks production.
// A list that merely includes localhost among real origins is a policy question, not
// this check's: the scan's finding on AUTH_TRUSTED_ORIGINS tracks it.
// Comments and trailing commas are valid in wrangler.jsonc; the first replace keeps
// strings (their `//` is part of a URL).
const jsonc = (text) => JSON.parse(text.replace(/("(?:[^"\\]|\\.)*")|\/\/.*$|\/\*[\s\S]*?\*\//gm, (_, string) => string ?? "").replace(/,(\s*[}\]])/g, "$1"));
const LOCAL_ADDRESS = /localhost|127\.0\.0\.1|0\.0\.0\.0/;

const failures = [];
for (const dir of folders("apps")) {
  const file = `${dir}/wrangler.jsonc`;
  if (!fs.existsSync(file)) continue;
  const config = jsonc(fs.readFileSync(file, "utf8"));
  const blocks = [["vars", config.vars], ...Object.entries(config.env ?? {}).map(([name, env]) => [`env.${name}.vars`, env.vars])];
  for (const [where, vars] of blocks) {
    for (const [key, value] of Object.entries(vars ?? {})) {
      const parts = typeof value === "string" ? value.split(/[\s,]+/).filter(Boolean) : [];
      if (parts.length > 0 && parts.every((part) => LOCAL_ADDRESS.test(part))) failures.push(`${file}: ${where}.${key} is "${value}", an address on this machine only. A deploy writes it to the live Worker; keep local values in .dev.vars.`);
    }
  }
}

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
