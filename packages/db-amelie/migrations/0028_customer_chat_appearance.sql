ALTER TABLE "tenants" ADD COLUMN "customer_chat_label" text DEFAULT 'Chat with us' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "customer_chat_accent" text;