INSERT INTO "access_master_powers" ("power", "scope") VALUES ('company:menu:locations:update', 'tenant');--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT rp."master_role_id", np."id", 'tenant'
FROM "access_role_powers" rp
JOIN "access_master_powers" op ON op."id" = rp."master_power_id" AND op."power" = 'store:menu:availability:update'
CROSS JOIN "access_master_powers" np
WHERE np."power" = 'company:menu:locations:update'
ON CONFLICT DO NOTHING;
