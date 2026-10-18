import type { LocationParam } from "@repo/contracts/amelie";
import type { ValidatedContext } from "#/lib/validated-context-types";

export const locateLocationParam = (c: ValidatedContext<{ param: LocationParam }>): string[] => [
  c.req.valid("param").locationId,
];
