CREATE TABLE "party_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_roles_superuser_global" CHECK (("party_roles"."role_key" = 'superuser') = ("party_roles"."tenant_id" is null))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"key" text NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_superuser_global" CHECK (("roles"."key" = 'superuser') = ("roles"."tenant_id" is null))
);
--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_party_id_persons_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."persons"("party_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_party_roles_tenant_party" ON "party_roles" USING btree ("tenant_id","party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_party_roles_superuser" ON "party_roles" USING btree ("party_id") WHERE "party_roles"."role_key" = 'superuser';--> statement-breakpoint
CREATE INDEX "idx_party_roles_party_id" ON "party_roles" USING btree ("party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_tenant_key" ON "roles" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_global_key" ON "roles" USING btree ("key") WHERE "roles"."tenant_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_id_tenant" ON "roles" USING btree ("id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_id_key" ON "roles" USING btree ("id","key");--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_role_fk" FOREIGN KEY ("role_id","role_key") REFERENCES "public"."roles"("id","key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_role_tenant_fk" FOREIGN KEY ("role_id","tenant_id") REFERENCES "public"."roles"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "roles" ("tenant_id", "key", "can_edit")
SELECT t."id", r."key", r."can_edit"
FROM "tenants" t
CROSS JOIN (VALUES ('owner', true), ('manager', true), ('staff', false)) AS r("key", "can_edit");
--> statement-breakpoint
INSERT INTO "party_roles" ("party_id", "role_id", "role_key", "tenant_id")
SELECT m."party_id", r."id", r."key", m."tenant_id"
FROM "tenant_members" m
JOIN "roles" r
  ON r."tenant_id" = m."tenant_id"
 AND r."key" = CASE m."role"::text WHEN 'admin' THEN 'manager' WHEN 'member' THEN 'staff' ELSE m."role"::text END;
--> statement-breakpoint
DROP TABLE "tenant_members" CASCADE;
--> statement-breakpoint
DROP TYPE "public"."tenant_member_role";
