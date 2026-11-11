INSERT INTO "access_master_powers" ("power", "scope") VALUES
  ('company:team:groups:read', 'tenant'),
  ('company:team:groups:create', 'tenant'),
  ('company:team:groups:update', 'tenant'),
  ('company:team:groups:delete', 'tenant'),
  ('company:github:installations:create', 'tenant'),
  ('company:github:installations:delete', 'tenant'),
  ('company:findings:accepted_risk:update', 'tenant')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT r."id", p."id", 'tenant'
FROM "access_master_roles" r
JOIN "access_master_powers" p ON p."power" IN (
  'company:team:groups:read',
  'company:team:groups:create',
  'company:team:groups:update',
  'company:team:groups:delete',
  'company:github:installations:create',
  'company:github:installations:delete',
  'company:findings:accepted_risk:update'
)
WHERE r."key" IN ('tenant_admin', 'workspace_admin') AND r."scope" = 'tenant'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT r."id", p."id", 'tenant'
FROM "access_master_roles" r
JOIN "access_master_powers" p ON p."power" IN ('company:team:invites:create', 'company:team:invites:update', 'company:team:invites:delete')
WHERE r."key" = 'workspace_admin' AND r."scope" = 'tenant'
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM "access_role_powers" rp
USING "access_master_roles" r, "access_master_powers" p
WHERE rp."master_role_id" = r."id"
  AND rp."master_power_id" = p."id"
  AND r."key" = 'workspace_member'
  AND p."power" LIKE 'company:team:%';
