import { describe, expect, it } from "vitest";
import app from "#/index";

// -----
// Only the bindings these requests reach;
// none of them gets as far as a query.
// -----
const baseEnv = {
  HYPERDRIVE_REALTIME: { connectionString: "postgresql://u:p@127.0.0.1:1/none" },
  AUTH_SECRET: "test-secret-test-secret-test-secret",
  AUTH_BASE_URL: "http://localhost:8788",
  AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
  AUTH_SIGN_IN_LIMITER: { limit: async () => ({ success: true }) },
};
// SAFETY: every request here stops before a
// binding outside baseEnv is read.
const env = baseEnv as never;

const request = (path: string, init?: RequestInit, withEnv: never = env) =>
  app.fetch(new Request(`http://localhost${path}`, init), withEnv);

const preflight = (path: string, origin: string) =>
  request(path, {
    method: "OPTIONS",
    headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
  });

// -----
// public.ts and private.ts both mount at "/":
// private middleware must not reach public paths.
// -----
describe("app routes", () => {
  it("serves /health without a login", async () => {
    const res = await request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { ok: true }, error: null });
  });

  it("lets the widget's routes run without a login", async () => {
    const res = await request("/public/chat-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "sorella", content: "Open?" }),
    });

    expect(res.status).toBe(400);
  });

  it.each([
    "/tenants",
    "/tenants/some-id",
    "/me",
    "/admin",
    "/admin/anything",
    "/admin/invite-codes",
    "/chat-bot/threads?tenantId=00000000-0000-0000-0000-000000000000",
    "/business-profile?tenantId=00000000-0000-0000-0000-000000000000",
    "/schedule?tenantId=00000000-0000-0000-0000-000000000000",
    "/unanswered-questions?tenantId=00000000-0000-0000-0000-000000000000",
  ])(
    "refuses %s without a login",
    async (path) => {
      const res = await request(path);

      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ data: null, error: { code: expect.any(String) } });
    },
  );

  it("answers an unknown route with the envelope 404", async () => {
    const res = await request("/nope");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ data: null, error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  it("mounts better-auth at /auth", async () => {
    const res = await request("/auth/ok");

    expect(res.status).toBe(200);
  });

  // -----
  // Logins are seeded by hand: sign-up and the
  // other MVP-less endpoints are switched off.
  // -----
  it.each(["/auth/sign-up/email", "/auth/request-password-reset", "/auth/update-user", "/auth/delete-user"])(
    "turns off %s",
    async (path) => {
      const res = await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "new@sorella.test", password: "password-1234", name: "New" }),
      });

      expect(res.status).toBe(404);
    },
  );

  it("refuses sign-in past the per-IP limit before checking the password", async () => {
    // SAFETY: the limiter refuses first, so no
    // other binding is read.
    const limited = { ...baseEnv, AUTH_SIGN_IN_LIMITER: { limit: async () => ({ success: false }) } } as never;
    const res = await request(
      "/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.7" },
        body: JSON.stringify({ email: "owner@sorella.test", password: "wrong" }),
      },
      limited,
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ data: null, error: { code: "SIGN_IN_RATE_LIMITED" } });
  });

  it("allows /auth/* only from trusted origins", async () => {
    const trusted = await preflight("/auth/sign-in/email", "http://localhost:3000");
    const untrusted = await preflight("/auth/sign-in/email", "https://evil.example");

    expect(trusted.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(untrusted.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("keeps the widget's routes open to any origin", async () => {
    const res = await preflight("/public/chat-bot", "https://sorellacafe.com");

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
