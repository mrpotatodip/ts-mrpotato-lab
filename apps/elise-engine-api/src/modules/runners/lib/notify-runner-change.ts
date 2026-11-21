import type { Context } from "hono";
import { Effect } from "effect";
import type { AccessPower } from "@repo/contracts/elise";
import { runEffect } from "#/lib/effect-query";
import { tenantEffectOf } from "#/lib/tenant-effect";
import { dashboardLinkOf, enqueueEmailsQuietly } from "#/modules/email";
import { listLoginsWithPowerEffect } from "#/modules/me/queries";
import { RUNNER_NOTICE_PATH } from "#/modules/runners/constants";
import type { AppEnv } from "#/types/variables";

type RunnerChange = { kind: "runner-added" | "runner-removed"; power: AccessPower; accountId: string; runnerId: string; actorUserId: string };

export const notifyRunnerChange = async (c: Context<AppEnv>, change: RunnerChange): Promise<void> => {
  const recipients = await runEffect(
    tenantEffectOf(c, change.accountId)((db) => listLoginsWithPowerEffect(db, change.accountId, change.power)).pipe(
      Effect.match({
        onSuccess: (logins) => logins.map((login) => login.email),
        onFailure: () => {
          console.error("Runner notice recipients not read", { kind: change.kind });
          return [];
        },
      }),
    ),
  );
  const at = new Date().toISOString();
  const link = dashboardLinkOf(c.env.DASHBOARD_URL, RUNNER_NOTICE_PATH);
  const deps = c.get("deps");
  await enqueueEmailsQuietly(
    (mail) => deps.enqueueEmail(c.env, mail),
    recipients.map((to) => ({ kind: change.kind, to, accountId: change.accountId, runnerId: change.runnerId, actorUserId: change.actorUserId, at, link })),
  );
};
