-- -----
-- tenant_chat_bot_threads becomes
-- chat_bot_thread_sessions; renamed in place.
-- -----
ALTER TABLE "tenant_chat_bot_threads" RENAME TO "chat_bot_thread_sessions";
--> statement-breakpoint
ALTER INDEX "idx_tenant_chat_bot_threads_tenant_user" RENAME TO "idx_chat_bot_thread_sessions_tenant_user";
--> statement-breakpoint
ALTER INDEX "idx_tenant_chat_bot_threads_anonymous" RENAME TO "idx_chat_bot_thread_sessions_anonymous";
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" RENAME CONSTRAINT "tenant_chat_bot_threads_thread_id_chat_bot_threads_id_fk" TO "chat_bot_thread_sessions_thread_id_chat_bot_threads_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" RENAME CONSTRAINT "tenant_chat_bot_threads_tenant_id_tenants_id_fk" TO "chat_bot_thread_sessions_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" RENAME CONSTRAINT "tenant_chat_bot_threads_user_id_auth_user_id_fk" TO "chat_bot_thread_sessions_user_id_auth_user_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" RENAME CONSTRAINT "uq_tenant_chat_bot_threads_thread_tenant" TO "uq_chat_bot_thread_sessions_thread_tenant";
--> statement-breakpoint
ALTER TABLE "chat_bot_thread_sessions" RENAME CONSTRAINT "tenant_chat_bot_threads_owner_shape" TO "chat_bot_thread_sessions_owner_shape";
--> statement-breakpoint
ALTER INDEX "tenant_chat_bot_threads_pkey" RENAME TO "chat_bot_thread_sessions_pkey";
