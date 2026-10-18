import type { Effect } from "effect";
import type { LocationArchivePreview, LocationUnsoldItem } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { Conflict, DbError, NotFound } from "#/lib/effect-query";
import { archiveLocationEffect, archiveLocationPreviewEffect } from "#/modules/location/queries";

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

// -----
// Archiving is never blocked by a Binding, so the
// confirmation names the members it would leave with
// no open Location.
// -----
export const archiveLocationPreviewSvc = (
  db: DbConnectType,
  tenantId: string,
  locationId: string,
): Effect.Effect<LocationArchivePreview, NotFound | DbError> =>
  archiveLocationPreviewEffect(db, tenantId, locationId);
