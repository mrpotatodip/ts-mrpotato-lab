import { z } from "zod";

// -----
// Which open Locations a team member may work in:
// "all" (no bindings, or the tenant admin), or the ids
// of the open Locations their bindings cover, with
// Countries already expanded. An empty list covers
// nothing (every binding is archived).
// -----
export const CoverageSchema = z.union([z.literal("all"), z.array(z.uuid())]);

export type Coverage = z.infer<typeof CoverageSchema>;

// -----
// True when every named Location is covered.
// -----
export const covers = (coverage: Coverage, locationIds: readonly string[]): boolean =>
  coverage === "all" || locationIds.every((id) => coverage.includes(id));
