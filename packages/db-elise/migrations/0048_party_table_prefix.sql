ALTER TABLE "persons" RENAME TO "party_persons";--> statement-breakpoint
ALTER TABLE "organizations" RENAME TO "party_organizations";--> statement-breakpoint
ALTER TABLE "party_persons" RENAME CONSTRAINT "persons_pkey" TO "party_persons_pkey";--> statement-breakpoint
ALTER TABLE "party_persons" RENAME CONSTRAINT "persons_party_id_parties_id_fk" TO "party_persons_party_id_parties_id_fk";--> statement-breakpoint
ALTER TABLE "party_organizations" RENAME CONSTRAINT "organizations_pkey" TO "party_organizations_pkey";--> statement-breakpoint
ALTER TABLE "party_organizations" RENAME CONSTRAINT "organizations_party_id_parties_id_fk" TO "party_organizations_party_id_parties_id_fk";--> statement-breakpoint
ALTER TABLE "auth_user" RENAME CONSTRAINT "auth_user_party_id_persons_party_id_fk" TO "auth_user_party_id_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "party_roles" RENAME CONSTRAINT "party_roles_party_id_persons_party_id_fk" TO "party_roles_party_id_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_organization_party_id_organizations_party_id_fk";--> statement-breakpoint
ALTER TABLE "tenants" RENAME COLUMN "organization_party_id" TO "party_id";--> statement-breakpoint
ALTER INDEX "idx_tenants_organization_party_id" RENAME TO "idx_tenants_party_id";--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" RENAME CONSTRAINT "invite_codes_created_by_persons_party_id_fk" TO "invite_codes_created_by_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "invite_code_redemptions" RENAME CONSTRAINT "invite_code_redemptions_person_party_id_persons_party_id_fk" TO "invite_code_redemptions_person_party_id_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "team_invites" RENAME CONSTRAINT "team_invites_invited_by_persons_party_id_fk" TO "team_invites_invited_by_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "roles" RENAME TO "party_master_roles";--> statement-breakpoint
ALTER TABLE "party_master_roles" RENAME CONSTRAINT "roles_pkey" TO "party_master_roles_pkey";--> statement-breakpoint
ALTER TABLE "party_master_roles" RENAME CONSTRAINT "roles_tenant_id_tenants_id_fk" TO "party_master_roles_tenant_id_tenants_id_fk";--> statement-breakpoint
ALTER TABLE "party_master_roles" RENAME CONSTRAINT "roles_master_role_fk" TO "party_master_roles_master_role_fk";--> statement-breakpoint
ALTER TABLE "party_master_roles" RENAME CONSTRAINT "roles_scope_tenant" TO "party_master_roles_scope_tenant";--> statement-breakpoint
ALTER INDEX "uq_roles_global_master_role" RENAME TO "uq_party_master_roles_global_master_role";--> statement-breakpoint
ALTER INDEX "uq_roles_id_scope" RENAME TO "uq_party_master_roles_id_scope";--> statement-breakpoint
ALTER INDEX "uq_roles_id_tenant" RENAME TO "uq_party_master_roles_id_tenant";--> statement-breakpoint
ALTER INDEX "uq_roles_tenant_master_role" RENAME TO "uq_party_master_roles_tenant_master_role";--> statement-breakpoint
ALTER INDEX "idx_roles_master_role_id" RENAME TO "idx_party_master_roles_master_role_id";--> statement-breakpoint
ALTER TABLE "team_invites" RENAME TO "tenant_team_invites";--> statement-breakpoint
ALTER TABLE "tenant_team_invites" RENAME CONSTRAINT "team_invites_pkey" TO "tenant_team_invites_pkey";--> statement-breakpoint
ALTER TABLE "tenant_team_invites" RENAME CONSTRAINT "team_invites_tenant_id_tenants_id_fk" TO "tenant_team_invites_tenant_id_tenants_id_fk";--> statement-breakpoint
ALTER TABLE "tenant_team_invites" RENAME CONSTRAINT "team_invites_invited_by_party_persons_party_id_fk" TO "tenant_team_invites_invited_by_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "tenant_team_invites" RENAME CONSTRAINT "team_invites_role_tenant_fk" TO "tenant_team_invites_role_tenant_fk";--> statement-breakpoint
ALTER INDEX "uq_team_invites_token_hash" RENAME TO "uq_tenant_team_invites_token_hash";--> statement-breakpoint
ALTER INDEX "uq_team_invites_pending_email" RENAME TO "uq_tenant_team_invites_pending_email";--> statement-breakpoint
ALTER INDEX "uq_team_invites_id_tenant" RENAME TO "uq_tenant_team_invites_id_tenant";--> statement-breakpoint
ALTER INDEX "idx_team_invites_tenant_id" RENAME TO "idx_tenant_team_invites_tenant_id";
