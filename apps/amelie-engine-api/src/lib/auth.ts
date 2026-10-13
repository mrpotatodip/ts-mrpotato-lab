import type { Context } from "hono";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
} from "@repo/db-amelie";

import { db_connect, type DbConnectType } from "#/lib/db-connection";
import type { AppEnv } from "#/types/variables";

// -----
// /auth/* is mounted whole, so every built-in
// endpoint the MVP has no flow for is off:
// sign-up, social logins, and account changes
// or emails nothing here can send.
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
  db: DbConnectType;
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
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    // -----
    // Login only: better-auth's own sign-up stays
    // off. New logins come from POST /public/sign-up
    // (#350), stored unverified. Verification is off
    // until email sending ships and sign-up opens up.
    // -----
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: false,
    },
    disabledPaths: AUTH_DISABLED_PATHS,
    secret: config.secret,
    // -----
    // AUTH_BASE_URL must be a clean origin (no path) —
    // better-auth's withPath() treats any path already
    // present in baseURL as the *complete* mount path
    // and silently drops basePath. Modules mount flat
    // at the root (see src/index.ts), so the login
    // routes live under /auth.
    // -----
    baseURL: config.baseUrl,
    basePath: "/auth",
    trustedOrigins: config.trustedOrigins,
    plugins: [bearer()],
    advanced: {
      // -----
      // Behind Cloudflare the caller's IP is in
      // cf-connecting-ip, not x-forwarded-for.
      // -----
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      backgroundTasks: config.waitUntil ? { handler: config.waitUntil } : undefined,
    },
  });

export const createAuth = (c: Context<AppEnv>) =>
  buildAuth({
    // -----
    // HYPERDRIVE_REALTIME (caching disabled):
    // a session signed in moments ago must not
    // read back as a cached "not found".
    // -----
    db: db_connect(c.env.HYPERDRIVE_REALTIME.connectionString),
    secret: c.env.AUTH_SECRET,
    baseUrl: c.env.AUTH_BASE_URL,
    trustedOrigins: c.env.AUTH_TRUSTED_ORIGINS.split(","),
    waitUntil: (promise) => c.executionCtx.waitUntil(promise),
  });
