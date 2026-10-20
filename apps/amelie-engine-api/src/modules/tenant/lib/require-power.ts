import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import {
  hasAccessPower,
  uncoveredLocations,
  type BoundPower,
  type LocationQuery,
  type UnboundPower,
} from "@repo/contracts/amelie";
import { ForbiddenError } from "#/lib/errors";
import type { ValidatedContext, ValidatedInput } from "#/lib/validated-context-types";
import type { AppEnv } from "#/types/variables";
import { TENANT_LOCATION_NOT_COVERED, TENANT_LOCATIONS_NOT_COVERED, TENANT_POWER_DENIED } from "#/modules/tenant/constants";
import type { PowerGuardKind, RouteHandler } from "#/modules/tenant/types";

const GUARDED_POWERS = new WeakMap<RouteHandler, { power: BoundPower | UnboundPower; kind: PowerGuardKind }>();

const holdPower = (c: Context<AppEnv>, power: BoundPower | UnboundPower): void => {
  if (!hasAccessPower(c.get("powers") ?? [], power)) {
    throw new ForbiddenError(TENANT_POWER_DENIED);
  }
};

const powerOnlyGuard = (power: BoundPower | UnboundPower, kind: PowerGuardKind) => {
  const guard = createMiddleware<AppEnv>(async (c, next) => {
    holdPower(c, power);
    await next();
  });
  GUARDED_POWERS.set(guard, { power, kind });
  return guard;
};

export const requirePower = (power: UnboundPower) => powerOnlyGuard(power, "plain");

export const requireBoundPower = <Valid extends ValidatedInput>(
  power: BoundPower,
  locate: (c: ValidatedContext<Valid>) => readonly string[],
) => {
  const guard = createMiddleware<AppEnv, string, { out: Valid }>(async (c, next) => {
    holdPower(c, power);
    const gap = uncoveredLocations(c.get("coverage"), locate(c));
    if (gap?.coversNothing) throw new ForbiddenError(TENANT_LOCATION_NOT_COVERED);
    if (gap) throw new ForbiddenError(TENANT_LOCATIONS_NOT_COVERED(gap.uncovered));
    await next();
  });
  GUARDED_POWERS.set(guard, { power, kind: "bound" });
  return guard;
};

export const requireCountryBoundPower = (power: BoundPower) => powerOnlyGuard(power, "bound");

export const locateQueryLocation = (c: ValidatedContext<{ query: LocationQuery }>): string[] => {
  const { locationId } = c.req.valid("query");
  return locationId === undefined ? [] : [locationId];
};

export const guardedPower = (handler: RouteHandler): BoundPower | UnboundPower | undefined =>
  GUARDED_POWERS.get(handler)?.power;

export const powerGuardKind = (handler: RouteHandler): PowerGuardKind | undefined => GUARDED_POWERS.get(handler)?.kind;
