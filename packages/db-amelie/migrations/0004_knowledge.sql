CREATE TYPE "public"."knowledge_source_type" AS ENUM('website', 'manual', 'pdf', 'faq', 'other');--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_at" time,
	"closes_at" time,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_hours_day_range" CHECK ("business_hours"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "business_hours_times_shape" CHECK ("business_hours"."is_closed" OR ("business_hours"."opens_at" IS NOT NULL AND "business_hours"."closes_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "business_hours_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"opens_at" time,
	"closes_at" time,
	"is_closed" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_hours_overrides_times_shape" CHECK ("business_hours_overrides"."is_closed" OR ("business_hours_overrides"."opens_at" IS NOT NULL AND "business_hours_overrides"."closes_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"description" text,
	"website_url" text,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dietary_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source_type" "knowledge_source_type" DEFAULT 'manual' NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_menu_categories_id_tenant" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "menu_item_dietary_tags" (
	"tenant_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"dietary_tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_item_dietary_tags_menu_item_id_dietary_tag_id_pk" PRIMARY KEY("menu_item_id","dietary_tag_id")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"variants" jsonb,
	"is_available" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_menu_items_id_tenant" UNIQUE("id","tenant_id"),
	CONSTRAINT "menu_items_currency_format" CHECK ("menu_items"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours_overrides" ADD CONSTRAINT "business_hours_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_dietary_tag_id_dietary_tags_id_fk" FOREIGN KEY ("dietary_tag_id") REFERENCES "public"."dietary_tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_item_in_tenant_fk" FOREIGN KEY ("menu_item_id","tenant_id") REFERENCES "public"."menu_items"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_in_tenant_fk" FOREIGN KEY ("category_id","tenant_id") REFERENCES "public"."menu_categories"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_business_hours_tenant_day" ON "business_hours" USING btree ("tenant_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_business_hours_overrides_tenant_date" ON "business_hours_overrides" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_business_profiles_tenant" ON "business_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_dietary_tags_slug" ON "dietary_tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_faqs_tenant" ON "faqs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_documents_tenant" ON "knowledge_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_menu_categories_tenant" ON "menu_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_menu_item_dietary_tags_tenant" ON "menu_item_dietary_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_tenant" ON "menu_items" USING btree ("tenant_id");