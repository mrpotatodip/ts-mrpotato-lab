import { createMiddleware } from "hono/factory";
import type { AppError } from "#/lib/errors";
import type { AppEnv, Bindings } from "#/types/variables";

type LimiterName = "SIGN_UP_LIMITER" | "SIGN_IN_LIMITER" | "TEAM_INVITE_LIMITER" | "RUNNER_ENROLL_LIMITER" | "RUNNER_ENROLL_TOTAL_LIMITER";

// -----
// Before the body is read. No binding (local dev,
// tests): not limited.
// -----
const rateLimitBy = (limiter: LimiterName, keyOf: (ip: string) => string, refusal: () => AppError) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const binding: Bindings[LimiterName] = c.env[limiter];
    if (binding) {
      const { success } = await binding.limit({ key: keyOf(c.req.header("cf-connecting-ip") ?? "local") });
      if (!success) throw refusal();
    }
    await next();
  });

// -----
// Per IP. No IP: one key.
// -----
export const rateLimitByIp = (limiter: LimiterName, refusal: () => AppError) => rateLimitBy(limiter, (ip) => ip, refusal);

// -----
// One count for every caller, so many IP addresses
// share one limit.
// -----
export const rateLimitTotal = (limiter: LimiterName, refusal: () => AppError) => rateLimitBy(limiter, () => "all", refusal);
