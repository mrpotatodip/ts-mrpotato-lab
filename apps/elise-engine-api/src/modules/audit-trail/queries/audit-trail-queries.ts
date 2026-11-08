import { eq } from "drizzle-orm";
import { accessAuditLog, authUser } from "@repo/db-elise";
import type { PoolDbType } from "#/lib/db-connection";
import type { AuditDb, AuditEntry } from "#/modules/audit-trail/types";

// -----
// Append one row to the audit trail. Run it in
// the same transaction as the change, so a
// change is never saved without its record.
// -----
export const insertAuditEntry = (db: AuditDb, entry: AuditEntry): Promise<void> =>
  db
    .insert(accessAuditLog)
    .values({
      actorPartyId: entry.actorPartyId,
      action: entry.action,
      subjectId: entry.subjectId,
      before: entry.before ?? null,
      after: { tenantId: entry.tenantId, ...entry.after },
    })
    .then(() => undefined);

// -----
// The Party behind a login: who the audit row
// names as the actor.
// -----
export const actorPartyOf = (db: Pick<PoolDbType, "select">, userId: string): Promise<string | null> =>
  db
    .select({ partyId: authUser.partyId })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .then(([login]) => login?.partyId ?? null);
