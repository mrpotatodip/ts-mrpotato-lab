import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  FINDING_SEVERITY_VALUES,
  FINDING_STATUS_VALUES,
  FINDING_TRIAGE_STATUS_VALUES,
  SCAN_STATE_VALUES,
  SCAN_STEP_VALUES,
  type FindingSeverityValue,
  type FindingStatusValue,
  type FindingTriageStatusValue,
  type ScanStateValue,
  type ScanStepValue,
} from "@repo/contracts/elise";
import { parties } from "./party";
import { tenants } from "./tenant";

const inList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

// -----
// One row per scan, created when the scan is queued
// and updated at each step. id is the engine's scan ID.
// It holds the state the API reads, and what the agent
// spent (tokens, and its cost estimate). The files stay
// in R2; these rows let the dashboard sort and filter.
// -----
export const scans = pgTable(
  "scans",
  {
    id: text("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    repo: text("repo").notNull(),
    status: text("status").$type<ScanStateValue>().notNull(),
    step: text("step").$type<ScanStepValue>(),
    skill: text("skill").notNull(),
    model: text("model").notNull(),
    effort: text("effort").notNull(),
    profile: text("profile").notNull(),
    budget: integer("budget"),
    maxBudgetUsd: numeric("max_budget_usd", { precision: 10, scale: 2 }).notNull(),
    error: text("error"),
    inputTokens: bigint("input_tokens", { mode: "number" }),
    outputTokens: bigint("output_tokens", { mode: "number" }),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }),
    cacheWriteTokens: bigint("cache_write_tokens", { mode: "number" }),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
    turns: integer("turns"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    chkStatus: check("scans_status", sql`${t.status} in (${inList(SCAN_STATE_VALUES)})`),
    chkStep: check("scans_step", sql`${t.step} is null or ${t.step} in (${inList(SCAN_STEP_VALUES)})`),
    uqIdTenant: unique("uq_scans_id_tenant").on(t.id, t.tenantId),
    idxTenantCreated: index("idx_scans_tenant_created_at").on(t.tenantId, t.createdAt),
  }),
);

// -----
// One row per file a scan saved to R2. r2_key is
// where the bytes are, so every object in the bucket
// can be traced to its scan and account here.
// -----
export const scanFiles = pgTable(
  "scan_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    scanId: text("scan_id").notNull(),
    name: text("name").notNull(),
    r2Key: text("r2_key").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    fkScanTenant: foreignKey({
      name: "scan_files_scan_tenant_fk",
      columns: [t.scanId, t.tenantId],
      foreignColumns: [scans.id, scans.tenantId],
    }).onDelete("cascade"),
    uqScanName: uniqueIndex("uq_scan_files_scan_name").on(t.scanId, t.name),
    uqR2Key: uniqueIndex("uq_scan_files_r2_key").on(t.r2Key),
  }),
);

// -----
// One row per finding of a scan. fingerprint is a
// hash of the class, the file and the title, so the
// same problem keeps its fingerprint in a later scan
// even when its line moves.
// -----
export const scanFindings = pgTable(
  "scan_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    scanId: text("scan_id").notNull(),
    findingId: text("finding_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").$type<FindingStatusValue>().notNull(),
    severity: text("severity").$type<FindingSeverityValue>(),
    title: text("title").notNull(),
    class: text("class").notNull(),
    file: text("file"),
    line: integer("line"),
    actor: text("actor"),
    impact: text("impact"),
    evidence: text("evidence"),
    fix: text("fix"),
    needs: text("needs"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    fkScanTenant: foreignKey({
      name: "scan_findings_scan_tenant_fk",
      columns: [t.scanId, t.tenantId],
      foreignColumns: [scans.id, scans.tenantId],
    }).onDelete("cascade"),
    chkStatus: check("scan_findings_status", sql`${t.status} in (${inList(FINDING_STATUS_VALUES)})`),
    chkSeverity: check(
      "scan_findings_severity",
      sql`(${t.status} = 'confirmed' and ${t.severity} in (${inList(FINDING_SEVERITY_VALUES)}))
        or (${t.status} = 'needs_validation' and ${t.severity} is null)`,
    ),
    uqScanFinding: uniqueIndex("uq_scan_findings_scan_finding").on(t.scanId, t.findingId),
    idxTenantFingerprint: index("idx_scan_findings_tenant_fingerprint").on(t.tenantId, t.fingerprint),
  }),
);

// -----
// What a person decided about a problem, kept per
// repo and fingerprint so a rescan never overwrites
// it. Only the dashboard writes this table.
// -----
export const scanFindingTriage = pgTable(
  "scan_finding_triage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    repo: text("repo").notNull(),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").$type<FindingTriageStatusValue>().notNull(),
    note: text("note"),
    setByPartyId: uuid("set_by_party_id").references(() => parties.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    chkStatus: check("scan_finding_triage_status", sql`${t.status} in (${inList(FINDING_TRIAGE_STATUS_VALUES)})`),
    uqTenantRepoFingerprint: uniqueIndex("uq_scan_finding_triage_tenant_repo_fingerprint").on(
      t.tenantId,
      t.repo,
      t.fingerprint,
    ),
  }),
);

export type TScan = typeof scans.$inferSelect;
export type TScanFile = typeof scanFiles.$inferSelect;
export type TFinding = typeof scanFindings.$inferSelect;
export type TFindingTriage = typeof scanFindingTriage.$inferSelect;
