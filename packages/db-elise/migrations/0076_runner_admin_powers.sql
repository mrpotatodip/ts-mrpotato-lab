INSERT INTO "access_master_powers" ("power", "scope") VALUES
  ('company:runners:create', 'tenant'),
  ('company:runners:delete', 'tenant')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT r."id", p."id", 'tenant'
FROM "access_master_roles" r
JOIN "access_master_powers" p ON p."power" IN ('company:runners:create', 'company:runners:delete')
WHERE r."key" IN ('tenant_admin', 'workspace_admin') AND r."scope" = 'tenant'
ON CONFLICT DO NOTHING;
