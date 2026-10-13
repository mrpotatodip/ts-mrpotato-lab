CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"code_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_hash_unique" UNIQUE("code_hash"),
	CONSTRAINT "invite_codes_max_uses_positive" CHECK ("invite_codes"."max_uses" > 0),
	CONSTRAINT "invite_codes_use_count_in_range" CHECK ("invite_codes"."use_count" >= 0 AND "invite_codes"."use_count" <= "invite_codes"."max_uses")
);
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_persons_party_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."persons"("party_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invite_codes_created_at" ON "invite_codes" USING btree ("created_at");