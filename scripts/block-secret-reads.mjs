#!/usr/bin/env node
// Claude Code PreToolUse hook for Bash. A command that prints `.dev.vars` or `.env`
// puts live secrets in the transcript, so it is refused (exit 2 sends stderr to the agent).
// Counting or testing is fine (`grep -c`, `-q`, `-l` print no values), and so is `source`.
// The Read tool is covered by the permission deny rules in .claude/settings.json.
import fs from "node:fs";

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const command = input.tool_input?.command ?? "";

const READERS = "cat|sed|awk|head|tail|less|more|bat|strings|xxd|od|cut|tr|sort|uniq|nl|tac|rg|grep|diff|cp|base64";
const SECRET_FILE = String.raw`(?:[\w./~-]*/)?(?:\.dev\.vars|\.env(?:\.local)?)(?![\w.-])`;
const prints = new RegExp(String.raw`\b(?:${READERS})\b[^|;&\n]*\s${SECRET_FILE}`);
const onlyCounts = /\bgrep\s+(?:-[A-Za-z]*[cql][A-Za-z]*)\b/;

if (prints.test(command) && !onlyCounts.test(command)) {
  console.error("This command would print a secret file (.dev.vars or .env). Name the key you need and test it without printing: `grep -c '^KEY=.' <file>`, or `source` the file in a subshell that prints nothing. Never echo its values.");
  process.exit(2);
}
