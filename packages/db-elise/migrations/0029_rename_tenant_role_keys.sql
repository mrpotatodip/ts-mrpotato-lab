-- -----
-- Rename Tenant Role keys: owner -> tenant_admin,
-- manager -> store_admin, staff -> store_staff.
-- Drop the (role_id, role_key) FK so both tables
-- can move together.
-- -----
ALTER TABLE "party_roles" DROP CONSTRAINT "party_roles_role_fk";
--> statement-breakpoint
UPDATE "roles" SET "key" = CASE "key"
	WHEN 'owner' THEN 'tenant_admin'
	WHEN 'manager' THEN 'store_admin'
	WHEN 'staff' THEN 'store_staff'
	ELSE "key"
END
WHERE "key" IN ('owner', 'manager', 'staff');
--> statement-breakpoint
UPDATE "party_roles" SET "role_key" = CASE "role_key"
	WHEN 'owner' THEN 'tenant_admin'
	WHEN 'manager' THEN 'store_admin'
	WHEN 'staff' THEN 'store_staff'
	ELSE "role_key"
END
WHERE "role_key" IN ('owner', 'manager', 'staff');
--> statement-breakpoint
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_role_fk" FOREIGN KEY ("role_id","role_key") REFERENCES "public"."roles"("id","key") ON DELETE cascade ON UPDATE no action;
