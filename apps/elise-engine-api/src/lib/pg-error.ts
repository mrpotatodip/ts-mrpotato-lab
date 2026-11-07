import { z } from "zod";

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

const PG_ERROR_MAX_CAUSE_DEPTH = 5;

type PgErrorChain = { code?: string; constraint?: string; cause?: PgErrorChain };

const PgErrorChainSchema: z.ZodType<PgErrorChain> = z.lazy(() =>
  z.object({
    code: z.string().optional().catch(undefined),
    constraint: z.string().optional().catch(undefined),
    cause: PgErrorChainSchema.optional().catch(undefined),
  }),
);

// -----
// The same walk for the violated constraint,
// e.g. "uq_tenants_slug".
// -----
export function pgErrorConstraint(cause: unknown): string | undefined {
  let current = PgErrorChainSchema.safeParse(cause).data;
  for (let depth = 0; depth < PG_ERROR_MAX_CAUSE_DEPTH && current; depth++) {
    if (current.constraint) return current.constraint;
    current = current.cause;
  }
  return undefined;
}

// -----
// Drivers nest the pg error under cause; walk
// the chain for its SQLSTATE, e.g. "23505".
// -----
export function pgErrorCode(cause: unknown): string | undefined {
  let current = PgErrorChainSchema.safeParse(cause).data;
  for (let depth = 0; depth < PG_ERROR_MAX_CAUSE_DEPTH && current; depth++) {
    if (current.code) return current.code;
    current = current.cause;
  }
  return undefined;
}
