import { createMiddleware } from "hono/factory";
import { hasAccessPower } from "@repo/contracts/amelie";
import { ForbiddenError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import { TENANT_POWER_DENIED } from "#/modules/tenant/constants";

export const requirePower = (power: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!hasAccessPower(c.get("powers") ?? [], power)) {
      throw new ForbiddenError(TENANT_POWER_DENIED);
    }
    await next();
  });
