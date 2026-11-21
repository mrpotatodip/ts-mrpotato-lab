ALTER TABLE "tenant_team_invites" ADD COLUMN "email_status" text DEFAULT 'not_sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_team_invites" ADD COLUMN "email_status_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_team_invites" ADD CONSTRAINT "tenant_team_invites_email_status" CHECK ("tenant_team_invites"."email_status" in ('not_sent', 'sent', 'failed'));