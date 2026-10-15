-- -----
-- Tables for @repo/chat-bot-api/drizzle, for apps
-- without drizzle-kit. Safe to run twice. Using a
-- different prefix? Replace "chat_bot_" throughout.
-- -----
CREATE TABLE IF NOT EXISTS "chat_bot_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"trigger" text NOT NULL,
	"module" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chat_bot_thread_sessions" (
	"thread_id" uuid PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"user_id" text,
	"anonymous_id" text,
	"attrs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_thread_sessions_thread_id_chat_bot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "chat_bot_threads"("id") ON DELETE cascade,
	CONSTRAINT "chat_bot_thread_sessions_owner_shape" CHECK (("user_id" IS NOT NULL AND "anonymous_id" IS NULL AND "expires_at" IS NULL)
          OR ("user_id" IS NULL AND "anonymous_id" IS NOT NULL AND "expires_at" IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "chat_bot_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"model" text,
	"input_tokens" integer,
	"cached_tokens" integer,
	"output_tokens" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_runs_thread_id_chat_bot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "chat_bot_threads"("id") ON DELETE cascade,
	CONSTRAINT "chat_bot_runs_status_known" CHECK ("status" IN ('running', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS "chat_bot_messages" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
	"thread_id" uuid NOT NULL,
	"scope_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tools_used" text[] DEFAULT '{}'::text[] NOT NULL,
	"structure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_messages_thread_id_chat_bot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "chat_bot_threads"("id") ON DELETE cascade,
	CONSTRAINT "chat_bot_messages_role_known" CHECK ("role" IN ('user', 'assistant'))
);

CREATE INDEX IF NOT EXISTS "idx_chat_bot_thread_sessions_scope_user" ON "chat_bot_thread_sessions" USING btree ("scope_id","user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_bot_thread_sessions_anonymous" ON "chat_bot_thread_sessions" USING btree ("anonymous_id");
CREATE INDEX IF NOT EXISTS "idx_chat_bot_runs_thread_status" ON "chat_bot_runs" USING btree ("thread_id","status","started_at");
CREATE INDEX IF NOT EXISTS "idx_chat_bot_messages_thread" ON "chat_bot_messages" USING btree ("thread_id","id");
