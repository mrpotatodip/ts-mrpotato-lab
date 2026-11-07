CREATE TYPE "public"."party_type" AS ENUM('person', 'organization');--> statement-breakpoint
CREATE TYPE "public"."tenant_member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "organizations" (
	"party_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "party_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"party_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"role" "tenant_member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_party_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "party_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_party_id_persons_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."persons"("party_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organization_party_id_organizations_party_id_fk" FOREIGN KEY ("organization_party_id") REFERENCES "public"."organizations"("party_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_members_tenant_party" ON "tenant_members" USING btree ("tenant_id","party_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_members_party_id" ON "tenant_members" USING btree ("party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenants_slug" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_tenants_organization_party_id" ON "tenants" USING btree ("organization_party_id");--> statement-breakpoint
ALTER TABLE "auth_user" ADD CONSTRAINT "auth_user_party_id_persons_party_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."persons"("party_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_user" ADD CONSTRAINT "auth_user_party_id_unique" UNIQUE("party_id");