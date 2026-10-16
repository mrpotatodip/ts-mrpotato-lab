import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { AccessScope } from "./access-master-roles";

// -----
// The platform catalogue of Powers: every
// legal Power string, granted to no Role here.
// Twin of ACCESS_POWERS in
// @repo/contracts/amelie. Master Roles are
// granted these in access_role_powers. scope is
// platform for platform: paths, tenant for the
// rest.
// -----
export const accessMasterPowers = pgTable(
  "access_master_powers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    power: text("power").notNull(),
    scope: text("scope").$type<AccessScope>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uqPower: uniqueIndex("uq_access_master_powers_power").on(t.power),
    uqIdScope: uniqueIndex("uq_access_master_powers_id_scope").on(t.id, t.scope),
    chkScope: check(
      "access_master_powers_scope",
      sql`(${t.scope} = 'platform') = (${t.power} like 'platform:%')`,
    ),
  }),
);

export type TAccessMasterPower = typeof accessMasterPowers.$inferSelect;
