import type { Location } from "@repo/contracts/amelie";

// -----
// Which Location a screen edits. With one open
// Location there is nothing to choose and the engine
// uses it, so nothing is picked. With several, the
// pick, or the oldest if it is gone or archived.
// -----
export const chooseLocation = (active: Location[], pickedId: string | null): Location | undefined =>
  active.length > 1 ? (active.find((location) => location.id === pickedId) ?? active[0]) : undefined;
