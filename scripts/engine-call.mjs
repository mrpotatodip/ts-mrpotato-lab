// Shared by engine-probe.mjs and scan-run.mjs: one call to the engine as the
// service token, the deployed Worker by default (scans only run there).
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEPLOYED = "https://api.eliselab.com";

function devVars() {
  try {
    return Object.fromEntries(
      readFileSync(join(root, "apps/elise-engine-api/.dev.vars"), "utf8")
        .split("\n")
        .filter((line) => /^[A-Z_]+=/.test(line))
        .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
    );
  } catch {
    return {};
  }
}

export function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const name = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[name] = true;
      else {
        flags[name] = next;
        i += 1;
      }
    } else rest.push(argv[i]);
  }
  return { flags, rest };
}

export function engineUrl(flags) {
  return flags.local ? "http://localhost:8787" : (process.env.ELISE_ENGINE_URL ?? DEPLOYED);
}

function accountId(flags) {
  const given = flags.account ?? process.env.ELISE_ACCOUNT_ID;
  if (typeof given === "string") return given;
  const out = spawnSync("pnpm", ["-s", "--filter", "@repo/db-elise", "db:query", "select distinct tenant_id from scans"], { cwd: root, encoding: "utf8" });
  const rows = JSON.parse(out.stdout || "[]");
  if (rows.length !== 1) throw new Error("More than one account has scans (or none): pass --account <id> or set ELISE_ACCOUNT_ID.");
  return rows[0].tenant_id;
}

export async function callEngine(flags, method, path, body) {
  const token = process.env.SCAN_API_TOKEN ?? devVars().SCAN_API_TOKEN;
  if (!token) throw new Error("No SCAN_API_TOKEN: set it, or put it in apps/elise-engine-api/.dev.vars.");
  const res = await fetch(`${engineUrl(flags)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "x-account-id": accountId(flags), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (res.status === 401) {
    throw new Error(`${method} ${path} -> 401. The engine at ${engineUrl(flags)} does not accept this SCAN_API_TOKEN. The deployed Worker has its own secret: export SCAN_API_TOKEN=<that value>, or add --local for the engine on port 8787.`);
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json?.error?.message ?? JSON.stringify(json)}`);
  return json?.data ?? json;
}
