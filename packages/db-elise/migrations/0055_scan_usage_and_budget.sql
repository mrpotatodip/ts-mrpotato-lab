ALTER TABLE "tenants" ADD COLUMN "monthly_scan_budget_usd" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "input_tokens" bigint;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "output_tokens" bigint;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "cache_read_tokens" bigint;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "cache_write_tokens" bigint;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "cost_usd" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "turns" integer;--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "duration_ms" integer;