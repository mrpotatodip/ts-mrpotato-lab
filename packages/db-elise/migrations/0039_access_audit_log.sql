CREATE TABLE "access_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_party_id" uuid,
	"action" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_access_audit_log_subject_id" ON "access_audit_log" USING btree ("subject_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_access_audit_log_created_at" ON "access_audit_log" USING btree ("created_at");
--> statement-breakpoint
CREATE FUNCTION "access_audit_log_append_only"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'access_audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "access_audit_log_append_only"
	BEFORE UPDATE OR DELETE ON "access_audit_log"
	FOR EACH ROW EXECUTE FUNCTION "access_audit_log_append_only"();
