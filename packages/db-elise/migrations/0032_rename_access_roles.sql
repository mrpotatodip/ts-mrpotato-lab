ALTER TABLE "roles" RENAME TO "access_roles";--> statement-breakpoint
ALTER TABLE "role_powers" RENAME TO "access_role_powers";--> statement-breakpoint
ALTER INDEX "uq_roles_tenant_key" RENAME TO "uq_access_roles_tenant_key";--> statement-breakpoint
ALTER INDEX "uq_roles_global_key" RENAME TO "uq_access_roles_global_key";--> statement-breakpoint
ALTER INDEX "uq_roles_id_tenant" RENAME TO "uq_access_roles_id_tenant";--> statement-breakpoint
ALTER INDEX "uq_roles_id_key" RENAME TO "uq_access_roles_id_key";--> statement-breakpoint
ALTER INDEX "uq_role_powers_role_power" RENAME TO "uq_access_role_powers_role_power";--> statement-breakpoint
ALTER INDEX "idx_role_powers_role_id" RENAME TO "idx_access_role_powers_role_id";--> statement-breakpoint
ALTER TABLE "access_roles" RENAME CONSTRAINT "roles_pkey" TO "access_roles_pkey";--> statement-breakpoint
ALTER TABLE "access_roles" RENAME CONSTRAINT "roles_superuser_global" TO "access_roles_superuser_global";--> statement-breakpoint
ALTER TABLE "access_roles" RENAME CONSTRAINT "roles_tenant_id_tenants_id_fk" TO "access_roles_tenant_id_tenants_id_fk";--> statement-breakpoint
ALTER TABLE "access_role_powers" RENAME CONSTRAINT "role_powers_pkey" TO "access_role_powers_pkey";--> statement-breakpoint
ALTER TABLE "access_role_powers" RENAME CONSTRAINT "role_powers_role_id_roles_id_fk" TO "access_role_powers_role_id_access_roles_id_fk";
