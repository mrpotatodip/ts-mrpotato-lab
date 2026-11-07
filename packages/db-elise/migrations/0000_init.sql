CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_bot_durable_stream_chunks" (
	"stream_prefix" text NOT NULL,
	"run_id" text NOT NULL,
	"seq" integer NOT NULL,
	"chunk" jsonb NOT NULL,
	CONSTRAINT "chat_bot_durable_stream_chunks_stream_prefix_run_id_seq_pk" PRIMARY KEY("stream_prefix","run_id","seq")
);
--> statement-breakpoint
CREATE TABLE "chat_bot_durable_streams" (
	"stream_prefix" text NOT NULL,
	"run_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "chat_bot_durable_streams_stream_prefix_run_id_pk" PRIMARY KEY("stream_prefix","run_id")
);
--> statement-breakpoint
CREATE TABLE "chat_bot_agent_subagents" (
	"agent_id" text NOT NULL,
	"subagent_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_agent_subagents_agent_id_subagent_id_pk" PRIMARY KEY("agent_id","subagent_id"),
	CONSTRAINT "chat_bot_agent_subagents_not_self" CHECK ("chat_bot_agent_subagents"."agent_id" <> "chat_bot_agent_subagents"."subagent_id")
);
--> statement-breakpoint
CREATE TABLE "chat_bot_agent_tools" (
	"agent_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_agent_tools_agent_id_tool_name_pk" PRIMARY KEY("agent_id","tool_name"),
	CONSTRAINT "chat_bot_agent_tools_tool_name_format" CHECK ("chat_bot_agent_tools"."tool_name" ~ '^[a-zA-Z0-9_-]{1,64}$')
);
--> statement-breakpoint
CREATE TABLE "chat_bot_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"temperature" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_agents_temperature_range" CHECK ("chat_bot_agents"."temperature" IS NULL OR ("chat_bot_agents"."temperature" >= 0 AND "chat_bot_agents"."temperature" <= 2)),
	CONSTRAINT "chat_bot_agents_name_format" CHECK ("chat_bot_agents"."name" ~ '^[a-z][a-z0-9_]*$'),
	CONSTRAINT "chat_bot_agents_id_format" CHECK ("chat_bot_agents"."id" ~ ('^' || "chat_bot_agents"."name" || '_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
);
--> statement-breakpoint
CREATE TABLE "chat_bot_message_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_message_roles_id_format" CHECK ("chat_bot_message_roles"."id" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
CREATE TABLE "chat_bot_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"run_id" text,
	"agent_id" text,
	"subagent_run_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"parts" jsonb,
	"tools_used" text[] DEFAULT '{}'::text[] NOT NULL,
	"structure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_bot_modules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "chat_bot_modules_id_format" CHECK ("chat_bot_modules"."id" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
CREATE TABLE "chat_bot_prompt_kinds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "chat_bot_prompt_kinds_id_format" CHECK ("chat_bot_prompt_kinds"."id" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
CREATE TABLE "chat_bot_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text,
	"scope" text GENERATED ALWAYS AS (coalesce(agent_id, 'global')) STORED,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_prompts_version_min" CHECK ("chat_bot_prompts"."version" >= 1),
	CONSTRAINT "chat_bot_prompts_content_not_empty" CHECK (length(trim("chat_bot_prompts"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "chat_bot_run_prompts" (
	"run_id" text NOT NULL,
	"prompt_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "chat_bot_run_prompts_run_id_prompt_id_pk" PRIMARY KEY("run_id","prompt_id")
);
--> statement-breakpoint
CREATE TABLE "chat_bot_run_statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	CONSTRAINT "chat_bot_run_statuses_id_format" CHECK ("chat_bot_run_statuses"."id" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
CREATE TABLE "chat_bot_run_tools" (
	"run_id" text NOT NULL,
	"tool_id" uuid NOT NULL,
	CONSTRAINT "chat_bot_run_tools_run_id_tool_id_pk" PRIMARY KEY("run_id","tool_id")
);
--> statement-breakpoint
CREATE TABLE "chat_bot_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"parent_run_id" text,
	"subagent_run_id" text,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"error_code" text,
	"usage" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chat_bot_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"trigger" text DEFAULT 'chat' NOT NULL,
	"module" text DEFAULT 'chat' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_bot_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"description" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"input_schema" jsonb NOT NULL,
	"result_schema" jsonb,
	"display" text,
	"display_options" jsonb,
	"timeout_ms" integer,
	"is_active" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_tools_name_format" CHECK ("chat_bot_tools"."name" ~ '^[a-zA-Z0-9_-]{1,64}$'),
	CONSTRAINT "chat_bot_tools_version_min" CHECK ("chat_bot_tools"."version" >= 1),
	CONSTRAINT "chat_bot_tools_method_known" CHECK ("chat_bot_tools"."method" IN ('GET', 'POST')),
	CONSTRAINT "chat_bot_tools_display_known" CHECK ("chat_bot_tools"."display" IS NULL OR "chat_bot_tools"."display" IN ('number', 'key_value', 'table', 'list')),
	CONSTRAINT "chat_bot_tools_timeout_range" CHECK ("chat_bot_tools"."timeout_ms" IS NULL OR ("chat_bot_tools"."timeout_ms" >= 100 AND "chat_bot_tools"."timeout_ms" <= 30000))
);
--> statement-breakpoint
CREATE TABLE "chat_bot_triggers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "chat_bot_triggers_id_format" CHECK ("chat_bot_triggers"."id" ~ '^[a-z][a-z0-9_]*$')
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_durable_stream_chunks" ADD CONSTRAINT "chat_bot_durable_stream_chunks_stream_fk" FOREIGN KEY ("stream_prefix","run_id") REFERENCES "public"."chat_bot_durable_streams"("stream_prefix","run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_agent_subagents" ADD CONSTRAINT "chat_bot_agent_subagents_agent_id_chat_bot_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chat_bot_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_agent_subagents" ADD CONSTRAINT "chat_bot_agent_subagents_subagent_id_chat_bot_agents_id_fk" FOREIGN KEY ("subagent_id") REFERENCES "public"."chat_bot_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_agent_tools" ADD CONSTRAINT "chat_bot_agent_tools_agent_id_chat_bot_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chat_bot_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD CONSTRAINT "chat_bot_messages_thread_id_chat_bot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_bot_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD CONSTRAINT "chat_bot_messages_run_id_chat_bot_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."chat_bot_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD CONSTRAINT "chat_bot_messages_agent_id_chat_bot_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chat_bot_agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_messages" ADD CONSTRAINT "chat_bot_messages_role_chat_bot_message_roles_id_fk" FOREIGN KEY ("role") REFERENCES "public"."chat_bot_message_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_prompts" ADD CONSTRAINT "chat_bot_prompts_agent_id_chat_bot_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chat_bot_agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_prompts" ADD CONSTRAINT "chat_bot_prompts_kind_chat_bot_prompt_kinds_id_fk" FOREIGN KEY ("kind") REFERENCES "public"."chat_bot_prompt_kinds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_run_prompts" ADD CONSTRAINT "chat_bot_run_prompts_run_id_chat_bot_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."chat_bot_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_run_prompts" ADD CONSTRAINT "chat_bot_run_prompts_prompt_id_chat_bot_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."chat_bot_prompts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_run_tools" ADD CONSTRAINT "chat_bot_run_tools_run_id_chat_bot_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."chat_bot_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_run_tools" ADD CONSTRAINT "chat_bot_run_tools_tool_id_chat_bot_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."chat_bot_tools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD CONSTRAINT "chat_bot_runs_thread_id_chat_bot_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_bot_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD CONSTRAINT "chat_bot_runs_agent_id_chat_bot_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."chat_bot_agents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD CONSTRAINT "chat_bot_runs_status_chat_bot_run_statuses_id_fk" FOREIGN KEY ("status") REFERENCES "public"."chat_bot_run_statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_runs" ADD CONSTRAINT "chat_bot_runs_parent_run_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."chat_bot_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_threads" ADD CONSTRAINT "chat_bot_threads_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_threads" ADD CONSTRAINT "chat_bot_threads_trigger_chat_bot_triggers_id_fk" FOREIGN KEY ("trigger") REFERENCES "public"."chat_bot_triggers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_threads" ADD CONSTRAINT "chat_bot_threads_module_chat_bot_modules_id_fk" FOREIGN KEY ("module") REFERENCES "public"."chat_bot_modules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_account_user_id" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_session_user_id" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_verification_identifier" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_chat_bot_durable_streams_prefix_closed" ON "chat_bot_durable_streams" USING btree ("stream_prefix","closed_at");--> statement-breakpoint
CREATE INDEX "idx_chat_bot_messages_thread_subagent_created" ON "chat_bot_messages" USING btree ("thread_id","subagent_run_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_bot_messages_run" ON "chat_bot_messages" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chat_bot_prompts_scope_kind_version" ON "chat_bot_prompts" USING btree ("scope","kind","version");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chat_bot_prompts_active" ON "chat_bot_prompts" USING btree ("scope","kind") WHERE "chat_bot_prompts"."is_active";--> statement-breakpoint
CREATE INDEX "idx_chat_bot_run_prompts_prompt" ON "chat_bot_run_prompts" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "idx_chat_bot_run_tools_tool" ON "chat_bot_run_tools" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "idx_chat_bot_runs_thread_status" ON "chat_bot_runs" USING btree ("thread_id","status","started_at");--> statement-breakpoint
CREATE INDEX "idx_chat_bot_runs_parent_started" ON "chat_bot_runs" USING btree ("parent_run_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_chat_bot_threads_user_updated" ON "chat_bot_threads" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chat_bot_tools_name_version" ON "chat_bot_tools" USING btree ("name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chat_bot_tools_active" ON "chat_bot_tools" USING btree ("name") WHERE "chat_bot_tools"."is_active";