CREATE TABLE "tenant_github_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'github' NOT NULL,
	"installation_id" bigint NOT NULL,
	"account_login" text NOT NULL,
	"repository_selection" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"connected_by" uuid NOT NULL,
	"notice_accepted_at" timestamp with time zone NOT NULL,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_github_installations_provider" CHECK ("tenant_github_installations"."provider" in ('github')),
	CONSTRAINT "tenant_github_installations_selection" CHECK ("tenant_github_installations"."repository_selection" in ('all', 'selected')),
	CONSTRAINT "tenant_github_installations_status" CHECK ("tenant_github_installations"."status" in ('active', 'suspended', 'removed'))
);
--> statement-breakpoint
ALTER TABLE "scan_repos" ADD COLUMN "provider" text DEFAULT 'github' NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_repos" ADD COLUMN "is_private" boolean;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "installation_id" uuid;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "github_repo_id" bigint;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "is_private" boolean;--> statement-breakpoint
ALTER TABLE "tenant_github_installations" ADD CONSTRAINT "tenant_github_installations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_github_installations" ADD CONSTRAINT "tenant_github_installations_connected_by_party_persons_party_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."party_persons"("party_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_github_installations_install" ON "tenant_github_installations" USING btree ("provider","installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_github_installations_id_tenant" ON "tenant_github_installations" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_github_installations_tenant_id" ON "tenant_github_installations" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_installation_tenant_fk" FOREIGN KEY ("installation_id","tenant_id") REFERENCES "public"."tenant_github_installations"("id","tenant_id") ON DELETE restrict ON UPDATE no action;