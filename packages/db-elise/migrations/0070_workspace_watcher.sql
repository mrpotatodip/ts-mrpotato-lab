INSERT INTO "access_master_powers" ("power", "scope") VALUES
  ('company:dashboard:read', 'tenant'),
  ('company:summary:read', 'tenant')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_master_roles" ("key", "label", "scope", "enabled", "is_system", "can_be_bound") VALUES
  ('workspace_watcher', 'Watcher', 'tenant', true, false, true)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT r."id", p."id", 'tenant'
FROM "access_master_roles" r
JOIN "access_master_powers" p ON p."power" = 'company:dashboard:read'
WHERE r."key" IN ('tenant_admin', 'workspace_admin', 'workspace_member') AND r."scope" = 'tenant'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT r."id", p."id", 'tenant'
FROM "access_master_roles" r
JOIN "access_master_powers" p ON p."power" = 'company:summary:read'
WHERE r."key" IN ('tenant_admin', 'workspace_admin', 'workspace_member', 'workspace_watcher') AND r."scope" = 'tenant'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "party_master_roles" ("tenant_id", "master_role_id", "scope")
SELECT t."id", r."id", r."scope"
FROM "tenants" t
CROSS JOIN "access_master_roles" r
WHERE r."key" = 'workspace_watcher'
ON CONFLICT DO NOTHING;
