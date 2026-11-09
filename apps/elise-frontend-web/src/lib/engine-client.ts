import { env } from "cloudflare:workers";
import { z } from "zod";

// -----
// Server-only. The engine has no CORS, so the browser never calls it:
// server functions do, with the session token kept in an httpOnly cookie.
// -----

export class EngineError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "EngineError";
  }
}

// -----
// The engine's own routes answer { data, error: { code, message } };
// Better Auth answers { code, message }.
// -----
const ErrorBodySchema = z.union([
  z.object({ error: z.object({ code: z.string(), message: z.string() }) }).transform((b) => b.error),
  z.object({ code: z.string().optional(), message: z.string() }),
]);

// -----
// What a failed schema parse carries, whichever zod copy threw it.
// -----
const ParseFailureSchema = z.object({ issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })) });

export type EngineAuth = { token?: string; accountId?: string };

export async function engineFetch(path: string, init: RequestInit = {}, auth: EngineAuth = {}) {
  const headers = new Headers(init.headers);
  if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);
  if (auth.accountId) headers.set("x-account-id", auth.accountId);

  const res = await fetch(`${env.ELISE_ENGINE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    console.error(`engine: ${init.method ?? "GET"} ${path} answered ${res.status}`);
    const body = ErrorBodySchema.safeParse(await res.json().catch(() => null));
    throw new EngineError(body.success ? body.data.message : `Engine error ${res.status}`, res.status, body.success ? body.data.code : undefined);
  }
  return res;
}

// -----
// Structural, not z.ZodType: @repo/contracts may resolve a different zod
// copy than this app, and their types do not mix.
// -----
type Parser<T> = Pick<z.ZodType<T>, "parse">;

export async function engineJson<T>(schema: Parser<T>, path: string, init: RequestInit = {}, auth: EngineAuth = {}): Promise<T> {
  const res = await engineFetch(path, init, auth);
  const body = z.object({ data: z.unknown() }).parse(await res.json());
  try {
    return schema.parse(body.data);
  } catch (error) {
    const broken = ParseFailureSchema.safeParse(error);
    if (!broken.success || broken.data.issues.length === 0) throw error;
    const [first] = broken.data.issues;
    const more = broken.data.issues.length > 1 ? ` (and ${broken.data.issues.length - 1} more)` : "";
    console.error(`engine: ${path} broke the contract`, JSON.stringify(broken.data.issues));
    throw new EngineError(`The engine sent an unexpected response for ${path}: ${first?.path.join(".") || "body"} ${first?.message}${more}. The engine may be older than this dashboard.`, 502);
  }
}

export const jsonPost = (body: string): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});
