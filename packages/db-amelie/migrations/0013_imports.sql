CREATE TABLE "import_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"source_file" text NOT NULL,
	"review_note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_drafts_kind_known" CHECK ("import_drafts"."kind" IN ('menu_category', 'menu_item', 'business_hours', 'business_profile')),
	CONSTRAINT "import_drafts_status_known" CHECK ("import_drafts"."status" IN ('pending', 'approved', 'discarded'))
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"files" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	CONSTRAINT "uq_imports_id_tenant" UNIQUE("id","tenant_id"),
	CONSTRAINT "imports_status_known" CHECK ("imports"."status" IN ('running', 'ready', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_drafts" ADD CONSTRAINT "import_drafts_import_in_tenant_fk" FOREIGN KEY ("import_id","tenant_id") REFERENCES "public"."imports"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_import_drafts_import" ON "import_drafts" USING btree ("import_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_imports_tenant_created" ON "imports" USING btree ("tenant_id","created_at");