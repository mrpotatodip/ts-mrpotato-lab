import { foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { accessMasterPowers } from "./access-master-powers";
import { accessMasterRoles, type AccessScope } from "./access-master-roles";

// -----
// One Master Power granted to one Master Role.
// A Role gets its Powers from the row set of
// the Master Role it names. Twin of
// ACCESS_ROLE_GRANTS in @repo/contracts/amelie.
// scope is copied from both sides, so a tenant
// Master Role can never hold a platform Power.
// Flat: a parent path does not grant children.
// -----
export const accessRolePowers = pgTable(
  "access_role_powers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    masterRoleId: uuid("master_role_id").notNull(),
    masterPowerId: uuid("master_power_id").notNull(),
    scope: text("scope").$type<AccessScope>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    fkMasterRole: foreignKey({
      name: "access_role_powers_master_role_fk",
      columns: [t.masterRoleId, t.scope],
      foreignColumns: [accessMasterRoles.id, accessMasterRoles.scope],
    }).onDelete("cascade"),
    fkMasterPower: foreignKey({
      name: "access_role_powers_master_power_fk",
      columns: [t.masterPowerId, t.scope],
      foreignColumns: [accessMasterPowers.id, accessMasterPowers.scope],
    }).onDelete("restrict"),
    uqRolePower: uniqueIndex("uq_access_role_powers_master_role_power").on(t.masterRoleId, t.masterPowerId),
    idxMasterRole: index("idx_access_role_powers_master_role_id").on(t.masterRoleId),
  }),
);

export type TAccessRolePower = typeof accessRolePowers.$inferSelect;
