CREATE TABLE "tenant_credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount_usd" numeric(12, 4) NOT NULL,
	"scan_id" text,
	"idempotency_key" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_credit_ledger_kind" CHECK ("tenant_credit_ledger"."kind" in ('grant', 'topup', 'scan_hold', 'scan_settle', 'expiry', 'adjustment')),
	CONSTRAINT "tenant_credit_ledger_scan_kinds" CHECK (("tenant_credit_ledger"."kind" in ('scan_hold', 'scan_settle')) = ("tenant_credit_ledger"."scan_id" is not null)),
	CONSTRAINT "tenant_credit_ledger_sign" CHECK (("tenant_credit_ledger"."kind" = 'grant' and "tenant_credit_ledger"."amount_usd" >= 0) or ("tenant_credit_ledger"."kind" = 'topup' and "tenant_credit_ledger"."amount_usd" > 0) or ("tenant_credit_ledger"."kind" in ('scan_hold', 'expiry') and "tenant_credit_ledger"."amount_usd" < 0) or "tenant_credit_ledger"."kind" in ('scan_settle', 'adjustment'))
);
--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD COLUMN "credit_markup" numeric(6, 3) DEFAULT '1.5' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD COLUMN "carry_cap_usd" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD COLUMN "key_source" text DEFAULT 'platform' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD COLUMN "monthly_scan_allowance" integer;--> statement-breakpoint
ALTER TABLE "tenant_credit_ledger" ADD CONSTRAINT "tenant_credit_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_credit_ledger" ADD CONSTRAINT "tenant_credit_ledger_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenant_credit_ledger_tenant_created" ON "tenant_credit_ledger" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_credit_ledger_scan_entry" ON "tenant_credit_ledger" USING btree ("scan_id","kind") WHERE "tenant_credit_ledger"."scan_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_credit_ledger_idempotency_key" ON "tenant_credit_ledger" USING btree ("tenant_id","idempotency_key") WHERE "tenant_credit_ledger"."idempotency_key" is not null;--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD CONSTRAINT "platform_master_plans_credit_markup" CHECK ("platform_master_plans"."credit_markup" >= 1);--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD CONSTRAINT "platform_master_plans_carry_cap" CHECK ("platform_master_plans"."carry_cap_usd" is null or "platform_master_plans"."carry_cap_usd" >= "platform_master_plans"."included_credit_usd");--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD CONSTRAINT "platform_master_plans_key_source" CHECK ("platform_master_plans"."key_source" in ('platform', 'account'));--> statement-breakpoint
ALTER TABLE "platform_master_plans" ADD CONSTRAINT "platform_master_plans_scan_allowance" CHECK ("platform_master_plans"."monthly_scan_allowance" is null or "platform_master_plans"."monthly_scan_allowance" >= 1);