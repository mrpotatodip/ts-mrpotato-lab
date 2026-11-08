#!/usr/bin/env node
// pnpm engine:probe /repos [--local] [--account ID]
// Prints the raw JSON the engine really sends. Use it to learn what is
// deployed instead of inferring it from the dashboard.
import { callEngine, engineUrl, parseArgs } from "./engine-call.mjs";

const { flags, rest } = parseArgs(process.argv.slice(2));
if (!rest[0]) {
  console.error("Usage: pnpm engine:probe /repos [--local] [--account ID]");
  process.exit(1);
}
console.error(`GET ${engineUrl(flags)}${rest[0]}`);
console.log(JSON.stringify(await callEngine(flags, "GET", rest[0]), null, 2));
