-- -----
-- Agents are defined in code; agent_id is
-- plain text checked by the code constants.
-- -----
ALTER TABLE "chat_bot_messages" DROP CONSTRAINT "chat_bot_messages_agent_id_chat_bot_agents_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_bot_runs" DROP CONSTRAINT "chat_bot_runs_agent_id_chat_bot_agents_id_fk";
--> statement-breakpoint
DROP TABLE "chat_bot_agents";
