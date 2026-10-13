CREATE TABLE "tenant_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"phone" text,
	"timezone" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_locations_id_tenant" UNIQUE("id","tenant_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_business_hours" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_business_hours_overrides" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_locations" ADD CONSTRAINT "tenant_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_locations_tenant_slug" ON "tenant_locations" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "idx_tenant_locations_tenant" ON "tenant_locations" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "tenant_business_hours" ADD CONSTRAINT "tenant_business_hours_location_in_tenant_fk" FOREIGN KEY ("location_id","tenant_id") REFERENCES "public"."tenant_locations"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_business_hours_overrides" ADD CONSTRAINT "tenant_business_hours_overrides_location_in_tenant_fk" FOREIGN KEY ("location_id","tenant_id") REFERENCES "public"."tenant_locations"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Expand step: one default Location per existing Tenant (named and slugged after
-- it, address and phone from the Business profile, timezone from the Tenant),
-- then point every hours row and override at it. The old columns stay.
INSERT INTO "tenant_locations" ("tenant_id", "name", "slug", "address", "phone", "timezone")
SELECT t."id", t."name", t."slug", p."address", p."phone", t."timezone"
FROM "tenants" t
LEFT JOIN "tenant_business_profiles" p ON p."tenant_id" = t."id";--> statement-breakpoint
UPDATE "tenant_business_hours" h SET "location_id" = l."id"
FROM "tenant_locations" l WHERE l."tenant_id" = h."tenant_id";--> statement-breakpoint
UPDATE "tenant_business_hours_overrides" o SET "location_id" = l."id"
FROM "tenant_locations" l WHERE l."tenant_id" = o."tenant_id";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_business_hours_location_day" ON "tenant_business_hours" USING btree ("location_id","day_of_week");