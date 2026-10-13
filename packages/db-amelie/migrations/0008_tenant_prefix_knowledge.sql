-- -----
-- Tenant-owned knowledge tables take a
-- tenant_ prefix; renamed, so data stays.
-- -----
ALTER TABLE "business_hours" RENAME TO "tenant_business_hours";
--> statement-breakpoint
ALTER INDEX "uq_business_hours_tenant_day" RENAME TO "uq_tenant_business_hours_tenant_day";
--> statement-breakpoint
ALTER TABLE "tenant_business_hours" RENAME CONSTRAINT "business_hours_tenant_id_tenants_id_fk" TO "tenant_business_hours_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_business_hours" RENAME CONSTRAINT "business_hours_day_range" TO "tenant_business_hours_day_range";
--> statement-breakpoint
ALTER TABLE "tenant_business_hours" RENAME CONSTRAINT "business_hours_times_shape" TO "tenant_business_hours_times_shape";
--> statement-breakpoint
ALTER TABLE "business_hours_overrides" RENAME TO "tenant_business_hours_overrides";
--> statement-breakpoint
ALTER INDEX "uq_business_hours_overrides_tenant_date" RENAME TO "uq_tenant_business_hours_overrides_tenant_date";
--> statement-breakpoint
ALTER TABLE "tenant_business_hours_overrides" RENAME CONSTRAINT "business_hours_overrides_tenant_id_tenants_id_fk" TO "tenant_business_hours_overrides_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_business_hours_overrides" RENAME CONSTRAINT "business_hours_overrides_times_shape" TO "tenant_business_hours_overrides_times_shape";
--> statement-breakpoint
ALTER TABLE "business_profiles" RENAME TO "tenant_business_profiles";
--> statement-breakpoint
ALTER INDEX "uq_business_profiles_tenant" RENAME TO "uq_tenant_business_profiles_tenant";
--> statement-breakpoint
ALTER TABLE "tenant_business_profiles" RENAME CONSTRAINT "business_profiles_tenant_id_tenants_id_fk" TO "tenant_business_profiles_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "faqs" RENAME TO "tenant_faqs";
--> statement-breakpoint
ALTER INDEX "idx_faqs_tenant" RENAME TO "idx_tenant_faqs_tenant";
--> statement-breakpoint
ALTER TABLE "tenant_faqs" RENAME CONSTRAINT "faqs_tenant_id_tenants_id_fk" TO "tenant_faqs_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "knowledge_documents" RENAME TO "tenant_knowledge_documents";
--> statement-breakpoint
ALTER INDEX "idx_knowledge_documents_tenant" RENAME TO "idx_tenant_knowledge_documents_tenant";
--> statement-breakpoint
ALTER TABLE "tenant_knowledge_documents" RENAME CONSTRAINT "knowledge_documents_tenant_id_tenants_id_fk" TO "tenant_knowledge_documents_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "menu_categories" RENAME TO "tenant_menu_categories";
--> statement-breakpoint
ALTER INDEX "idx_menu_categories_tenant" RENAME TO "idx_tenant_menu_categories_tenant";
--> statement-breakpoint
ALTER TABLE "tenant_menu_categories" RENAME CONSTRAINT "menu_categories_tenant_id_tenants_id_fk" TO "tenant_menu_categories_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_menu_categories" RENAME CONSTRAINT "uq_menu_categories_id_tenant" TO "uq_tenant_menu_categories_id_tenant";
--> statement-breakpoint
ALTER TABLE "menu_item_dietary_tags" RENAME TO "tenant_menu_item_dietary_tags";
--> statement-breakpoint
ALTER INDEX "idx_menu_item_dietary_tags_tenant" RENAME TO "idx_tenant_menu_item_dietary_tags_tenant";
--> statement-breakpoint
ALTER TABLE "tenant_menu_item_dietary_tags" RENAME CONSTRAINT "menu_item_dietary_tags_tenant_id_tenants_id_fk" TO "tenant_menu_item_dietary_tags_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_menu_item_dietary_tags" RENAME CONSTRAINT "menu_item_dietary_tags_dietary_tag_id_dietary_tags_id_fk" TO "tenant_menu_item_dietary_tags_dietary_tag_id_dietary_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_menu_item_dietary_tags" RENAME CONSTRAINT "menu_item_dietary_tags_item_in_tenant_fk" TO "tenant_menu_item_dietary_tags_item_in_tenant_fk";
--> statement-breakpoint
ALTER TABLE "tenant_menu_item_dietary_tags" RENAME CONSTRAINT "menu_item_dietary_tags_menu_item_id_dietary_tag_id_pk" TO "tenant_menu_item_dietary_tags_menu_item_id_dietary_tag_id_pk";
--> statement-breakpoint
ALTER TABLE "menu_items" RENAME TO "tenant_menu_items";
--> statement-breakpoint
ALTER INDEX "idx_menu_items_tenant" RENAME TO "idx_tenant_menu_items_tenant";
--> statement-breakpoint
ALTER TABLE "tenant_menu_items" RENAME CONSTRAINT "menu_items_tenant_id_tenants_id_fk" TO "tenant_menu_items_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_menu_items" RENAME CONSTRAINT "menu_items_category_in_tenant_fk" TO "tenant_menu_items_category_in_tenant_fk";
--> statement-breakpoint
ALTER TABLE "tenant_menu_items" RENAME CONSTRAINT "uq_menu_items_id_tenant" TO "uq_tenant_menu_items_id_tenant";
--> statement-breakpoint
ALTER TABLE "tenant_menu_items" RENAME CONSTRAINT "menu_items_currency_format" TO "tenant_menu_items_currency_format";
--> statement-breakpoint
ALTER INDEX "business_profiles_pkey" RENAME TO "tenant_business_profiles_pkey";
--> statement-breakpoint
ALTER INDEX "business_hours_pkey" RENAME TO "tenant_business_hours_pkey";
--> statement-breakpoint
ALTER INDEX "business_hours_overrides_pkey" RENAME TO "tenant_business_hours_overrides_pkey";
--> statement-breakpoint
ALTER INDEX "menu_categories_pkey" RENAME TO "tenant_menu_categories_pkey";
--> statement-breakpoint
ALTER INDEX "menu_items_pkey" RENAME TO "tenant_menu_items_pkey";
--> statement-breakpoint
ALTER INDEX "faqs_pkey" RENAME TO "tenant_faqs_pkey";
--> statement-breakpoint
ALTER INDEX "knowledge_documents_pkey" RENAME TO "tenant_knowledge_documents_pkey";
