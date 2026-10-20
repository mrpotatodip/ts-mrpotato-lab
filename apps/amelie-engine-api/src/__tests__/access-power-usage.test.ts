import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ACCESS_POWERS, ACCESS_POWER_USAGE, isAccessPower, isBoundPower, type AccessPowerUsage } from "@repo/contracts/amelie";
import privateRoutes from "#/private";
import { TENANT_SERVICE_POWER_ROUTES } from "#/modules/tenant/constants";
import { guardedPower, powerGuardKind } from "#/modules/tenant";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const USAGE_FILE = fileURLToPath(
  new URL("../../../../packages/contracts/src/amelie/access/usage.ts", import.meta.url),
);

const powersIn = (source: string): string[] => ACCESS_POWERS.filter((power) => source.includes(`"${power}"`));

const guardedRoutes = (): Map<string, string[]> => {
  const byPower = new Map<string, string[]>();
  for (const route of privateRoutes.routes) {
    const power = guardedPower(route.handler);
    if (power === undefined) continue;
    const entry = `${route.method} ${route.path}`;
    const known = byPower.get(power) ?? [];
    if (!known.includes(entry)) byPower.set(power, [...known, entry]);
  }
  return byPower;
};

const guardMismatches = (): string[] =>
  privateRoutes.routes.flatMap((route) => {
    const power = guardedPower(route.handler);
    if (power === undefined) return [];
    const expected = isBoundPower(power) ? "bound" : "plain";
    const actual = powerGuardKind(route.handler);
    return actual === expected ? [] : [`${route.method} ${route.path} guards ${power} with a ${actual} guard`];
  });

const guardKinds = (): Map<string, "plain" | "bound"> => {
  const kinds = new Map<string, "plain" | "bound">();
  for (const route of privateRoutes.routes) {
    const power = guardedPower(route.handler);
    const kind = powerGuardKind(route.handler);
    if (power !== undefined && kind !== undefined) kinds.set(power, kind);
  }
  return kinds;
};

const TOOLS_DIR = `${SRC}modules/chat-bot/agent-tools/admin`;

const guardedTools = (): Map<string, string[]> => {
  const byPower = new Map<string, string[]>();
  for (const dir of readdirSync(TOOLS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const name = /name:\s*"([^"]+)"/.exec(readFileSync(`${TOOLS_DIR}/${dir.name}/definition.ts`, "utf8"))?.[1];
    if (!name) throw new Error(`${dir.name} has no tool name`);
    for (const power of powersIn(readFileSync(`${TOOLS_DIR}/${dir.name}/function.ts`, "utf8"))) {
      byPower.set(power, [...(byPower.get(power) ?? []), name]);
    }
  }
  return byPower;
};

const tenantHandlerPowers = (): string[] => {
  const dir = `${SRC}modules/tenant/handlers`;
  return readdirSync(dir)
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => powersIn(readFileSync(`${dir}/${file}`, "utf8")))
    .toSorted();
};

const buildUsage = (): Record<string, AccessPowerUsage> => {
  const routes = guardedRoutes();
  for (const [power, route] of Object.entries(TENANT_SERVICE_POWER_ROUTES)) {
    routes.set(power, [...(routes.get(power) ?? []), route]);
  }
  const tools = guardedTools();
  const kinds = guardKinds();
  return Object.fromEntries(
    ACCESS_POWERS.filter((power) => routes.has(power) || tools.has(power)).map((power) => [
      power,
      {
        guard: kinds.get(power) ?? (routes.has(power) ? "plain" : null),
        routes: (routes.get(power) ?? []).toSorted(),
        tools: (tools.get(power) ?? []).toSorted(),
      },
    ]),
  );
};

const list = (items: readonly string[]): string => `[${items.map((item) => JSON.stringify(item)).join(", ")}]`;

const renderUsage = (usage: Record<string, AccessPowerUsage>): string => {
  const entries = Object.entries(usage)
    .map(([power, entry]) => `  ${JSON.stringify(power)}: { guard: ${JSON.stringify(entry.guard)}, routes: ${list(entry.routes)}, tools: ${list(entry.tools)} },`)
    .join("\n");
  return `import type { AccessPower } from "./catalogue";

export type AccessPowerUsage = {
  guard: "plain" | "bound" | null;
  routes: readonly string[];
  tools: readonly string[];
};

// -----
// Where each Power is checked: the API routes and the
// here is not checked anywhere yet. Generated: run the
// engine tests with UPDATE_POWER_USAGE=1 to rewrite it.
// -----
export const ACCESS_POWER_USAGE: Readonly<Partial<Record<AccessPower, AccessPowerUsage>>> = {
${entries}
};
`;
};

describe("ACCESS_POWER_USAGE", () => {
  it("lists every place a Power is checked", () => {
    const usage = buildUsage();
    if (process.env.UPDATE_POWER_USAGE === "1") writeFileSync(USAGE_FILE, renderUsage(usage));

    expect(ACCESS_POWER_USAGE).toEqual(usage);
  });

  it("guards each route with the guard its Power calls for", () => {
    expect(guardMismatches()).toEqual([]);
  });

  it("records a route guard that matches each Power", () => {
    const wrong = Object.entries(ACCESS_POWER_USAGE).filter(
      ([power, entry]) =>
        isAccessPower(power) && entry.routes.length > 0 && (entry.guard === "bound") !== isBoundPower(power),
    );

    expect(wrong).toEqual([]);
  });

  it("only names Powers the catalogue has", () => {
    const known = new Set<string>(ACCESS_POWERS);

    expect(Object.keys(ACCESS_POWER_USAGE).filter((power) => !known.has(power))).toEqual([]);
  });

  it("declares exactly the Powers the tenant handlers check themselves", () => {
    expect(tenantHandlerPowers()).toEqual(Object.keys(TENANT_SERVICE_POWER_ROUTES).toSorted());
  });

  it("points each of those Powers at a route that exists", () => {
    const real = new Set(privateRoutes.routes.map((route) => `${route.method} ${route.path}`));

    expect(Object.values(TENANT_SERVICE_POWER_ROUTES).filter((route) => !real.has(route))).toEqual([]);
  });
});
