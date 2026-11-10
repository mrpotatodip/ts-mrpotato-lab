CREATE TABLE "platform_master_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"monthly_price_usd" numeric(10, 2) NOT NULL,
	"included_credit_usd" numeric(10, 2) NOT NULL,
	"max_members" integer NOT NULL,
	"stripe_price_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_master_plans_monthly_price" CHECK ("platform_master_plans"."monthly_price_usd" >= 0),
	CONSTRAINT "platform_master_plans_included_credit" CHECK ("platform_master_plans"."included_credit_usd" >= 0),
	CONSTRAINT "platform_master_plans_max_members" CHECK ("platform_master_plans"."max_members" >= 1)
);
--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"past_due_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_subscriptions_status" CHECK ("tenant_subscriptions"."status" in ('active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
	CONSTRAINT "tenant_subscriptions_source" CHECK ("tenant_subscriptions"."source" in ('stripe', 'grant')),
	CONSTRAINT "tenant_subscriptions_grant_has_no_stripe" CHECK (("tenant_subscriptions"."source" = 'grant') = ("tenant_subscriptions"."stripe_subscription_id" is null and "tenant_subscriptions"."stripe_customer_id" is null)),
	CONSTRAINT "tenant_subscriptions_past_due_since" CHECK ("tenant_subscriptions"."past_due_since" is null or "tenant_subscriptions"."status" = 'past_due')
);
--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "key_source" text DEFAULT 'platform' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_platform_master_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_master_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_platform_master_plans_key" ON "platform_master_plans" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_subscriptions_stripe_subscription_id" ON "tenant_subscriptions" USING btree ("stripe_subscription_id") WHERE "tenant_subscriptions"."stripe_subscription_id" is not null;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_key_source" CHECK ("scans"."key_source" in ('platform', 'account'));--> statement-breakpoint
INSERT INTO "platform_master_plans" ("key", "label", "monthly_price_usd", "included_credit_usd", "max_members") VALUES
  ('solo', 'Solo', 29.00, 15.00, 1),
  ('team', 'Team', 99.00, 50.00, 10)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "tenant_subscriptions" ("tenant_id", "plan_id", "status", "source")
SELECT t."id", p."id", 'active', 'grant'
FROM "tenants" t
JOIN "platform_master_plans" p ON p."key" = 'team'
ON CONFLICT DO NOTHING;