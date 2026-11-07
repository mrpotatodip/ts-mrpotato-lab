CREATE TABLE "tenant_countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_countries_id_tenant" UNIQUE("id","tenant_id"),
	CONSTRAINT "tenant_countries_country_format" CHECK ("tenant_countries"."country" ~ '^[A-Z]{2}$'),
	CONSTRAINT "tenant_countries_currency_format" CHECK ("tenant_countries"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "menu_item_prices" (
	"tenant_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"variants" jsonb,
	"is_sold" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_item_prices_menu_item_id_country_id_pk" PRIMARY KEY("menu_item_id","country_id")
);
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_locations" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_countries" ADD CONSTRAINT "tenant_countries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_prices" ADD CONSTRAINT "menu_item_prices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_prices" ADD CONSTRAINT "menu_item_prices_item_in_tenant_fk" FOREIGN KEY ("menu_item_id","tenant_id") REFERENCES "public"."tenant_menu_items"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_prices" ADD CONSTRAINT "menu_item_prices_country_in_tenant_fk" FOREIGN KEY ("country_id","tenant_id") REFERENCES "public"."tenant_countries"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_countries_tenant_country" ON "tenant_countries" USING btree ("tenant_id","country");--> statement-breakpoint
CREATE INDEX "idx_tenant_countries_tenant" ON "tenant_countries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_menu_item_prices_tenant" ON "menu_item_prices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_menu_item_prices_country" ON "menu_item_prices" USING btree ("country_id");--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" ADD CONSTRAINT "fk_chat_bot_thread_sessions_country_tenant" FOREIGN KEY ("country_id","tenant_id") REFERENCES "public"."tenant_countries"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_locations" ADD CONSTRAINT "tenant_locations_country_in_tenant_fk" FOREIGN KEY ("country_id","tenant_id") REFERENCES "public"."tenant_countries"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD CONSTRAINT "tenant_faqs_country_in_tenant_fk" FOREIGN KEY ("country_id","tenant_id") REFERENCES "public"."tenant_countries"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenant_locations_country" ON "tenant_locations" USING btree ("country_id");--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD CONSTRAINT "tenant_faqs_country_or_location" CHECK ("tenant_faqs"."country_id" is null or "tenant_faqs"."location_id" is null);--> statement-breakpoint
-- Expand step: each Tenant gets one Country from tenants.country/currency, every
-- Location joins it, and every item's price and variants become a sold price row
-- for it. Each statement skips rows already done, so it is safe to run again. The
-- old tenants, item and variant columns stay until the contract migration.
INSERT INTO "tenant_countries" ("tenant_id", "country", "currency")
SELECT t."id", t."country", t."currency"
FROM "tenants" t
WHERE NOT EXISTS (
	SELECT 1 FROM "tenant_countries" c WHERE c."tenant_id" = t."id" AND c."country" = t."country"
);--> statement-breakpoint
UPDATE "tenant_locations" l SET "country_id" = c."id"
FROM "tenants" t
JOIN "tenant_countries" c ON c."tenant_id" = t."id" AND c."country" = t."country"
WHERE l."tenant_id" = t."id" AND l."country_id" IS NULL;--> statement-breakpoint
INSERT INTO "menu_item_prices" ("tenant_id", "menu_item_id", "country_id", "price", "variants", "is_sold")
SELECT i."tenant_id", i."id", c."id", i."price", i."variants", true
FROM "tenant_menu_items" i
JOIN "tenants" t ON t."id" = i."tenant_id"
JOIN "tenant_countries" c ON c."tenant_id" = t."id" AND c."country" = t."country"
WHERE NOT EXISTS (
	SELECT 1 FROM "menu_item_prices" p WHERE p."menu_item_id" = i."id" AND p."country_id" = c."id"
);