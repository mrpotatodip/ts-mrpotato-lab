import type { ValidatedContext } from "#/lib/validated-context-types";

export const locateBodyLocation = (c: ValidatedContext<{ json: { locationId: string | null } }>): string[] => {
  const { locationId } = c.req.valid("json");
  return locationId === null ? [] : [locationId];
};
