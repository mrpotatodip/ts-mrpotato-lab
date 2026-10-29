#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const TYPES = ["feat", "fix", "chore", "docs", "refactor", "test", "ci", "hotfix", "research", "prototype"];
const git = (args) => spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
const repoRoot = git(["rev-parse", "--show-toplevel"]);
const namesIn = (folder) =>
  fs
    .readdirSync(path.join(repoRoot, folder), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name);
const scopes = [...namesIn("apps"), ...namesIn("packages"), "root"];
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const name = process.env.BRANCH ?? git(["rev-parse", "--abbrev-ref", "HEAD"]);

if (!name || name === "HEAD") process.exit(0);
if (name === "main" || name === "master") process.exit(0);

const fail = (message) => {
  console.error(`${message}
Use: <project>/<type>/<kebab-description>
Projects: ${scopes.join(", ")}
Types: ${TYPES.join(", ")}
Example: amelie-engine-api/feat/team-bindings`);
  process.exit(1);
};

const [project, type, description, ...extra] = name.split("/");
if (extra.length || !project || !type || !description) {
  fail(`Invalid branch name: ${name}`);
}
if (!scopes.includes(project)) {
  fail(`Project does not exist: ${project}`);
}
if (!TYPES.includes(type)) {
  fail(`Unknown type: ${type}`);
}
if (!slug.test(description)) {
  fail(`Invalid description: ${description}`);
}
