-- -----
-- Tables for @repo/chat-bot-durable-stream, for
-- apps without drizzle-kit. Safe to run twice.
-- -----
CREATE TABLE IF NOT EXISTS "chat_bot_durable_streams" (
	"stream_prefix" text NOT NULL,
	"run_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "chat_bot_durable_streams_stream_prefix_run_id_pk" PRIMARY KEY("stream_prefix","run_id")
);

CREATE TABLE IF NOT EXISTS "chat_bot_durable_stream_chunks" (
	"stream_prefix" text NOT NULL,
	"run_id" text NOT NULL,
	"seq" integer NOT NULL,
	"chunk" jsonb NOT NULL,
	CONSTRAINT "chat_bot_durable_stream_chunks_stream_prefix_run_id_seq_pk" PRIMARY KEY("stream_prefix","run_id","seq"),
	CONSTRAINT "chat_bot_durable_stream_chunks_stream_fk" FOREIGN KEY ("stream_prefix","run_id") REFERENCES "chat_bot_durable_streams"("stream_prefix","run_id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_chat_bot_durable_streams_prefix_closed" ON "chat_bot_durable_streams" USING btree ("stream_prefix","closed_at");
