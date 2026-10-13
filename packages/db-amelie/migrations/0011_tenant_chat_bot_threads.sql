CREATE TABLE "tenant_chat_bot_threads" (
	"thread_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text,
	"anonymous_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tenant_chat_bot_threads_thread_tenant" UNIQUE("thread_id","tenant_id"),
	CONSTRAINT "tenant_chat_bot_threads_owner_shape" CHECK (("tenant_chat_bot_threads"."user_id" IS NOT NULL AND "tenant_chat_bot_threads"."anonymous_id" IS NULL AND "tenant_chat_bot_threads"."expires_at" IS NULL)
        OR ("tenant_chat_bot_threads"."user_id" IS NULL AND "tenant_chat_bot_threads"."anonymous_id" IS NOT NULL AND "tenant_chat_bot_threads"."expires_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "chat_bot_threads" DROP CONSTRAINT "chat_bot_threads_user_id_auth_user_id_fk";
--> statement-breakpoint
DROP INDEX "idx_chat_bot_threads_user_updated";--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD COLUMN "dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD COLUMN "cached_tokens" integer;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "tenant_chat_bot_threads" ADD CONSTRAINT "tenant_chat_bot_threads_thread_id_chat_bot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_bot_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_chat_bot_threads" ADD CONSTRAINT "tenant_chat_bot_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_chat_bot_threads" ADD CONSTRAINT "tenant_chat_bot_threads_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenant_chat_bot_threads_tenant_user" ON "tenant_chat_bot_threads" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_chat_bot_threads_anonymous" ON "tenant_chat_bot_threads" USING btree ("anonymous_id");--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD CONSTRAINT "chat_bot_messages_tenant_of_thread_fk" FOREIGN KEY ("thread_id","tenant_id") REFERENCES "public"."tenant_chat_bot_threads"("thread_id","tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_bot_messages_tenant_created" ON "chat_bot_messages" USING btree ("tenant_id","created_at");--> statement-breakpoint
ALTER TABLE "chat_bot_threads" DROP COLUMN "user_id";--> statement-breakpoint
INSERT INTO "chat_bot_triggers" ("id", "enabled") VALUES ('widget', true);
--> statement-breakpoint
INSERT INTO "chat_bot_modules" ("id", "enabled") VALUES ('customer', true);
