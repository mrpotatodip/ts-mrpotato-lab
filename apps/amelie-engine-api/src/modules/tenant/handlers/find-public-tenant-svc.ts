import type { Effect } from "effect";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { findPublicTenantBySlugEffect } from "#/modules/tenant/queries";
import type { PublicTenant } from "#/modules/tenant/types";

export const findPublicTenantSvc = (
  db: DbConnectType,
  slug: string,
): Effect.Effect<PublicTenant, DbError | NotFound> => findPublicTenantBySlugEffect(db, slug);
