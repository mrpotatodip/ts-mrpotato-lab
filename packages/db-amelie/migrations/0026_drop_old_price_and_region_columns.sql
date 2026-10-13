-- Contract step. One-way: rolling it back needs a database restore, so it
-- deploys only after the code that stopped using these columns is live.
-- Deploy order: apply 0025 and deploy the new code back to back, to keep the
-- window short in which old code still writes only the old columns. Apply 0026
-- only after the new code is live.
-- First the 0025 backfill again: a Tenant, Location or item written by old code
-- between 0025 and the new code still gets its Country, country_id and price row.
-- Each statement skips rows already done.
-- Rows backfilled by 0025 can also be stale: old code edited only the old columns
-- in that window. A row is refreshed from them only if nothing wrote it since the
-- backfill (updated_at = created_at). New code bumps updated_at on every write, so
-- once it is live the old columns are the stale side and are never copied over it.
-- A Tenant with exactly one untouched Country takes the Tenant's edited country
-- and currency instead of getting a second Country.
UPDATE "tenant_countries" c SET "country" = t."country", "currency" = t."currency", "updated_at" = now()
FROM "tenants" t
WHERE c."tenant_id" = t."id"
	AND c."updated_at" = c."created_at"
	AND (c."country" <> t."country" OR c."currency" <> t."currency")
	AND (SELECT count(*) FROM "tenant_countries" x WHERE x."tenant_id" = t."id") = 1;--> statement-breakpoint
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
UPDATE "menu_item_prices" p SET "price" = i."price", "variants" = i."variants"
FROM "tenant_menu_items" i
JOIN "tenants" t ON t."id" = i."tenant_id"
JOIN "tenant_countries" c ON c."tenant_id" = t."id" AND c."country" = t."country"
WHERE p."menu_item_id" = i."id"
	AND p."country_id" = c."id"
	AND p."updated_at" = p."created_at"
	AND (p."price" IS DISTINCT FROM i."price" OR p."variants" IS DISTINCT FROM i."variants");--> statement-breakpoint
INSERT INTO "menu_item_prices" ("tenant_id", "menu_item_id", "country_id", "price", "variants", "is_sold")
SELECT i."tenant_id", i."id", c."id", i."price", i."variants", true
FROM "tenant_menu_items" i
JOIN "tenants" t ON t."id" = i."tenant_id"
JOIN "tenant_countries" c ON c."tenant_id" = t."id" AND c."country" = t."country"
WHERE NOT EXISTS (
	SELECT 1 FROM "menu_item_prices" p WHERE p."menu_item_id" = i."id" AND p."country_id" = c."id"
);--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_country_format";--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_currency_format";--> statement-breakpoint
ALTER TABLE "tenant_locations" ALTER COLUMN "country_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "country";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "tenant_menu_items" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "tenant_menu_items" DROP COLUMN "variants";