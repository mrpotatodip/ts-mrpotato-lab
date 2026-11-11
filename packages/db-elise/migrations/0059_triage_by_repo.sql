-- Two spellings of one repo may each have a decision on the same problem: keep the newest.
DELETE FROM "scan_finding_triage" AS "older" USING "scan_finding_triage" AS "newer"
WHERE "older"."tenant_id" = "newer"."tenant_id" AND "older"."repo_id" = "newer"."repo_id" AND "older"."fingerprint" = "newer"."fingerprint"
	AND ("older"."updated_at", "older"."id") < ("newer"."updated_at", "newer"."id");--> statement-breakpoint
DROP INDEX "uq_scan_finding_triage_tenant_repo_fingerprint";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scan_finding_triage_tenant_repo_fingerprint" ON "scan_finding_triage" USING btree ("tenant_id","repo_id","fingerprint");--> statement-breakpoint
ALTER TABLE "scan_finding_triage" DROP COLUMN "repo";
