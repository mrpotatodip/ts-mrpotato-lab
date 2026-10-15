import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { findPublicTenantSvc } from "#/modules/tenant";
import type { PublicChatAppearance } from "@repo/contracts/amelie";

export const getPublicChatAppearanceSvc = (
  db: DbConnectType,
  slug: string,
): Effect.Effect<PublicChatAppearance, DbError | NotFound> =>
  findPublicTenantSvc(db, slug).pipe(
    Effect.map((tenant) => ({
      customerChatLabel: tenant.customerChatLabel,
      customerChatAccent: tenant.customerChatAccent,
    })),
  );
