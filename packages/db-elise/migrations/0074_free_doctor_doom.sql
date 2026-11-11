CREATE TABLE "tenant_runners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"pairing_code_hash" text,
	"pairing_expires_at" timestamp with time zone,
	"token_hash" text,
	"created_by" uuid NOT NULL,
	"paired_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_runners" ADD CONSTRAINT "tenant_runners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_runners" ADD CONSTRAINT "tenant_runners_created_by_party_persons_party_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."party_persons"("party_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_runners_pairing_code_hash" ON "tenant_runners" USING btree ("pairing_code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenant_runners_token_hash" ON "tenant_runners" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_tenant_runners_tenant_id" ON "tenant_runners" USING btree ("tenant_id");