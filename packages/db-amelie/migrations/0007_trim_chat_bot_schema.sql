-- -----
-- Drop chat-bot columns and lookups the
-- code never reads; statuses/roles become CHECKs.
-- -----
ALTER TABLE "chat_bot_messages" DROP CONSTRAINT "chat_bot_messages_run_id_chat_bot_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_bot_messages" DROP CONSTRAINT "chat_bot_messages_role_chat_bot_message_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP CONSTRAINT "chat_bot_runs_status_chat_bot_run_statuses_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP CONSTRAINT "chat_bot_runs_parent_run_id_fk";
--> statement-breakpoint
DROP INDEX "idx_chat_bot_messages_thread_subagent_created";
--> statement-breakpoint
DROP INDEX "idx_chat_bot_messages_run";
--> statement-breakpoint
DROP INDEX "idx_chat_bot_runs_parent_started";
--> statement-breakpoint
CREATE INDEX "idx_chat_bot_messages_thread_created" ON "chat_bot_messages" USING btree ("thread_id","created_at");
--> statement-breakpoint
ALTER TABLE "chat_bot_messages" DROP COLUMN "run_id";
--> statement-breakpoint
ALTER TABLE "chat_bot_messages" DROP COLUMN "agent_id";
--> statement-breakpoint
ALTER TABLE "chat_bot_messages" DROP COLUMN "subagent_run_id";
--> statement-breakpoint
ALTER TABLE "chat_bot_messages" DROP COLUMN "parts";
--> statement-breakpoint
ALTER TABLE "chat_bot_modules" DROP COLUMN "name";
--> statement-breakpoint
ALTER TABLE "chat_bot_modules" DROP COLUMN "description";
--> statement-breakpoint
ALTER TABLE "chat_bot_modules" DROP COLUMN "created_at";
--> statement-breakpoint
ALTER TABLE "chat_bot_modules" DROP COLUMN "updated_at";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP COLUMN "agent_id";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP COLUMN "parent_run_id";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP COLUMN "subagent_run_id";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP COLUMN "error";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP COLUMN "error_code";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP COLUMN "usage";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP COLUMN "finished_at";
--> statement-breakpoint
ALTER TABLE "chat_bot_triggers" DROP COLUMN "name";
--> statement-breakpoint
ALTER TABLE "chat_bot_triggers" DROP COLUMN "description";
--> statement-breakpoint
ALTER TABLE "chat_bot_triggers" DROP COLUMN "created_at";
--> statement-breakpoint
ALTER TABLE "chat_bot_triggers" DROP COLUMN "updated_at";
--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD CONSTRAINT "chat_bot_messages_role_known" CHECK ("chat_bot_messages"."role" IN ('user', 'assistant'));
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD CONSTRAINT "chat_bot_runs_status_known" CHECK ("chat_bot_runs"."status" IN ('running', 'completed', 'failed'));
--> statement-breakpoint
DROP TABLE "chat_bot_message_roles";
--> statement-breakpoint
DROP TABLE "chat_bot_run_statuses";
