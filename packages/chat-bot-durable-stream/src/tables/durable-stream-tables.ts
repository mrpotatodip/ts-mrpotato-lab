import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// -----
// One row per run's stream. closedAt set
// means no more chunks will arrive.
// -----
export const chatBotDurableStreams = pgTable(
  "chat_bot_durable_streams",
  {
    streamPrefix: text("stream_prefix").notNull(),
    runId: text("run_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.streamPrefix, t.runId] }),
    idxPrefixClosed: index("idx_chat_bot_durable_streams_prefix_closed").on(
      t.streamPrefix,
      t.closedAt,
    ),
  }),
);

export const chatBotDurableStreamChunks = pgTable(
  "chat_bot_durable_stream_chunks",
  {
    streamPrefix: text("stream_prefix").notNull(),
    runId: text("run_id").notNull(),
    seq: integer("seq").notNull(),
    chunk: jsonb("chunk").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.streamPrefix, t.runId, t.seq] }),
    streamFk: foreignKey({
      name: "chat_bot_durable_stream_chunks_stream_fk",
      columns: [t.streamPrefix, t.runId],
      foreignColumns: [chatBotDurableStreams.streamPrefix, chatBotDurableStreams.runId],
    }).onDelete("cascade"),
  }),
);
