ALTER TABLE "tenants" ADD COLUMN "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_country_format" CHECK ("tenants"."country" ~ '^[A-Z]{2}$');--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_currency_format" CHECK ("tenants"."currency" ~ '^[A-Z]{3}$');