CREATE TABLE "tenant_group_members" (
	"group_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_group_members_pkey" PRIMARY KEY("group_id","party_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_team_invite_groups" (
	"invite_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "tenant_team_invite_groups_pkey" PRIMARY KEY("invite_id","group_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_groups_tenant_name" ON "tenant_groups" USING btree ("tenant_id",lower("name"));
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_groups_id_tenant" ON "tenant_groups" USING btree ("id","tenant_id");
--> statement-breakpoint
ALTER TABLE "tenant_group_members" ADD CONSTRAINT "tenant_group_members_group_tenant_fk" FOREIGN KEY ("group_id","tenant_id") REFERENCES "public"."tenant_groups"("id","tenant_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_group_members" ADD CONSTRAINT "tenant_group_members_party_tenant_fk" FOREIGN KEY ("tenant_id","party_id") REFERENCES "public"."party_roles"("tenant_id","party_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_groups" ADD CONSTRAINT "tenant_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_team_invite_groups" ADD CONSTRAINT "tenant_team_invite_groups_invite_tenant_fk" FOREIGN KEY ("invite_id","tenant_id") REFERENCES "public"."tenant_team_invites"("id","tenant_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_team_invite_groups" ADD CONSTRAINT "tenant_team_invite_groups_group_tenant_fk" FOREIGN KEY ("group_id","tenant_id") REFERENCES "public"."tenant_groups"("id","tenant_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_tenant_group_members_party_id" ON "tenant_group_members" USING btree ("party_id");
