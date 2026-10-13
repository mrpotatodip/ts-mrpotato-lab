import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUser } from "./auth";
import { tenantCountries } from "./country";
import { tenantLocations } from "./location";
import { tenants } from "./tenant";

// -----
// Code-owned lookups a thread names; only
// enabled ones may start a thread.
// -----
export const chatBotTriggers = pgTable(
  "chat_bot_triggers",
  {
    id: text("id").primaryKey(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => ({
    idFormat: check("chat_bot_triggers_id_format", sql`${t.id} ~ '^[a-z][a-z0-9_]*$'`),
  }),
);

export const chatBotModules = pgTable(
  "chat_bot_modules",
  {
    id: text("id").primaryKey(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => ({
    idFormat: check("chat_bot_modules_id_format", sql`${t.id} ~ '^[a-z][a-z0-9_]*$'`),
  }),
);

// -----
// A conversation; who owns it and which
// Tenant it's about live in its Thread session.
// -----
export const chatBotThreads = pgTable("chat_bot_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  trigger: text("trigger")
    .notNull()
    .default("chat")
    .references(() => chatBotTriggers.id, { onDelete: "restrict" }),
  module: text("module")
    .notNull()
    .default("chat")
    .references(() => chatBotModules.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// -----
// One per thread: its Tenant, and a signed-in
// user or an anonymous Customer that expires.
// location_id is the Location the thread is about;
// the composite FK keeps it in the thread's Tenant.
// country_id is the thread's Country, the same way.
// -----
export const chatBotThreadSessions = pgTable(
  "chat_bot_thread_sessions",
  {
    threadId: uuid("thread_id")
      .primaryKey()
      .references(() => chatBotThreads.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => authUser.id, { onDelete: "cascade" }),
    anonymousId: text("anonymous_id"),
    locationId: uuid("location_id"),
    countryId: uuid("country_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ownerShape: check(
      "chat_bot_thread_sessions_owner_shape",
      sql`(${t.userId} IS NOT NULL AND ${t.anonymousId} IS NULL AND ${t.expiresAt} IS NULL)
        OR (${t.userId} IS NULL AND ${t.anonymousId} IS NOT NULL AND ${t.expiresAt} IS NOT NULL)`,
    ),
    fkLocationTenant: foreignKey({
      name: "fk_chat_bot_thread_sessions_location_tenant",
      columns: [t.locationId, t.tenantId],
      foreignColumns: [tenantLocations.id, tenantLocations.tenantId],
    }),
    fkCountryTenant: foreignKey({
      name: "fk_chat_bot_thread_sessions_country_tenant",
      columns: [t.countryId, t.tenantId],
      foreignColumns: [tenantCountries.id, tenantCountries.tenantId],
    }),
    uqThreadTenant: unique("uq_chat_bot_thread_sessions_thread_tenant").on(t.threadId, t.tenantId),
    idxTenantUser: index("idx_chat_bot_thread_sessions_tenant_user").on(t.tenantId, t.userId),
    idxAnonymous: index("idx_chat_bot_thread_sessions_anonymous").on(t.anonymousId),
  }),
);

// -----
// One row per streaming turn. Twin of the
// run statuses in chat-bot-schema.ts.
// -----
export const chatBotRuns = pgTable(
  "chat_bot_runs",
  {
    id: text("id").primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatBotThreads.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("running"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    cachedTokens: integer("cached_tokens"),
    outputTokens: integer("output_tokens"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    statusKnown: check(
      "chat_bot_runs_status_known",
      sql`${t.status} IN ('running', 'completed', 'failed')`,
    ),
    idxThreadStatusStarted: index("idx_chat_bot_runs_thread_status").on(
      t.threadId,
      t.status,
      t.startedAt,
    ),
  }),
);

// -----
// One user or assistant turn; tenant_id must
// match its thread's (composite FK).
// -----
export const chatBotMessages = pgTable(
  "chat_bot_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatBotThreads.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    // -----
    // Tools that ran this turn, and their
    // cards: { [tool]: { display, results } }.
    // -----
    toolsUsed: text("tools_used").array().notNull().default(sql`'{}'::text[]`),
    structure: jsonb("structure"),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantOfThread: foreignKey({
      name: "chat_bot_messages_tenant_of_thread_fk",
      columns: [t.threadId, t.tenantId],
      foreignColumns: [chatBotThreadSessions.threadId, chatBotThreadSessions.tenantId],
    }).onDelete("cascade"),
    idxTenantCreated: index("idx_chat_bot_messages_tenant_created").on(t.tenantId, t.createdAt),
    roleKnown: check("chat_bot_messages_role_known", sql`${t.role} IN ('user', 'assistant')`),
    idxThreadCreated: index("idx_chat_bot_messages_thread_created").on(t.threadId, t.createdAt),
  }),
);

export type ChatBotTrigger = typeof chatBotTriggers.$inferSelect;
export type ChatBotModule = typeof chatBotModules.$inferSelect;
export type ChatBotThread = typeof chatBotThreads.$inferSelect;
export type NewChatBotThread = typeof chatBotThreads.$inferInsert;
export type ChatBotThreadSession = typeof chatBotThreadSessions.$inferSelect;
export type ChatBotMessage = typeof chatBotMessages.$inferSelect;
export type NewChatBotMessage = typeof chatBotMessages.$inferInsert;
export type ChatBotRun = typeof chatBotRuns.$inferSelect;
export type NewChatBotRun = typeof chatBotRuns.$inferInsert;
