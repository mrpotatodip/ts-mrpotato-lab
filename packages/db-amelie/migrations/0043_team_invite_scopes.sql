CREATE UNIQUE INDEX "uq_team_invites_id_tenant" ON "team_invites" USING btree ("id","tenant_id");
--> statement-breakpoint
CREATE TABLE "team_invite_scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invite_id" uuid NOT NULL,
	"country_id" uuid,
	"location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invite_scopes_exactly_one" CHECK (num_nonnulls("team_invite_scopes"."country_id", "team_invite_scopes"."location_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "team_invite_scopes" ADD CONSTRAINT "team_invite_scopes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invite_scopes" ADD CONSTRAINT "team_invite_scopes_invite_tenant_fk" FOREIGN KEY ("invite_id","tenant_id") REFERENCES "public"."team_invites"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invite_scopes" ADD CONSTRAINT "team_invite_scopes_country_tenant_fk" FOREIGN KEY ("country_id","tenant_id") REFERENCES "public"."tenant_countries"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invite_scopes" ADD CONSTRAINT "team_invite_scopes_location_tenant_fk" FOREIGN KEY ("location_id","tenant_id") REFERENCES "public"."tenant_locations"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_invite_scopes_country" ON "team_invite_scopes" USING btree ("invite_id","country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_team_invite_scopes_location" ON "team_invite_scopes" USING btree ("invite_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_team_invite_scopes_country" ON "team_invite_scopes" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "idx_team_invite_scopes_location" ON "team_invite_scopes" USING btree ("location_id");
