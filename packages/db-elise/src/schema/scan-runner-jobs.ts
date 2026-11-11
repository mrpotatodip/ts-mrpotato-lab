import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { RUNNER_JOB_STATE_VALUES, type RunnerJobStateValue } from "@repo/contracts/elise";
import { scans } from "./scans";
import { tenantRunners } from "./tenant-runners";
import { tenants } from "./tenant";

const inList = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

// -----
// The work a Scan hands to a Runner. The Workflow writes the row
// (queued) with everything the Runner needs: the repo, the ref, the
// prompt and the earlier findings. The Runner claims it with one
// UPDATE (claimed), runs the agent on its own computer, and reports
// back (succeeded or failed) with the files it wrote and the agent's
// own usage report. The *_json columns hold JSON text that the
// engine parses with a schema. cancelled means the Scan ended before
// the Runner reported, so a late report is refused.
// -----
export const scanRunnerJobs = pgTable(
  "scan_runner_jobs",
  {
    scanId: text("scan_id")
      .primaryKey()
      .references(() => scans.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    runnerId: uuid("runner_id")
      .notNull()
      .references(() => tenantRunners.id, { onDelete: "cascade" }),
    state: text("state").$type<RunnerJobStateValue>().notNull().default("queued"),
    repoUrl: text("repo_url").notNull(),
    ref: text("ref"),
    prompt: text("prompt").notNull(),
    optionsJson: text("options_json").notNull(),
    priorsJson: text("priors_json").notNull(),
    commitSha: text("commit_sha"),
    branch: text("branch"),
    error: text("error"),
    usageJson: text("usage_json"),
    filesJson: text("files_json"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    chkState: check("scan_runner_jobs_state", sql`${t.state} in (${inList(RUNNER_JOB_STATE_VALUES)})`),
    idxRunnerState: index("idx_scan_runner_jobs_runner_state").on(t.runnerId, t.state),
  }),
);

export type TScanRunnerJob = typeof scanRunnerJobs.$inferSelect;
