ALTER TABLE "tenants" ADD COLUMN "monthly_scan_budget_allowance_usd" numeric(10, 2);--> statement-breakpoint
INSERT INTO "access_master_powers" ("power", "scope") VALUES
  ('company:usage:budget:update', 'tenant')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT r."id", p."id", 'tenant'
FROM "access_master_roles" r
JOIN "access_master_powers" p ON p."power" = 'company:usage:budget:update'
WHERE r."key" IN ('tenant_admin', 'workspace_admin') AND r."scope" = 'tenant'
ON CONFLICT DO NOTHING;
