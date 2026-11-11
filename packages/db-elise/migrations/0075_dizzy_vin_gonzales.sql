CREATE TABLE "scan_runner_jobs" (
	"scan_id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"runner_id" uuid NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"repo_url" text NOT NULL,
	"ref" text,
	"prompt" text NOT NULL,
	"options_json" text NOT NULL,
	"priors_json" text NOT NULL,
	"commit_sha" text,
	"branch" text,
	"error" text,
	"usage_json" text,
	"files_json" text,
	"claimed_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scan_runner_jobs_state" CHECK ("scan_runner_jobs"."state" in ('queued', 'claimed', 'succeeded', 'failed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "scan_runner_jobs" ADD CONSTRAINT "scan_runner_jobs_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_runner_jobs" ADD CONSTRAINT "scan_runner_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_runner_jobs" ADD CONSTRAINT "scan_runner_jobs_runner_id_tenant_runners_id_fk" FOREIGN KEY ("runner_id") REFERENCES "public"."tenant_runners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scan_runner_jobs_runner_state" ON "scan_runner_jobs" USING btree ("runner_id","state");