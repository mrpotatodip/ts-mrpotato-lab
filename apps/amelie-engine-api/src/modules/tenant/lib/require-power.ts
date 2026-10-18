import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { RouterRoute } from "hono/types";
import { covers, hasAccessPower, type BoundPower, type LocationQuery, type UnboundPower } from "@repo/contracts/amelie";
import { ForbiddenError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { TENANT_LOCATION_NOT_COVERED, TENANT_LOCATIONS_NOT_COVERED, TENANT_POWER_DENIED } from "#/modules/tenant/constants";

type RouteHandler = RouterRoute["handler"];

// -----
// What `locate` sees: the context after the validators, so
// c.req.valid("query" | "param" | "json") is typed. Annotate
// the parameter with the shapes the route validates, e.g.
// (c: ValidatedContext<{ query: LocationQuery }>) => ...
// -----
export type ValidatedInput = { query?: object; param?: object; json?: object };
export type ValidatedContext<Valid extends ValidatedInput> = Context<AppEnv, string, { out: Valid }>;

export type PowerGuardKind = "plain" | "bound";

const GUARDED_POWERS = new WeakMap<RouteHandler, { power: BoundPower | UnboundPower; kind: PowerGuardKind }>();

// -----
// For Powers no binding limits. A bound Power does not
// compile here: use requireBoundPower.
// -----
export const requirePower = (power: UnboundPower) => {
  const guard = createMiddleware<AppEnv>(async (c, next) => {
    if (!hasAccessPower(c.get("powers") ?? [], power)) {
      throw new ForbiddenError(TENANT_POWER_DENIED);
    }
    await next();
  });
  GUARDED_POWERS.set(guard, { power, kind: "plain" });
  return guard;
};

// -----
// For Powers a binding limits. Place it after the validators:
// `locate` returns the Location ids the request names (query,
// path or body), [] when it names none. The member needs the
// Power and must cover every named Location, or the answer is
// 403 before anything runs. A request naming none passes; the
// route then resolves the default over c.get("coverage"). A
// member who covers nothing is refused outright.
// -----
export const requireBoundPower = <Valid extends ValidatedInput>(
  power: BoundPower,
  locate: (c: ValidatedContext<Valid>) => readonly string[],
) => {
  const guard = createMiddleware<AppEnv, string, { out: Valid }>(async (c, next) => {
    if (!hasAccessPower(c.get("powers") ?? [], power)) {
      throw new ForbiddenError(TENANT_POWER_DENIED);
    }
    const coverage = c.get("coverage");
    const requested = locate(c);
    if (Array.isArray(coverage) && coverage.length === 0) {
      throw new ForbiddenError(TENANT_LOCATION_NOT_COVERED);
    }
    const uncovered = requested.filter((id) => !covers(coverage, [id]));
    if (uncovered.length > 0) {
      throw new ForbiddenError(
        requested.length === 1 ? TENANT_LOCATION_NOT_COVERED : TENANT_LOCATIONS_NOT_COVERED(uncovered),
      );
    }
    await next();
  });
  GUARDED_POWERS.set(guard, { power, kind: "bound" });
  return guard;
};

// -----
// For `locate` on a route whose query is LocationQuerySchema:
// the optional ?locationId as the ids named.
// -----
export const locateQueryLocation = (c: ValidatedContext<{ query: LocationQuery }>): string[] => {
  const { locationId } = c.req.valid("query");
  return locationId === undefined ? [] : [locationId];
};

export const guardedPower = (handler: RouteHandler): BoundPower | UnboundPower | undefined =>
  GUARDED_POWERS.get(handler)?.power;

export const powerGuardKind = (handler: RouteHandler): PowerGuardKind | undefined => GUARDED_POWERS.get(handler)?.kind;
