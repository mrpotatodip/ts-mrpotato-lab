import { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { findPublicTenantSvc } from "#/modules/tenant";
import type { PublicChatFramePolicy } from "@repo/contracts/amelie";

export const getPublicChatFramePolicySvc = (
  db: DbConnectType,
  slug: string,
): Effect.Effect<PublicChatFramePolicy, DbError | NotFound> =>
  findPublicTenantSvc(db, slug).pipe(Effect.map((tenant) => ({ allowedOrigins: tenant.allowedOrigins })));
