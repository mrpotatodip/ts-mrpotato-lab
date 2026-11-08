CREATE TABLE "scan_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"canonical" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_repo_findings" (
	"repo_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"state" text NOT NULL,
	"unchecked" boolean DEFAULT false NOT NULL,
	"first_seen_scan_id" text NOT NULL,
	"last_seen_scan_id" text NOT NULL,
	"fixed_in_scan_id" text,
	"possible_duplicate_of" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scan_repo_findings_pkey" PRIMARY KEY("repo_id","fingerprint"),
	CONSTRAINT "scan_repo_findings_state" CHECK ("scan_repo_findings"."state" in ('open', 'fixed_by_code', 'regressed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scan_repos_tenant_canonical" ON "scan_repos" USING btree ("tenant_id","canonical");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scan_repos_id_tenant" ON "scan_repos" USING btree ("id","tenant_id");--> statement-breakpoint
ALTER TABLE "scan_repos" ADD CONSTRAINT "scan_repos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_repo_findings" ADD CONSTRAINT "scan_repo_findings_repo_tenant_fk" FOREIGN KEY ("repo_id","tenant_id") REFERENCES "public"."scan_repos"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scan_repo_findings_repo_state" ON "scan_repo_findings" USING btree ("repo_id","state");--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "repo_id" uuid;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "commit_sha" text;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "ref" text;--> statement-breakpoint
ALTER TABLE "scan_finding_triage" ADD COLUMN "repo_id" uuid;--> statement-breakpoint
ALTER TABLE "scan_findings" ADD COLUMN "origin" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_origin" CHECK ("scan_findings"."origin" in ('new', 'carried'));--> statement-breakpoint
-- Backfill. canonical is owner/name in lowercase without .git or a trailing slash: the same rule as canonicalRepo() in the engine.
INSERT INTO "scan_repos" ("tenant_id", "canonical", "url")
SELECT DISTINCT ON ("tenant_id", "canonical") "tenant_id", "canonical", "url"
FROM (
	SELECT "tenant_id", "created_at",
		lower(regexp_replace(regexp_replace("repo", '^https://github\.com/', ''), '(\.git)?/?$', '')) AS "canonical",
		regexp_replace("repo", '(\.git)?/?$', '') AS "url"
	FROM "scans"
) AS "spellings"
ORDER BY "tenant_id", "canonical", "created_at";--> statement-breakpoint
UPDATE "scans" SET "repo_id" = "scan_repos"."id" FROM "scan_repos"
WHERE "scan_repos"."tenant_id" = "scans"."tenant_id"
	AND "scan_repos"."canonical" = lower(regexp_replace(regexp_replace("scans"."repo", '^https://github\.com/', ''), '(\.git)?/?$', ''));--> statement-breakpoint
UPDATE "scan_finding_triage" SET "repo_id" = "scan_repos"."id" FROM "scan_repos"
WHERE "scan_repos"."tenant_id" = "scan_finding_triage"."tenant_id"
	AND "scan_repos"."canonical" = lower(regexp_replace(regexp_replace("scan_finding_triage"."repo", '^https://github\.com/', ''), '(\.git)?/?$', ''));--> statement-breakpoint
DELETE FROM "scan_finding_triage" WHERE "repo_id" IS NULL;--> statement-breakpoint
-- One active scan per repo: older active scans of the same repo are failed, so the unique index below can be built.
UPDATE "scans" SET "status" = 'failed', "step" = NULL, "finished_at" = now(), "error" = 'superseded by a newer scan of the same repo'
WHERE "status" IN ('queued', 'running')
	AND EXISTS (
		SELECT 1 FROM "scans" AS "newer"
		WHERE "newer"."repo_id" = "scans"."repo_id" AND "newer"."status" IN ('queued', 'running')
			AND ("newer"."created_at", "newer"."id") > ("scans"."created_at", "scans"."id")
	);--> statement-breakpoint
-- Seed the history from each repo's newest succeeded lite scan (the only skill whose findings are recorded).
INSERT INTO "scan_repo_findings" ("repo_id", "tenant_id", "fingerprint", "state", "first_seen_scan_id", "last_seen_scan_id")
SELECT DISTINCT ON ("s"."repo_id", "f"."fingerprint") "s"."repo_id", "s"."tenant_id", "f"."fingerprint", 'open', "s"."id", "s"."id"
FROM "scans" AS "s"
INNER JOIN "scan_findings" AS "f" ON "f"."scan_id" = "s"."id" AND "f"."tenant_id" = "s"."tenant_id"
WHERE "s"."id" = (
	SELECT "x"."id" FROM "scans" AS "x"
	WHERE "x"."repo_id" = "s"."repo_id" AND "x"."status" = 'succeeded' AND "x"."skill" = 'lite'
	ORDER BY "x"."created_at" DESC, "x"."id" DESC LIMIT 1
)
ORDER BY "s"."repo_id", "f"."fingerprint", "f"."finding_id";--> statement-breakpoint
ALTER TABLE "scans" ALTER COLUMN "repo_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_finding_triage" ALTER COLUMN "repo_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_repo_tenant_fk" FOREIGN KEY ("repo_id","tenant_id") REFERENCES "public"."scan_repos"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_finding_triage" ADD CONSTRAINT "scan_finding_triage_repo_tenant_fk" FOREIGN KEY ("repo_id","tenant_id") REFERENCES "public"."scan_repos"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scans_repo_id_created_at" ON "scans" USING btree ("repo_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scans_active_per_repo" ON "scans" USING btree ("repo_id") WHERE "scans"."status" in ('queued', 'running');
