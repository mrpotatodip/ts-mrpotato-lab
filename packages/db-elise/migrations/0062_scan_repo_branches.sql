CREATE TABLE "scan_repo_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repo_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scan_repo_branches_name" CHECK (length("scan_repo_branches"."name") > 0)
);--> statement-breakpoint
ALTER TABLE "scan_repo_findings" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "scan_repos" ADD COLUMN "default_branch" text;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "branch" text;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "scan_repo_branches" ADD CONSTRAINT "scan_repo_branches_repo_tenant_fk" FOREIGN KEY ("repo_id","tenant_id") REFERENCES "public"."scan_repos"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scan_repo_branches_repo_name" ON "scan_repo_branches" USING btree ("repo_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scan_repo_branches_id_tenant" ON "scan_repo_branches" USING btree ("id","tenant_id");--> statement-breakpoint
INSERT INTO "scan_repo_branches" ("tenant_id", "repo_id", "name") SELECT "tenant_id", "id", 'main' FROM "scan_repos";--> statement-breakpoint
UPDATE "scan_repos" SET "default_branch" = 'main';--> statement-breakpoint
UPDATE "scans" SET "branch" = 'main', "branch_id" = "b"."id" FROM "scan_repo_branches" "b" WHERE "b"."repo_id" = "scans"."repo_id" AND "scans"."ref" IS NULL;--> statement-breakpoint
UPDATE "scan_repo_findings" SET "branch_id" = "b"."id" FROM "scan_repo_branches" "b" WHERE "b"."repo_id" = "scan_repo_findings"."repo_id";--> statement-breakpoint
ALTER TABLE "scan_repo_findings" ALTER COLUMN "branch_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_repo_findings" ADD CONSTRAINT "scan_repo_findings_branch_tenant_fk" FOREIGN KEY ("branch_id","tenant_id") REFERENCES "public"."scan_repo_branches"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_branch_tenant_fk" FOREIGN KEY ("branch_id","tenant_id") REFERENCES "public"."scan_repo_branches"("id","tenant_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scan_repo_findings_branch_state" ON "scan_repo_findings" USING btree ("branch_id","state");--> statement-breakpoint
ALTER TABLE "scan_repo_findings" DROP CONSTRAINT "scan_repo_findings_pkey";--> statement-breakpoint
ALTER TABLE "scan_repo_findings" ADD CONSTRAINT "scan_repo_findings_pkey" PRIMARY KEY("branch_id","fingerprint");
