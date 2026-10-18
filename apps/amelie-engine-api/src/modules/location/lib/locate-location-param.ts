import type { LocationParam } from "@repo/contracts/amelie";
import type { ValidatedContext } from "#/modules/tenant";

// -----
// For `locate` on a route with :locationId in its path.
// -----
export const locateLocationParam = (c: ValidatedContext<{ param: LocationParam }>): string[] => [
  c.req.valid("param").locationId,
];
