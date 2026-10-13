UPDATE "tenants" SET "currency" = "items"."currency" FROM (SELECT "tenant_id", MIN("currency") AS "currency" FROM "tenant_menu_items" GROUP BY "tenant_id" HAVING COUNT(DISTINCT "currency") = 1 AND MIN("currency") <> 'USD') AS "items" WHERE "tenants"."id" = "items"."tenant_id";--> statement-breakpoint
ALTER TABLE "tenant_menu_items" DROP CONSTRAINT "tenant_menu_items_currency_format";--> statement-breakpoint
ALTER TABLE "tenant_menu_items" DROP COLUMN "currency";
