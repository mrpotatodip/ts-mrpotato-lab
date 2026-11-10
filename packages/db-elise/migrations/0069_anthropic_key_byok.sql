CREATE TABLE "tenant_anthropic_keys" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"sealed_key" text NOT NULL,
	"last_four" text NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_anthropic_keys" ADD CONSTRAINT "tenant_anthropic_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_anthropic_keys" ADD CONSTRAINT "tenant_anthropic_keys_updated_by_party_persons_party_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."party_persons"("party_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "access_master_powers" ("power", "scope") VALUES
  ('company:usage:anthropic_key:update', 'tenant')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "access_role_powers" ("master_role_id", "master_power_id", "scope")
SELECT r."id", p."id", 'tenant'
FROM "access_master_roles" r
JOIN "access_master_powers" p ON p."power" = 'company:usage:anthropic_key:update'
WHERE r."key" IN ('tenant_admin', 'workspace_admin') AND r."scope" = 'tenant'
ON CONFLICT DO NOTHING;
