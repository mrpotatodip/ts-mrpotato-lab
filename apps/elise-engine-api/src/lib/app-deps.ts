import type { Context } from "hono";
import { ScanUsageSchema } from "@repo/contracts/elise";
import { createAuth } from "#/lib/auth";
import { dbConnect, withPool, withTenant } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { linkScanArchiveEffect } from "#/modules/archives/queries";
import { holdCreditEffect, settleCreditEffect } from "#/modules/credit";
import { enqueueEmail } from "#/modules/email";
import { runnerIdentitySvc } from "#/modules/runners/handlers";
import { findConnectedRunnerEffect } from "#/modules/runners/queries";
import { userHasAccountEffect, userHasPowerEffect } from "#/modules/me";
import { tenantScanRepo } from "#/modules/scan-ledger";
import { InternalServiceError } from "#/lib/errors";
import { STRIPE_NOT_CONFIGURED_MESSAGE } from "#/modules/stripe/constants";
import { stripeGateway } from "#/modules/stripe/lib";
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

export const realAppDeps: AppDeps = {
  scanRepo: (_env, db) => tenantScanRepo(db),
  monthSpend: (db, accountId) => monthSpendEffect(db, accountId, monthStartOf(new Date())),
  holdCredit: (db, accountId, scanId, holdUsd) => holdCreditEffect(db, { tenantId: accountId, scanId, holdUsd }),
  connectedRunnerSources: findConnectedRunnerEffect,
  linkArchive: linkScanArchiveEffect,
  releaseCredit: (db, accountId, scanId) => settleCreditEffect(db, { tenantId: accountId, scanId, chargeUsd: 0 }),
  teardownScan: async (env, scanId) => {
    await env.SCAN_WORKFLOW_FULL.get(scanId)
      .then((workflow) => workflow.terminate())
      .catch(() => undefined);
    const sandbox = env.SANDBOX_FULL.getByName(scanId);
    const usage = ScanUsageSchema.nullable().parse(await sandbox.readUsage());
    await sandbox.destroy();
    return usage;
  },
  sessionUserId,
  runnerIdentity: (c, token) => runEffect(runnerIdentitySvc(dbConnect(c.env.DATABASE_URL), token)),
  userHasAccount: (c, userId, accountId) => runEffect(userHasAccountEffect(dbConnect(c.env.DATABASE_URL), userId, accountId)),
  userHasPower: (c, userId, accountId, power) => runEffect(userHasPowerEffect(dbConnect(c.env.DATABASE_URL), userId, accountId, power)),
  enqueueEmail,
  withTenant: (c, accountId, run) => withTenant(c.env.HYPERDRIVE_TENANT.connectionString, (promise) => c.executionCtx.waitUntil(promise), accountId, run),
  withOwner: (c, run) => withPool(c.env.DATABASE_URL, (promise) => c.executionCtx.waitUntil(promise), run),
  stripe: (env) => {
    if (!env.STRIPE_SECRET_KEY) throw new InternalServiceError(STRIPE_NOT_CONFIGURED_MESSAGE);
    return stripeGateway(env.STRIPE_SECRET_KEY);
  },
};
