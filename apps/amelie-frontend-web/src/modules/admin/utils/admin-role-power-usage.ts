import { ACCESS_POWER_USAGE, isAccessPower, type AccessPower, type AccessPowerUsage } from "@repo/contracts/amelie";
import type { AdminPowerOption } from "../types";

export type AdminPowerUsageLine = {
  power: string;
  action: string;
  routes: readonly string[];
  tools: readonly string[];
  note: string | null;
};

const NOT_CHECKED = "Not checked anywhere yet.";
const PLATFORM_CHECK = "Guarded by the superuser check, not by this power.";

// -----
// For each Action of one catalogue leaf: the routes and
// Assistant tools that refuse without it, or a note saying
// nothing does (yet).
// -----
export function adminPowerUsageLines(
  options: readonly AdminPowerOption[],
  usage: Readonly<Partial<Record<AccessPower, AccessPowerUsage>>> = ACCESS_POWER_USAGE,
): AdminPowerUsageLine[] {
  return options.map(({ power, action }) => {
    const found = isAccessPower(power) ? usage[power] : undefined;
    if (found) return { power, action, routes: found.routes, tools: found.tools, note: null };
    return { power, action, routes: [], tools: [], note: power.startsWith("platform:") ? PLATFORM_CHECK : NOT_CHECKED };
  });
}
