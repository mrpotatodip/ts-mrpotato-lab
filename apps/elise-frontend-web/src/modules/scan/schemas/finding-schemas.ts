import { z } from "zod";

export const SEVERITIES = ["critical", "high", "medium", "low", "informational"] as const;

const SeveritySchema = z.enum(SEVERITIES);

const PlaceSchema = z.object({ file: z.string(), line: z.number() });

// -----
// The lite skill writes a flat finding, the full skill a nested one
// (see apps/elise-engine-api/skills/*/). Both reduce to this shape.
// -----
const LiteFindingSchema = z
  .object({
    status: z.enum(["confirmed", "needs_validation"]),
    severity: SeveritySchema.nullable().catch(null),
    title: z.string(),
    location: z.array(PlaceSchema).default([]),
  })
  .transform((f) => ({ title: f.title, state: f.status, severity: f.severity, place: f.location[0] ?? null }));

const FullFindingSchema = z
  .object({
    verdict: z.enum(["confirmed", "needs_validation", "rejected"]),
    title: z.string(),
    severity: z.object({ overall_severity: SeveritySchema }).optional(),
    evidence: z.array(PlaceSchema).default([]),
  })
  .transform((f) => ({
    title: f.title,
    state: f.verdict,
    severity: f.severity?.overall_severity ?? null,
    place: f.evidence[0] ?? null,
  }));

const FindingSchema = z.union([LiteFindingSchema, FullFindingSchema]);

// -----
// One malformed item must not hide the rest, so each is parsed alone.
// -----
export const FindingsFileSchema = z.array(z.unknown()).transform((items) =>
  items.flatMap((item) => {
    const parsed = FindingSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  }),
);

export type Severity = (typeof SEVERITIES)[number];
export type Finding = z.output<typeof FindingSchema>;

export const OverviewSchema = z.object({
  total: z.number(),
  hasMore: z.boolean(),
  byState: z.object({ queued: z.number(), running: z.number(), succeeded: z.number(), failed: z.number() }),
  severity: z.object({ critical: z.number(), high: z.number(), medium: z.number(), low: z.number(), informational: z.number() }),
  needsValidation: z.number(),
  scannedForFindings: z.number(),
});

export type Overview = z.infer<typeof OverviewSchema>;
