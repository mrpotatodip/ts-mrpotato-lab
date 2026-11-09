#!/usr/bin/env node
// Claude Code hook. Lints the .ts/.tsx files the tool just wrote:
// the edited file for Edit and Write, and for Bash the files the command changed.
// PreToolUse records the mtime of every changed file before a Bash command runs;
// PostToolUse lints only the files whose mtime moved since, so a file the user
// edits at the same time is never blamed on the agent. With no record (the
// PreToolUse hook is missing) it falls back to files modified in the last few
// seconds. Exit 2 sends stderr to the agent.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RECENT_MS = 15_000;
const MAX_LINES = 30;
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const root = input.cwd ?? process.cwd();
const snapshotPath = path.join(os.tmpdir(), `lint-edited-${input.tool_use_id ?? input.session_id ?? "session"}.json`);

const dirty = () => {
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  const top = git(["rev-parse", "--show-toplevel"])[0] ?? root;
  const names = new Set([...git(["diff", "--name-only", "HEAD"]), ...git(["ls-files", "-o", "--exclude-standard"])]);
  return new Map(
    [...names]
      .map((name) => path.join(top, name))
      .filter((file) => fs.existsSync(file))
      .map((file) => [file, fs.statSync(file).mtimeMs]),
  );
};

const isTracked = (target) => spawnSync("git", ["ls-files", "--error-unmatch", "--", target], { cwd: root, stdio: "ignore" }).status === 0;

// A script that rewrites a tracked file skips the Edit tool's stale-read check, so a change
// the user or another session made meanwhile is lost. New and untracked files are fine.
const rewritesTrackedFile = (command) => {
  const inPlace = /\b(?:sed|perl)\b[^|;&\n]*\s(?:-[A-Za-z]*i[A-Za-z]*|--in-place)(?:\s|=|$)/.test(command);
  const redirected = [...command.matchAll(/(?:>>?|\btee\s+(?:-a\s+)?)\s*([^\s|;&<>]+)/g)].map((match) => match[1]);
  const words = command.split(/\s+/).map((word) => word.replace(/^['"]|['"]$/g, ""));
  return (inPlace && words.some(isTracked)) || redirected.some(isTracked);
};

if (input.hook_event_name === "PreToolUse") {
  if (input.tool_name === "Bash" && rewritesTrackedFile(input.tool_input?.command ?? "")) {
    console.error("This command rewrites a tracked file. Use the Edit tool on existing files (sed -i, perl -i, >, >> and tee skip its stale-read check). New files may be written any way.");
    process.exit(2);
  }
  if (input.tool_name === "Bash") fs.writeFileSync(snapshotPath, JSON.stringify(Object.fromEntries(dirty())));
  process.exit(0);
}

const readSnapshot = () => {
  try {
    const before = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    fs.rmSync(snapshotPath, { force: true });
    return before;
  } catch {
    return null;
  }
};

const changed = () => {
  const before = readSnapshot();
  return [...dirty()]
    .filter(([file, mtime]) => (before ? before[file] !== mtime : Date.now() - mtime < RECENT_MS))
    .map(([file]) => file);
};

const files = input.tool_name === "Bash" ? changed() : [input.tool_input?.file_path].filter(Boolean);

const byApp = new Map();
for (const file of files) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const app = file.match(/^(.*\/apps\/[^/]+)\/src\//)?.[1];
  if (!app || !fs.existsSync(path.join(app, "oxlint.config.ts"))) continue;
  byApp.set(app, [...(byApp.get(app) ?? []), path.relative(app, file)]);
}

// A change made of several edits leaves an unused import or variable after the first one,
// or a JSX tag whose import comes in the next edit.
// That is not worth an interruption: `pnpm check:apps` still catches it at the end.
const HALF_DONE = /\b(?:no-unused-vars|jsx-no-undef|no-undef)\b/;

const report = [];
for (const [app, list] of byApp) {
  const run = spawnSync("pnpm", ["exec", "oxlint", "--no-error-on-unmatched-pattern", ...list], { cwd: app, encoding: "utf8" });
  if (run.status === 0) continue;
  const lines = (run.stdout + run.stderr).trim().split("\n").filter((line) => !HALF_DONE.test(line));
  if (lines.some((line) => /: error /.test(line))) report.push(lines.join("\n"));
}
if (report.length) {
  console.error(report.join("\n").split("\n").slice(0, MAX_LINES).join("\n"));
  process.exit(2);
}
