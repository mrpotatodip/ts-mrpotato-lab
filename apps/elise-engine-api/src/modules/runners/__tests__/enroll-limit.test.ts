import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { ForbiddenError } from "#/lib/errors";
import { RUNNER_PAIRING_INVALID } from "#/modules/runners/constants";
import { requireEnrollLimit, requireEnrollTotalLimit } from "#/modules/runners/lib";
import type { AppEnv, Bindings } from "#/types/variables";

// -----
// A limiter that allows `limit` calls for each key, like
// the real binding does in one period.
// -----
const countingLimiter = (limit: number): RateLimit => {
  const counts = new Map<string, number>();
  return {
    limit: async ({ key }) => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= limit };
    },
  };
};

// -----
// The route's limits in front of a handler that refuses
// every code, as the real one does for a wrong guess.
// -----
const enrollApp = () => {
  const app = new Hono<AppEnv>();
  app.onError((err, c) => {
    if (err instanceof ForbiddenError) return c.json({ data: null, error: { message: err.message } }, 403);
    throw err;
  });
  app.post("/enroll", requireEnrollLimit, requireEnrollTotalLimit, () => {
    throw new ForbiddenError(RUNNER_PAIRING_INVALID);
  });
  return app;
};

const guessesFromManyAddresses = async (env: Partial<Bindings>, count: number) => {
  const app = enrollApp();
  const answers: { status: number; body: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const res = await app.request("/enroll", { method: "POST", headers: { "cf-connecting-ip": `203.0.113.${i}` } }, env);
    answers.push({ status: res.status, body: await res.text() });
  }
  return answers;
};

describe("the enroll limits", () => {
  it("answer a refused guess from any address like a wrong code", async () => {
    const env = { RUNNER_ENROLL_LIMITER: countingLimiter(5), RUNNER_ENROLL_TOTAL_LIMITER: countingLimiter(30) };
    const answers = await guessesFromManyAddresses(env, 40);
    expect(new Set(answers.map((a) => a.status))).toEqual(new Set([403]));
    expect(new Set(answers.map((a) => a.body)).size).toBe(1);
  });

  it("let the total, not the number of addresses, bound the guesses that reach the code check", async () => {
    const total = countingLimiter(30);
    let checked = 0;
    const counting: RateLimit = {
      limit: async (options) => {
        const result = await total.limit(options);
        if (result.success) checked += 1;
        return result;
      },
    };
    await guessesFromManyAddresses({ RUNNER_ENROLL_LIMITER: countingLimiter(5), RUNNER_ENROLL_TOTAL_LIMITER: counting }, 100);
    expect(checked).toBe(30);
  });
});
