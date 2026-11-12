import type { Context } from "hono";
import { createAuth } from "#/lib/auth";
import { dbConnect, poolConnect, withTenant } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { holdCreditEffect, settleCreditEffect } from "#/modules/credit";
import { githubAccessFor, neonInstallationRepo } from "#/modules/github-installs";
import { userHasAccountEffect, userHasPowerEffect } from "#/modules/me";
import { neonScanRepo } from "#/modules/scan-ledger";
import { monthSpendEffect, monthStartOf } from "#/modules/usage";
import type { AppEnv, AppDeps } from "#/types/variables";

const sessionUserId = async (c: Context<AppEnv>): Promise<string | undefined> => {
  const { auth, close } = createAuth(c);
  try {
    return (await auth.api.getSession({ headers: c.req.raw.headers }))?.user.id;
  } finally {
    close();
  }
};

const noSpend = { spentUsd: 0, scans: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, budgetOverrideUsd: null, budgetAllowanceUsd: null, platformSpentUsd: 0, platformReservedUsd: 0, ownKey: false, plan: null };

export const realAppDeps: AppDeps = {
  scanRepo: (env) => neonScanRepo(dbConnect(env.DATABASE_URL)),
  githubAccess: (env, accountId) => githubAccessFor(env, neonInstallationRepo(dbConnect(env.DATABASE_URL)), accountId),
  monthSpend: (env, accountId) =>
    env.DATABASE_URL ? runEffect(monthSpendEffect(dbConnect(env.DATABASE_URL), accountId, monthStartOf(new Date()))) : Promise.resolve(noSpend),
  holdCredit: async (env, accountId, scanId, holdUsd) => {
    const { db, close } = poolConnect(env.DATABASE_URL);
    try {
      return await runEffect(holdCreditEffect(db, { tenantId: accountId, scanId, holdUsd }));
    } finally {
      await close();
    }
  },
  releaseCredit: async (env, accountId, scanId) => {
    const { db, close } = poolConnect(env.DATABASE_URL);
    try {
      return await runEffect(settleCreditEffect(db, { tenantId: accountId, scanId, chargeUsd: 0 }));
    } finally {
      await close();
    }
  },
  sessionUserId,
  userHasAccount: (c, userId, accountId) => runEffect(userHasAccountEffect(dbConnect(c.env.DATABASE_URL), userId, accountId)),
  userHasPower: (c, userId, accountId, power) => runEffect(userHasPowerEffect(dbConnect(c.env.DATABASE_URL), userId, accountId, power)),
  enqueueInviteEmail: async (env, mail) => {
    await env.INVITE_EMAIL_QUEUE.send(mail, { contentType: "json" });
  },
  enqueuePasswordResetEmail: async (env, mail) => {
    await env.INVITE_EMAIL_QUEUE.send(mail, { contentType: "json" });
  },
  withTenant: (c, accountId, run) => withTenant(c.env.HYPERDRIVE_TENANT.connectionString, (promise) => c.executionCtx.waitUntil(promise), accountId, run),
};
