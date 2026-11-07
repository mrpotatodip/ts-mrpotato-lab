import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// -----
// Append-only record of every change a
// superuser makes to Master Roles and their
// Powers. subject_id is not a foreign key, so
// the trail outlives a deleted Master Role.
// -----
export const accessAuditLog = pgTable(
  "access_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorPartyId: uuid("actor_party_id"),
    action: text("action").notNull(),
    subjectId: uuid("subject_id").notNull(),
    before: jsonb("before").$type<unknown>(),
    after: jsonb("after").$type<unknown>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idxSubject: index("idx_access_audit_log_subject_id").on(t.subjectId, t.createdAt),
    idxCreatedAt: index("idx_access_audit_log_created_at").on(t.createdAt),
  }),
);

export type TAccessAuditLog = typeof accessAuditLog.$inferSelect;
