-- -----
-- FAQ categories become each Tenant's own
-- rows; existing FAQs keep their grouping.
-- -----
CREATE TABLE "tenant_faq_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_faq_categories_id_tenant" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_faq_categories" ADD CONSTRAINT "tenant_faq_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_tenant_faq_categories_tenant" ON "tenant_faq_categories" USING btree ("tenant_id");
--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD COLUMN "category_id" uuid;
--> statement-breakpoint
-- one category per enum value a Tenant used, in enum order
INSERT INTO "tenant_faq_categories" ("tenant_id", "name", "sort_order")
SELECT DISTINCT "tenant_id", initcap("category"::text), array_position(enum_range(NULL::"faq_category"), "category")
FROM "tenant_faqs";
--> statement-breakpoint
UPDATE "tenant_faqs" f SET "category_id" = c."id"
FROM "tenant_faq_categories" c
WHERE c."tenant_id" = f."tenant_id" AND c."name" = initcap(f."category"::text);
--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD CONSTRAINT "tenant_faqs_category_in_tenant_fk" FOREIGN KEY ("category_id","tenant_id") REFERENCES "public"."tenant_faq_categories"("id","tenant_id") ON DELETE SET NULL ("category_id") ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_faqs" DROP COLUMN "category";
--> statement-breakpoint
DROP TYPE "public"."faq_category";
