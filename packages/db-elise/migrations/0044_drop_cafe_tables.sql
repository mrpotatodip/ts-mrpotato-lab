ALTER TABLE "chat_bot_thread_sessions" DROP CONSTRAINT "fk_chat_bot_thread_sessions_location_tenant";
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" DROP CONSTRAINT "fk_chat_bot_thread_sessions_country_tenant";
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" DROP COLUMN "location_id";--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" DROP COLUMN "country_id";
--> statement-breakpoint
ALTER TABLE "tenant_countries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "import_drafts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "imports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "party_role_scopes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_locations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dietary_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "menu_item_prices" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_business_hours" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_business_hours_overrides" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_business_profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_faq_categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_faqs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_menu_categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_menu_item_dietary_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_menu_item_images" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_menu_item_locations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_menu_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_invite_scopes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tenant_countries" CASCADE;--> statement-breakpoint
DROP TABLE "import_drafts" CASCADE;--> statement-breakpoint
DROP TABLE "imports" CASCADE;--> statement-breakpoint
DROP TABLE "party_role_scopes" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_locations" CASCADE;--> statement-breakpoint
DROP TABLE "dietary_tags" CASCADE;--> statement-breakpoint
DROP TABLE "menu_item_prices" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_business_hours" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_business_hours_overrides" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_business_profiles" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_faq_categories" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_faqs" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_menu_categories" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_menu_item_dietary_tags" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_menu_item_images" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_menu_item_locations" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_menu_items" CASCADE;--> statement-breakpoint
DROP TABLE "team_invite_scopes" CASCADE;
