import { sql } from "drizzle-orm";
import { bigint, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { partyPersons } from "./party";
import { tenants } from "./tenant";

// -----
// One row per install of the Elise GitHub App that an
// Account connected. It holds IDs and a status, never a
// token: the Worker makes a short-lived token from the
// App's private key at the moment it needs one. An
// install belongs to one Account, so a second claim of
// the same install_id fails on the unique index. A
// removed install keeps its row (status "removed"), so
// the Scans that used it keep their link.
// -----
export const tenantGithubInstallations = pgTable(
  "tenant_github_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("github"),
    installationId: bigint("installation_id", { mode: "number" }).notNull(),
    accountLogin: text("account_login").notNull(),
    repositorySelection: text("repository_selection").notNull(),
    // Where the install is managed on GitHub: GitHub says it, and a personal account and an organization differ.
    htmlUrl: text("html_url"),
    status: text("status").notNull().default("active"),
    connectedBy: uuid("connected_by")
      .notNull()
      .references(() => partyPersons.partyId, { onDelete: "restrict" }),
    noticeAcceptedAt: timestamp("notice_accepted_at", { withTimezone: true }).notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    chkProvider: check("tenant_github_installations_provider", sql`${t.provider} in ('github')`),
    chkSelection: check("tenant_github_installations_selection", sql`${t.repositorySelection} in ('all', 'selected')`),
    chkStatus: check("tenant_github_installations_status", sql`${t.status} in ('active', 'suspended', 'removed')`),
    uqInstall: uniqueIndex("uq_tenant_github_installations_install").on(t.provider, t.installationId),
    uqIdTenant: uniqueIndex("uq_tenant_github_installations_id_tenant").on(t.id, t.tenantId),
    idxTenant: index("idx_tenant_github_installations_tenant_id").on(t.tenantId),
  }),
);

export type TTenantGithubInstallation = typeof tenantGithubInstallations.$inferSelect;
