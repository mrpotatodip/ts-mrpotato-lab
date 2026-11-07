CREATE UNIQUE INDEX "uq_party_roles_id_tenant" ON "party_roles" USING btree ("id","tenant_id");
--> statement-breakpoint
CREATE TABLE "party_role_scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"party_role_id" uuid NOT NULL,
	"country_id" uuid,
	"location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "party_role_scopes_exactly_one" CHECK (num_nonnulls("party_role_scopes"."country_id", "party_role_scopes"."location_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "party_role_scopes" ADD CONSTRAINT "party_role_scopes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_role_scopes" ADD CONSTRAINT "party_role_scopes_party_role_tenant_fk" FOREIGN KEY ("party_role_id","tenant_id") REFERENCES "public"."party_roles"("id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_role_scopes" ADD CONSTRAINT "party_role_scopes_country_tenant_fk" FOREIGN KEY ("country_id","tenant_id") REFERENCES "public"."tenant_countries"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_role_scopes" ADD CONSTRAINT "party_role_scopes_location_tenant_fk" FOREIGN KEY ("location_id","tenant_id") REFERENCES "public"."tenant_locations"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_party_role_scopes_country" ON "party_role_scopes" USING btree ("party_role_id","country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_party_role_scopes_location" ON "party_role_scopes" USING btree ("party_role_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_party_role_scopes_country" ON "party_role_scopes" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "idx_party_role_scopes_location" ON "party_role_scopes" USING btree ("location_id");
