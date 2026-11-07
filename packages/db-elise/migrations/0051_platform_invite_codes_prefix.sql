ALTER TABLE "invite_codes" RENAME TO "platform_invite_codes";--> statement-breakpoint
ALTER TABLE "invite_code_redemptions" RENAME TO "platform_invite_code_redemptions";--> statement-breakpoint
ALTER TABLE "platform_invite_codes" RENAME CONSTRAINT "invite_codes_pkey" TO "platform_invite_codes_pkey";--> statement-breakpoint
ALTER TABLE "platform_invite_codes" RENAME CONSTRAINT "invite_codes_code_hash_unique" TO "platform_invite_codes_code_hash_unique";--> statement-breakpoint
ALTER TABLE "platform_invite_codes" RENAME CONSTRAINT "invite_codes_created_by_party_persons_party_id_fk" TO "platform_invite_codes_created_by_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "platform_invite_codes" RENAME CONSTRAINT "invite_codes_max_uses_positive" TO "platform_invite_codes_max_uses_positive";--> statement-breakpoint
ALTER TABLE "platform_invite_codes" RENAME CONSTRAINT "invite_codes_use_count_in_range" TO "platform_invite_codes_use_count_in_range";--> statement-breakpoint
ALTER INDEX "idx_invite_codes_created_at" RENAME TO "idx_platform_invite_codes_created_at";--> statement-breakpoint
ALTER TABLE "platform_invite_code_redemptions" RENAME CONSTRAINT "invite_code_redemptions_pkey" TO "platform_invite_code_redemptions_pkey";--> statement-breakpoint
ALTER TABLE "platform_invite_code_redemptions" RENAME CONSTRAINT "invite_code_redemptions_invite_code_id_invite_codes_id_fk" TO "platform_invite_code_redemptions_invite_code_id_platform_invite_codes_id_fk";--> statement-breakpoint
ALTER TABLE "platform_invite_code_redemptions" RENAME CONSTRAINT "invite_code_redemptions_person_party_id_party_persons_party_id_fk" TO "platform_invite_code_redemptions_person_party_id_party_persons_party_id_fk";--> statement-breakpoint
ALTER TABLE "platform_invite_code_redemptions" RENAME CONSTRAINT "invite_code_redemptions_tenant_id_tenants_id_fk" TO "platform_invite_code_redemptions_tenant_id_tenants_id_fk";--> statement-breakpoint
ALTER INDEX "idx_invite_code_redemptions_invite_code" RENAME TO "idx_platform_invite_code_redemptions_invite_code";
