import type { ValidatedContext } from "#/lib/validated-context-types";

// -----
// For requireBoundPower on a FAQ write: the Location the body
// names. A Country or no scope names none; the service checks
// those, and the FAQ's stored scope, once it has loaded them.
// -----
export const locateBodyLocation = (c: ValidatedContext<{ json: { locationId: string | null } }>): string[] => {
  const { locationId } = c.req.valid("json");
  return locationId === null ? [] : [locationId];
};
