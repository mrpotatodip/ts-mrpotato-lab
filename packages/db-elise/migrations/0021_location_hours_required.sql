-- Expand step 2. A Tenant created since 0017 by code that did not know about
-- Locations has none: give it the same default Location 0017 made.
INSERT INTO "tenant_locations" ("tenant_id", "name", "slug", "address", "phone", "timezone")
SELECT t."id", t."name", t."slug", p."address", p."phone", t."timezone"
FROM "tenants" t
LEFT JOIN "tenant_business_profiles" p ON p."tenant_id" = t."id"
WHERE NOT EXISTS (SELECT 1 FROM "tenant_locations" l WHERE l."tenant_id" = t."id");--> statement-breakpoint
-- Rows written since 0017 by code that did not set location_id
-- still have NULL: point them at the Tenant's oldest Location (its default).
-- A profile address or phone saved since 0017 is copied to that Location when
-- the Location has none, so the later drop of the profile columns loses nothing.
UPDATE "tenant_business_hours" h SET "location_id" = l."id"
FROM "tenant_locations" l
WHERE h."location_id" IS NULL AND l."id" = (
  SELECT d."id" FROM "tenant_locations" d WHERE d."tenant_id" = h."tenant_id" ORDER BY d."created_at", d."id" LIMIT 1
);--> statement-breakpoint
UPDATE "tenant_business_hours_overrides" o SET "location_id" = l."id"
FROM "tenant_locations" l
WHERE o."location_id" IS NULL AND l."id" = (
  SELECT d."id" FROM "tenant_locations" d WHERE d."tenant_id" = o."tenant_id" ORDER BY d."created_at", d."id" LIMIT 1
);--> statement-breakpoint
UPDATE "tenant_locations" l SET
  "address" = coalesce(l."address", p."address"),
  "phone" = coalesce(l."phone", p."phone")
FROM "tenant_business_profiles" p
WHERE p."tenant_id" = l."tenant_id"
  AND l."id" = (SELECT d."id" FROM "tenant_locations" d WHERE d."tenant_id" = l."tenant_id" ORDER BY d."created_at", d."id" LIMIT 1);--> statement-breakpoint
ALTER TABLE "tenant_business_hours" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_business_hours_overrides" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_business_hours_overrides_location_date" ON "tenant_business_hours_overrides" USING btree ("location_id","date");
