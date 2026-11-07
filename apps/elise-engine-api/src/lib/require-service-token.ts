import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { InternalServiceError, UnauthorizedError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";

const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ (b[i] ?? 0);
  return difference === 0;
};

// -----
// True when the request carries the shared
// service token. Throws 500 if the secret is
// not set, so a bad deploy fails loudly.
// -----
export const hasServiceToken = async (c: Context<AppEnv>): Promise<boolean> => {
  const expected = c.env.SCAN_API_TOKEN;
  if (!expected) throw new InternalServiceError("SCAN_API_TOKEN is not set");
  const [given, wanted] = await Promise.all([digest(c.req.header("authorization") ?? ""), digest(`Bearer ${expected}`)]);
  return sameBytes(given, wanted);
};

export const requireServiceToken = createMiddleware<AppEnv>(async (c, next) => {
  if (!(await hasServiceToken(c))) throw new UnauthorizedError();
  await next();
});
