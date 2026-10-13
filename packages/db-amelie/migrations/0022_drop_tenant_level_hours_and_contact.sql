DROP INDEX "uq_tenant_business_hours_tenant_day";--> statement-breakpoint
DROP INDEX "uq_tenant_business_hours_overrides_tenant_date";--> statement-breakpoint
ALTER TABLE "tenant_business_profiles" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "tenant_business_profiles" DROP COLUMN "address";