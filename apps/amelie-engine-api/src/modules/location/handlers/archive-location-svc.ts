import type { Effect } from "effect";
import type { LocationUnsoldItem } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { Conflict, DbError, NotFound } from "#/lib/effect-query";
import { archiveLocationEffect } from "#/modules/location/queries";

// -----
// A Location is archived, never deleted, and a
// Tenant keeps at least one active Location.
// Answers with the menu items now sold nowhere.
// -----
export const archiveLocationSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
): Effect.Effect<LocationUnsoldItem[], NotFound | Conflict | DbError> =>
  archiveLocationEffect(db, tenantId, locationId, new Date());
