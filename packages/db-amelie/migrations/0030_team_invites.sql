ALTER TABLE "roles" ADD COLUMN "can_manage_team" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "roles" SET "can_manage_team" = true WHERE "key" = 'tenant_admin';--> statement-breakpoint
CREATE TABLE "team_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role_key" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_persons_party_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."persons"("party_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_role_key" CHECK ("role_key" in ('tenant_admin', 'store_admin', 'store_staff'));--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_invites_token_hash" ON "team_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_invites_pending_email" ON "team_invites" USING btree ("tenant_id","email") WHERE "revoked_at" is null AND "accepted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_team_invites_tenant_id" ON "team_invites" USING btree ("tenant_id");
