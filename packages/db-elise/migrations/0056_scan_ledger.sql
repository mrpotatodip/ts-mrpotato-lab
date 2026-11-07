CREATE TABLE "scan_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"scan_id" text NOT NULL,
	"name" text NOT NULL,
	"r2_key" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "step" text;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "scan_files" ADD CONSTRAINT "scan_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_files" ADD CONSTRAINT "scan_files_scan_tenant_fk" FOREIGN KEY ("scan_id","tenant_id") REFERENCES "public"."scans"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scan_files_scan_name" ON "scan_files" USING btree ("scan_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scan_files_r2_key" ON "scan_files" USING btree ("r2_key");--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_step" CHECK ("scans"."step" is null or "scans"."step" in ('cloning', 'auditing', 'saving'));