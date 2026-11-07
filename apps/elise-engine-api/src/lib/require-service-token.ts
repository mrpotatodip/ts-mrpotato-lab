import { createMiddleware } from "hono/factory";
import { InternalServiceError, UnauthorizedError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";

const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ (b[i] ?? 0);
  return difference === 0;
};

export const requireServiceToken = createMiddleware<AppEnv>(async (c, next) => {
  const expected = c.env.SCAN_API_TOKEN;
  if (!expected) throw new InternalServiceError("SCAN_API_TOKEN is not set");
  const [given, wanted] = await Promise.all([digest(c.req.header("authorization") ?? ""), digest(`Bearer ${expected}`)]);
  if (!sameBytes(given, wanted)) throw new UnauthorizedError();
  await next();
});
