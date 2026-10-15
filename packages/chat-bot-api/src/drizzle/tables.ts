import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// -----
// The engine's four tables. They name no host
// table and have no foreign key into one: an
// owner is a scope id and a user id (or an
// anonymous id), whatever those are for the host.
//
// Call it once in your schema so drizzle-kit
// migrates them. The prefix keeps them apart from
// your own tables:
//   export const { chatBotThreads, ... } = createChatBotTables();
// -----
export function createChatBotTables(prefix = "chat_bot") {
  const threads = pgTable(`${prefix}_threads`, {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title"),
    trigger: text("trigger").notNull(),
    module: text("module").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  });

  // -----
  // One per thread: whose it is. A signed-in owner
  // has a user id and no expiry; an anonymous one
  // has an anonymous id and an expiry. attrs is the
  // host's own data, which the engine passes through.
  // -----
  const threadSessions = pgTable(
    `${prefix}_thread_sessions`,
    {
      threadId: uuid("thread_id")
        .primaryKey()
        .references(() => threads.id, { onDelete: "cascade" }),
      scopeId: text("scope_id").notNull(),
      userId: text("user_id"),
      anonymousId: text("anonymous_id"),
      attrs: jsonb("attrs").notNull().default(sql`'{}'::jsonb`),
      expiresAt: timestamp("expires_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
      ownerShape: check(
        `${prefix}_thread_sessions_owner_shape`,
        sql`(${t.userId} IS NOT NULL AND ${t.anonymousId} IS NULL AND ${t.expiresAt} IS NULL)
          OR (${t.userId} IS NULL AND ${t.anonymousId} IS NOT NULL AND ${t.expiresAt} IS NOT NULL)`,
      ),
      idxScopeUser: index(`idx_${prefix}_thread_sessions_scope_user`).on(t.scopeId, t.userId),
      idxAnonymous: index(`idx_${prefix}_thread_sessions_anonymous`).on(t.anonymousId),
    }),
  );

  // -----
  // One row per streaming turn.
  // -----
  const runs = pgTable(
    `${prefix}_runs`,
    {
      id: text("id").primaryKey(),
      threadId: uuid("thread_id")
        .notNull()
        .references(() => threads.id, { onDelete: "cascade" }),
      status: text("status").notNull().default("running"),
      model: text("model"),
      inputTokens: integer("input_tokens"),
      cachedTokens: integer("cached_tokens"),
      outputTokens: integer("output_tokens"),
      startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
      statusKnown: check(
        `${prefix}_runs_status_known`,
        sql`${t.status} IN ('running', 'completed', 'failed')`,
      ),
      idxThreadStatus: index(`idx_${prefix}_runs_thread_status`).on(
        t.threadId,
        t.status,
        t.startedAt,
      ),
    }),
  );

  // -----
  // The id is an identity column, so a thread reads
  // back in the order its messages were stored, even
  // when two share a clock tick.
  // -----
  const messages = pgTable(
    `${prefix}_messages`,
    {
      id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      threadId: uuid("thread_id")
        .notNull()
        .references(() => threads.id, { onDelete: "cascade" }),
      scopeId: text("scope_id").notNull(),
      role: text("role").notNull(),
      content: text("content").notNull(),
      toolsUsed: text("tools_used").array().notNull().default(sql`'{}'::text[]`),
      structure: jsonb("structure"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
      roleKnown: check(`${prefix}_messages_role_known`, sql`${t.role} IN ('user', 'assistant')`),
      idxThread: index(`idx_${prefix}_messages_thread`).on(t.threadId, t.id),
    }),
  );

  return { threads, threadSessions, runs, messages };
}

export type ChatBotTables = ReturnType<typeof createChatBotTables>;

export const chatBotTables = createChatBotTables();
