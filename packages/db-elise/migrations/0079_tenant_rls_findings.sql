-- Row-level security on the Scan and Finding tables: the first step. A role without BYPASSRLS (elise_app) sees only the rows
-- of the Tenant named by app.tenant_id. With no Tenant set, it sees none. The owner role has BYPASSRLS, so nothing changes
-- for the Worker until it connects as elise_app inside a transaction that sets app.tenant_id.
ALTER TABLE "scans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scans" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "scans"
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "scan_findings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scan_findings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "scan_findings"
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "scan_finding_triage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scan_finding_triage" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "scan_finding_triage"
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
