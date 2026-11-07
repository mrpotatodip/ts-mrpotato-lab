ALTER TABLE "findings" RENAME TO "scan_findings";--> statement-breakpoint
ALTER TABLE "finding_triage" RENAME TO "scan_finding_triage";--> statement-breakpoint
ALTER TABLE "scan_findings" RENAME CONSTRAINT "findings_pkey" TO "scan_findings_pkey";--> statement-breakpoint
ALTER TABLE "scan_findings" RENAME CONSTRAINT "findings_tenant_id_tenants_id_fk" TO "scan_findings_tenant_id_tenants_id_fk";--> statement-breakpoint
ALTER TABLE "scan_findings" RENAME CONSTRAINT "findings_scan_tenant_fk" TO "scan_findings_scan_tenant_fk";--> statement-breakpoint
ALTER TABLE "scan_findings" RENAME CONSTRAINT "findings_status" TO "scan_findings_status";--> statement-breakpoint
ALTER TABLE "scan_findings" RENAME CONSTRAINT "findings_severity" TO "scan_findings_severity";--> statement-breakpoint
ALTER INDEX "uq_findings_scan_finding" RENAME TO "uq_scan_findings_scan_finding";--> statement-breakpoint
ALTER INDEX "idx_findings_tenant_fingerprint" RENAME TO "idx_scan_findings_tenant_fingerprint";--> statement-breakpoint
ALTER TABLE "scan_finding_triage" RENAME CONSTRAINT "finding_triage_pkey" TO "scan_finding_triage_pkey";--> statement-breakpoint
ALTER TABLE "scan_finding_triage" RENAME CONSTRAINT "finding_triage_tenant_id_tenants_id_fk" TO "scan_finding_triage_tenant_id_tenants_id_fk";--> statement-breakpoint
ALTER TABLE "scan_finding_triage" RENAME CONSTRAINT "finding_triage_set_by_party_id_parties_id_fk" TO "scan_finding_triage_set_by_party_id_parties_id_fk";--> statement-breakpoint
ALTER TABLE "scan_finding_triage" RENAME CONSTRAINT "finding_triage_status" TO "scan_finding_triage_status";--> statement-breakpoint
ALTER INDEX "uq_finding_triage_tenant_repo_fingerprint" RENAME TO "uq_scan_finding_triage_tenant_repo_fingerprint";
