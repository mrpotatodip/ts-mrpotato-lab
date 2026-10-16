CREATE TABLE "access_master_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_access_master_roles_key" ON "access_master_roles" USING btree ("key");
--> statement-breakpoint
INSERT INTO "access_master_roles" ("key")
SELECT DISTINCT "key" FROM "access_roles"
UNION
SELECT "key" FROM (VALUES ('tenant_admin'), ('store_admin'), ('store_staff'), ('superuser')) AS k("key");
--> statement-breakpoint
ALTER TABLE "access_roles" ADD CONSTRAINT "access_roles_key_access_master_roles_key_fk" FOREIGN KEY ("key") REFERENCES "public"."access_master_roles"("key") ON DELETE restrict ON UPDATE no action;
