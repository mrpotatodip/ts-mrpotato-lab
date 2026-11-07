CREATE TABLE "party_master_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_party_master_types_key" ON "party_master_types" USING btree ("key");--> statement-breakpoint
INSERT INTO "party_master_types" ("key", "label", "description", "is_system") VALUES
	('person', 'Person', 'A human being', true),
	('organization', 'Organization', 'A company or any other group', true);--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "master_type_id" uuid;--> statement-breakpoint
UPDATE "parties" SET "master_type_id" = (SELECT "id" FROM "party_master_types" WHERE "key" = "parties"."type"::text);--> statement-breakpoint
ALTER TABLE "parties" ALTER COLUMN "master_type_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_master_type_id_party_master_types_id_fk" FOREIGN KEY ("master_type_id") REFERENCES "public"."party_master_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."party_type";
