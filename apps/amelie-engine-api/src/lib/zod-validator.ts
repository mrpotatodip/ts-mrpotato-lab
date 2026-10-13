import type { ValidationTargets } from "hono";
import { validator } from "hono-openapi";
import type { z } from "zod";
import { ValidationError } from "#/lib/errors";

type IssuePath = ReadonlyArray<PropertyKey | { key: PropertyKey }> | undefined;

const issuePath = (path: IssuePath): string =>
  (path ?? []).map((segment) => String(segment instanceof Object ? segment.key : segment)).join(".");

// -----
// zValidator that throws ValidationError, so a
// bad input comes back in the envelope (5.3).
// Built on hono-openapi's validator, so each
// param, query, header and body is documented.
// -----
export function zValidator<T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return validator(target, schema, (result) => {
    if (result.success) return;
    const message = result.error
      .map((issue) => `${issuePath(issue.path) || target}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(message);
  });
}
