import type { Context } from "hono";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { sha256Hex } from "@repo/db-elise";
import { authAccount, authSession, authUser, authVerification } from "@repo/db-elise/schema";
import { poolConnect, type PoolDbType } from "#/lib/db-connection";
import type { QueuedEmail } from "#/modules/email";
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
  "/change-email",
  "/change-password",
  "/update-user",
  "/delete-user",
  "/delete-user/callback",
];

export type AuthConfig = {
  db: PoolDbType;
  secret: string;
  baseUrl: string;
  trustedOrigins: string[];
  dashboardUrl: string;
  enqueueEmail: (mail: QueuedEmail) => Promise<void>;
  waitUntil?: (promise: Promise<unknown>) => void;
  resetAddressLimiter?: RateLimit;
};

const RESET_TOKEN_SECONDS = 3600;

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
    // -----
    // The reset link opens the dashboard's page, which
    // posts the token back to /auth/reset-password. A
    // reset signs the account out everywhere.
    // -----
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        if (config.resetAddressLimiter) {
          const key = await sha256Hex(user.email.toLowerCase());
          const { success } = await config.resetAddressLimiter.limit({ key });
          if (!success) return;
        }
        await config.enqueueEmail({
          kind: "password-reset",
          to: user.email,
          link: `${config.dashboardUrl}/reset-password?token=${encodeURIComponent(token)}`,
          expiresAt: new Date(Date.now() + RESET_TOKEN_SECONDS * 1000).toISOString(),
        });
      },
      onPasswordReset: async ({ user }) => {
        await config
          .enqueueEmail({
            kind: "password-reset-done",
            to: user.email,
            changedAt: new Date().toISOString(),
            link: `${config.dashboardUrl}/forgot-password`,
          })
          .catch(() => console.error("password-reset-done enqueue failed"));
      },
    },
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
    dashboardUrl: c.env.DASHBOARD_URL,
    enqueueEmail: (mail) => c.get("deps").enqueueEmail(c.env, mail),
    waitUntil: (promise) => c.executionCtx.waitUntil(promise),
    resetAddressLimiter: c.env.PASSWORD_RESET_ADDRESS_LIMITER,
  });
  return { auth, close: () => c.executionCtx.waitUntil(close()) };
};
