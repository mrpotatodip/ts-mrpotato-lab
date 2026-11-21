import type { Context } from "hono";
import { Effect } from "effect";
import { runEffect } from "#/lib/effect-query";
import { tenantEffectOf } from "#/lib/tenant-effect";
import { dashboardLinkOf, enqueueEmailsQuietly } from "#/modules/email";
import { noticeAudienceEffect } from "#/modules/usage";
import type { AppEnv } from "#/types/variables";

export const notifyKeyChange = async (c: Context<AppEnv>, accountId: string, userId: string, change: "set" | "removed"): Promise<void> => {
  const deps = c.get("deps");
  const audience = await runEffect(
    tenantEffectOf(c, accountId)((db) => noticeAudienceEffect(db, accountId, userId, "company:usage:anthropic_key:update")).pipe(
      Effect.match({
        onSuccess: (found) => found,
        onFailure: () => {
          console.error("Anthropic key notice audience not read", { change });
          return null;
        },
      }),
    ),
  );
  if (audience === null) return;
  const changedAt = new Date().toISOString();
  const link = dashboardLinkOf(c.env.DASHBOARD_URL, "/settings/budget");
  await enqueueEmailsQuietly(
    (mail) => deps.enqueueEmail(c.env, mail),
    audience.recipients.map((to) => ({ kind: "anthropic-key-changed", to, change, accountName: audience.accountName, actorName: audience.actorName, changedAt, link })),
  );
};
