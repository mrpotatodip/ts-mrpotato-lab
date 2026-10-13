import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

type ImportFile = { key: string; name: string; contentType: string; size: number };

// -----
// One upload of a menu (a PDF or images). The files
// sit in R2 under imports/<tenant_id>/<import_id>/.
// The assistant never reads imports or drafts.
// -----
export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("running"),
    error: text("error"),
    files: jsonb("files").$type<ImportFile[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => ({
    uqIdTenant: unique("uq_imports_id_tenant").on(t.id, t.tenantId),
    idxTenantCreated: index("idx_imports_tenant_created").on(t.tenantId, t.createdAt),
    statusKnown: check("imports_status_known", sql`${t.status} IN ('running', 'ready', 'failed')`),
  }),
);

// -----
// One extracted record, to review before it goes
// live. data is checked by one schema per kind.
// -----
export const importDrafts = pgTable(
  "import_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    importId: uuid("import_id").notNull(),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull(),
    sourceFile: text("source_file").notNull(),
    reviewNote: text("review_note"),
    status: text("status").notNull().default("pending"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    importInTenant: foreignKey({
      name: "import_drafts_import_in_tenant_fk",
      columns: [t.importId, t.tenantId],
      foreignColumns: [imports.id, imports.tenantId],
    }).onDelete("cascade"),
    idxImport: index("idx_import_drafts_import").on(t.importId, t.sortOrder),
    kindKnown: check(
      "import_drafts_kind_known",
      sql`${t.kind} IN ('menu_category', 'menu_item', 'business_hours', 'business_profile')`,
    ),
    statusKnown: check("import_drafts_status_known", sql`${t.status} IN ('pending', 'approved', 'discarded')`),
  }),
);

export type TImport = typeof imports.$inferSelect;
export type TImportDraft = typeof importDrafts.$inferSelect;
