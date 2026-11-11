import type { AccessPower } from "@repo/contracts/elise";

// -----
// The pages under Settings, in the order the sidebar lists them, each
// with the Power its route asks for. The sidebar shows only the pages
// the reader may open, so no link leads to a redirect.
// -----
export const SETTINGS_PAGES = [
  { to: "/settings/budget", label: "Budget", power: "company:usage:budget:update" },
  { to: "/settings/plan", label: "Plan", power: "company:plan:read" },
  { to: "/settings/providers", label: "Providers", power: "company:usage:anthropic_key:update" },
  { to: "/settings/history", label: "History", power: "company:usage:budget:update" },
] as const satisfies readonly { to: string; label: string; power: AccessPower }[];
