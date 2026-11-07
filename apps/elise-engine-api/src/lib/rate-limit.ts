import { createMiddleware } from "hono/factory";
import type { AppError } from "#/lib/errors";
import type { AppEnv, Bindings } from "#/types/variables";

type LimiterName = "SIGN_UP_LIMITER" | "SIGN_IN_LIMITER";

// -----
// Per IP, before the body is read. No binding
// (local dev, tests): not limited. No IP: one key.
// -----
export const rateLimitByIp = (limiter: LimiterName, refusal: () => AppError) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const binding: Bindings[LimiterName] = c.env[limiter];
    if (binding) {
      const { success } = await binding.limit({ key: c.req.header("cf-connecting-ip") ?? "local" });
      if (!success) throw refusal();
    }
    await next();
  });
