-- -----
-- Knowledge documents become FAQs in the
-- "other" category; their rows move over.
-- -----
CREATE TYPE "public"."faq_category" AS ENUM('general', 'location', 'parking', 'catering', 'policies', 'other');
--> statement-breakpoint
ALTER TABLE "tenant_faqs" ADD COLUMN "category" "faq_category" DEFAULT 'general' NOT NULL;
--> statement-breakpoint
INSERT INTO "tenant_faqs" ("tenant_id", "category", "question", "answer", "created_at", "updated_at")
SELECT "tenant_id", 'other', "title", "content", "created_at", "updated_at" FROM "tenant_knowledge_documents";
--> statement-breakpoint
DROP TABLE "tenant_knowledge_documents";
--> statement-breakpoint
DROP TYPE "public"."knowledge_source_type";
