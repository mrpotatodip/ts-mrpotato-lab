ALTER TABLE "access_master_roles" ADD COLUMN "can_be_bound" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "access_master_roles" ADD CONSTRAINT "access_master_roles_can_be_bound" CHECK (not ("access_master_roles"."can_be_bound" and ("access_master_roles"."is_system" or "access_master_roles"."scope" <> 'tenant')));
--> statement-breakpoint
UPDATE "access_master_roles" SET "can_be_bound" = true WHERE "key" IN ('store_admin', 'store_staff') AND "is_system" = false AND "scope" = 'tenant';
