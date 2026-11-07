CREATE TABLE "finding_triage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repo" text NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"set_by_party_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finding_triage_status" CHECK ("finding_triage"."status" in ('open', 'fixed', 'false_positive', 'accepted_risk'))
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scan_id" text NOT NULL,
	"finding_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"severity" text,
	"title" text NOT NULL,
	"class" text NOT NULL,
	"file" text,
	"line" integer,
	"actor" text,
	"impact" text,
	"evidence" text,
	"fix" text,
	"needs" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "findings_status" CHECK ("findings"."status" in ('confirmed', 'needs_validation')),
	CONSTRAINT "findings_severity" CHECK (("findings"."status" = 'confirmed' and "findings"."severity" in ('critical', 'high', 'medium', 'low', 'informational'))
        or ("findings"."status" = 'needs_validation' and "findings"."severity" is null))
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repo" text NOT NULL,
	"status" text NOT NULL,
	"skill" text NOT NULL,
	"model" text NOT NULL,
	"effort" text NOT NULL,
	"profile" text NOT NULL,
	"budget" integer,
	"max_budget_usd" numeric(10, 2) NOT NULL,
	"error" text,
	"created_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_scans_id_tenant" UNIQUE("id","tenant_id"),
	CONSTRAINT "scans_status" CHECK ("scans"."status" in ('queued', 'running', 'succeeded', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "finding_triage" ADD CONSTRAINT "finding_triage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_triage" ADD CONSTRAINT "finding_triage_set_by_party_id_parties_id_fk" FOREIGN KEY ("set_by_party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_scan_tenant_fk" FOREIGN KEY ("scan_id","tenant_id") REFERENCES "public"."scans"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_finding_triage_tenant_repo_fingerprint" ON "finding_triage" USING btree ("tenant_id","repo","fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_findings_scan_finding" ON "findings" USING btree ("scan_id","finding_id");--> statement-breakpoint
CREATE INDEX "idx_findings_tenant_fingerprint" ON "findings" USING btree ("tenant_id","fingerprint");--> statement-breakpoint
CREATE INDEX "idx_scans_tenant_created_at" ON "scans" USING btree ("tenant_id","created_at");