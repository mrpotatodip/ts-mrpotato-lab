INSERT INTO "platform_master_plans" ("key", "label", "monthly_price_usd", "included_credit_usd", "max_members", "credit_markup", "carry_cap_usd", "key_source", "monthly_scan_allowance") VALUES
  ('pro', 'Pro', 49.00, 49.00, 5, 1.5, 100.00, 'platform', NULL),
  ('byok', 'Bring your own key', 19.00, 0.00, 5, 1.5, NULL, 'account', 300)
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "platform_master_plans" SET "enabled" = false WHERE "key" IN ('solo', 'team');--> statement-breakpoint
UPDATE "tenant_subscriptions" s
SET "plan_id" = (SELECT "id" FROM "platform_master_plans" WHERE "key" = 'pro')
WHERE s."plan_id" IN (SELECT "id" FROM "platform_master_plans" WHERE "key" IN ('solo', 'team'))
  AND s."source" = 'grant';--> statement-breakpoint
INSERT INTO "tenant_credit_ledger" ("tenant_id", "kind", "amount_usd", "idempotency_key", "note")
SELECT s."tenant_id", 'grant', 49.00, 'starting-grant', 'Starting balance when credit plans began'
FROM "tenant_subscriptions" s
JOIN "platform_master_plans" p ON p."id" = s."plan_id" AND p."key" = 'pro'
WHERE s."source" = 'grant'
ON CONFLICT DO NOTHING;
