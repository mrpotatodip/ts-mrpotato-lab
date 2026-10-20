import { z } from "zod";

export const CoverageSchema = z.union([z.literal("all"), z.array(z.uuid())]);

export type Coverage = z.infer<typeof CoverageSchema>;

export type CoverageGap = { coversNothing: boolean; uncovered: string[] };

export const covers = (coverage: Coverage, locationIds: readonly string[]): boolean =>
  coverage === "all" || locationIds.every((id) => coverage.includes(id));

export const uncoveredLocations = (coverage: Coverage, locationIds: readonly string[]): CoverageGap | null => {
  if (coverage === "all") return null;
  const coversNothing = coverage.length === 0;
  const uncovered = locationIds.filter((id) => !covers(coverage, [id]));
  return coversNothing || uncovered.length > 0 ? { coversNothing, uncovered } : null;
};
