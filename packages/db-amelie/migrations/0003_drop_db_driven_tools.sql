-- -----
-- Tools, prompts and subagents live in
-- code; drop their unused tables (#339).
-- -----
DROP TABLE "chat_bot_agent_subagents" CASCADE;
--> statement-breakpoint
DROP TABLE "chat_bot_agent_tools" CASCADE;
--> statement-breakpoint
DROP TABLE "chat_bot_prompt_kinds" CASCADE;
--> statement-breakpoint
DROP TABLE "chat_bot_prompts" CASCADE;
--> statement-breakpoint
DROP TABLE "chat_bot_run_prompts" CASCADE;
--> statement-breakpoint
DROP TABLE "chat_bot_run_tools" CASCADE;
--> statement-breakpoint
DROP TABLE "chat_bot_tools" CASCADE;
--> statement-breakpoint
ALTER TABLE "chat_bot_agents" DROP CONSTRAINT "chat_bot_agents_temperature_range";
--> statement-breakpoint
ALTER TABLE "chat_bot_agents" DROP COLUMN "enabled";
--> statement-breakpoint
ALTER TABLE "chat_bot_agents" DROP COLUMN "model";
--> statement-breakpoint
ALTER TABLE "chat_bot_agents" DROP COLUMN "temperature";--> statement-breakpoint
DROP FUNCTION IF EXISTS chat_bot_activate_prompt(uuid);
--> statement-breakpoint
DROP FUNCTION IF EXISTS chat_bot_activate_tool(uuid);
--> statement-breakpoint
DROP FUNCTION IF EXISTS chat_bot_versioned_row_guard();
