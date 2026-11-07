import type { Context } from "hono";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { authAccount, authSession, authUser, authVerification } from "@repo/db-elise/schema";
import { poolConnect, type PoolDbType } from "#/lib/db-connection";
import type { AppEnv } from "#/types/variables";

// -----
// /auth/* is mounted whole, so every built-in
// endpoint with no flow here is off: sign-up
// (POST /sign-up does it), social logins, and
// account changes or emails nothing can send.
// -----
export const AUTH_DISABLED_PATHS = [
  "/sign-up/email",
  "/sign-in/social",
  "/link-social",
  "/unlink-account",
  "/list-accounts",
  "/account-info",
  "/get-access-token",
  "/refresh-token",
  "/send-verification-email",
  "/verify-email",
  "/request-password-reset",
  "/reset-password",
  "/change-email",
  "/update-user",
  "/delete-user",
  "/delete-user/callback",
];

export type AuthConfig = {
  db: PoolDbType;
  secret: string;
  baseUrl: string;
  trustedOrigins: string[];
  waitUntil?: (promise: Promise<unknown>) => void;
};

// -----
// Takes plain values, not a Context, so a test
// can sign in against an in-memory database.
// -----
export const buildAuth = (config: AuthConfig) =>
  betterAuth({
    database: drizzleAdapter(config.db, {
      provider: "pg",
      usePlural: false,
      schema: { user: authUser, session: authSession, account: authAccount, verification: authVerification },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, requireEmailVerification: false },
    disabledPaths: AUTH_DISABLED_PATHS,
    secret: config.secret,
    // -----
    // AUTH_BASE_URL must be a clean origin (no path):
    // better-auth treats any path in baseURL as the
    // whole mount path and drops basePath.
    // -----
    baseURL: config.baseUrl,
    basePath: "/auth",
    trustedOrigins: config.trustedOrigins,
    plugins: [bearer()],
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      backgroundTasks: config.waitUntil ? { handler: config.waitUntil } : undefined,
    },
  });

// -----
// A pool per request. The caller runs close()
// once it has the answer, through waitUntil, so
// the socket does not outlive the request.
// -----
export const createAuth = (c: Context<AppEnv>) => {
  const { db, close } = poolConnect(c.env.DATABASE_URL);
  const auth = buildAuth({
    db,
    secret: c.env.AUTH_SECRET,
    baseUrl: c.env.AUTH_BASE_URL,
    trustedOrigins: c.env.AUTH_TRUSTED_ORIGINS.split(","),
    waitUntil: (promise) => c.executionCtx.waitUntil(promise),
  });
  return { auth, close: () => c.executionCtx.waitUntil(close()) };
};
