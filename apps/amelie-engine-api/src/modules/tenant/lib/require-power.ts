import { createMiddleware } from "hono/factory";
import type { RouterRoute } from "hono/types";
import { hasAccessPower, type AccessPower } from "@repo/contracts/amelie";
import { ForbiddenError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { TENANT_POWER_DENIED } from "#/modules/tenant/constants";

type RouteHandler = RouterRoute["handler"];

const GUARDED_POWERS = new WeakMap<RouteHandler, AccessPower>();

export const requirePower = (power: AccessPower) => {
  const guard = createMiddleware<AppEnv>(async (c, next) => {
    if (!hasAccessPower(c.get("powers") ?? [], power)) {
      throw new ForbiddenError(TENANT_POWER_DENIED);
    }
    await next();
  });
  GUARDED_POWERS.set(guard, power);
  return guard;
};

export const guardedPower = (handler: RouteHandler): AccessPower | undefined => GUARDED_POWERS.get(handler);
