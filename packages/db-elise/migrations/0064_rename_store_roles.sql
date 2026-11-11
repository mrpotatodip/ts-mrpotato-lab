UPDATE "access_master_roles" SET "key" = 'workspace_admin', "label" = 'Workspace admin', "updated_at" = now() WHERE "key" = 'store_admin';--> statement-breakpoint
UPDATE "access_master_roles" SET "key" = 'workspace_member', "label" = 'Workspace member', "updated_at" = now() WHERE "key" = 'store_staff';
