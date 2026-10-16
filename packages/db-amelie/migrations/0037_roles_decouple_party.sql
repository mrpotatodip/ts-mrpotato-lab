ALTER TABLE "access_roles" RENAME TO "roles";--> statement-breakpoint
ALTER INDEX "access_roles_pkey" RENAME TO "roles_pkey";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "access_roles_superuser_global";--> statement-breakpoint
ALTER TABLE "party_roles" DROP CONSTRAINT "party_roles_superuser_global";--> statement-breakpoint
ALTER TABLE "team_invites" DROP CONSTRAINT "team_invites_role_key";--> statement-breakpoint
ALTER TABLE "access_role_powers" DROP CONSTRAINT "access_role_powers_master_role_id_access_master_roles_id_fk";--> statement-breakpoint
ALTER TABLE "access_role_powers" DROP CONSTRAINT "access_role_powers_master_power_id_access_master_powers_id_fk";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "access_roles_tenant_id_tenants_id_fk";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "access_roles_key_access_master_roles_key_fk";--> statement-breakpoint
ALTER TABLE "party_roles" DROP CONSTRAINT "party_roles_role_fk";--> statement-breakpoint
ALTER TABLE "party_roles" DROP CONSTRAINT "party_roles_role_tenant_fk";--> statement-breakpoint
DROP INDEX "uq_access_roles_tenant_key";--> statement-breakpoint
DROP INDEX "uq_access_roles_global_key";--> statement-breakpoint
DROP INDEX "uq_access_roles_id_tenant";--> statement-breakpoint
DROP INDEX "uq_access_roles_id_key";--> statement-breakpoint
DROP INDEX "uq_party_roles_superuser";--> statement-breakpoint
ALTER TABLE "access_master_roles" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "access_master_roles" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "access_master_roles" ADD COLUMN "scope" text;--> statement-breakpoint
ALTER TABLE "access_master_roles" ADD COLUMN "enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "access_master_roles" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "access_master_roles" SET
	"label" = initcap(replace("key", '_', ' ')),
	"scope" = CASE WHEN "key" = 'superuser' THEN 'platform' ELSE 'tenant' END,
	"enabled" = true,
	"is_system" = "key" IN ('tenant_admin', 'superuser');--> statement-breakpoint
ALTER TABLE "access_master_roles" ALTER COLUMN "label" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "access_master_roles" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "access_master_powers" ADD COLUMN "scope" text;--> statement-breakpoint
UPDATE "access_master_powers" SET "scope" = CASE WHEN "power" LIKE 'platform:%' THEN 'platform' ELSE 'tenant' END;--> statement-breakpoint
ALTER TABLE "access_master_powers" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "access_role_powers" ADD COLUMN "scope" text;--> statement-breakpoint
UPDATE "access_role_powers" rp SET "scope" = m."scope" FROM "access_master_roles" m WHERE m."id" = rp."master_role_id";--> statement-breakpoint
ALTER TABLE "access_role_powers" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "master_role_id" uuid;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "scope" text;--> statement-breakpoint
UPDATE "roles" r SET "master_role_id" = m."id", "scope" = m."scope" FROM "access_master_roles" m WHERE m."key" = r."key";--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "master_role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "party_roles" ADD COLUMN "role_scope" text;--> statement-breakpoint
UPDATE "party_roles" pr SET "role_scope" = r."scope" FROM "roles" r WHERE r."id" = pr."role_id";--> statement-breakpoint
ALTER TABLE "party_roles" ALTER COLUMN "role_scope" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_invites" ADD COLUMN "role_id" uuid;--> statement-breakpoint
UPDATE "team_invites" ti SET "role_id" = r."id" FROM "roles" r JOIN "access_master_roles" m ON m."id" = r."master_role_id" WHERE r."tenant_id" = ti."tenant_id" AND m."key" = ti."role_key";--> statement-breakpoint
ALTER TABLE "team_invites" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "key";--> statement-breakpoint
ALTER TABLE "party_roles" DROP COLUMN "role_key";--> statement-breakpoint
ALTER TABLE "team_invites" DROP COLUMN "role_key";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_access_master_powers_id_scope" ON "access_master_powers" USING btree ("id","scope");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_access_master_roles_id_scope" ON "access_master_roles" USING btree ("id","scope");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_tenant_master_role" ON "roles" USING btree ("tenant_id","master_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_global_master_role" ON "roles" USING btree ("master_role_id") WHERE "roles"."tenant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_id_tenant" ON "roles" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_id_scope" ON "roles" USING btree ("id","scope");--> statement-breakpoint
CREATE INDEX "idx_roles_master_role_id" ON "roles" USING btree ("master_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_party_roles_platform" ON "party_roles" USING btree ("party_id") WHERE "party_roles"."role_scope" = 'platform';--> statement-breakpoint
ALTER TABLE "access_master_powers" ADD CONSTRAINT "access_master_powers_scope" CHECK (("access_master_powers"."scope" = 'platform') = ("access_master_powers"."power" like 'platform:%'));--> statement-breakpoint
ALTER TABLE "access_master_roles" ADD CONSTRAINT "access_master_roles_scope" CHECK ("access_master_roles"."scope" in ('tenant', 'platform'));--> statement-breakpoint
ALTER TABLE "access_role_powers" ADD CONSTRAINT "access_role_powers_master_role_fk" FOREIGN KEY ("master_role_id","scope") REFERENCES "public"."access_master_roles"("id","scope") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_powers" ADD CONSTRAINT "access_role_powers_master_power_fk" FOREIGN KEY ("master_power_id","scope") REFERENCES "public"."access_master_powers"("id","scope") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_master_role_fk" FOREIGN KEY ("master_role_id","scope") REFERENCES "public"."access_master_roles"("id","scope") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_scope_tenant" CHECK (("roles"."scope" = 'platform') = ("roles"."tenant_id" is null));--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_role_fk" FOREIGN KEY ("role_id","role_scope") REFERENCES "public"."roles"("id","scope") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_role_tenant_fk" FOREIGN KEY ("role_id","tenant_id") REFERENCES "public"."roles"("id","tenant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_platform_global" CHECK (("party_roles"."role_scope" = 'platform') = ("party_roles"."tenant_id" is null));--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_role_tenant_fk" FOREIGN KEY ("role_id","tenant_id") REFERENCES "public"."roles"("id","tenant_id") ON DELETE restrict ON UPDATE no action;
