import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type {
  ChatBotDurableStreamInit,
  ChatBotDurableStreamStoreOptions,
} from "./stream/types";

// -----
// The Postgres side of the package. These need
// drizzle-orm, so they live apart from the types
// every host uses.
// -----
export type ChatBotDurableStreamDb = PgDatabase<PgQueryResultHKT>;

export type ChatBotDurableStreamOptions = ChatBotDurableStreamStoreOptions &
  Pick<ChatBotDurableStreamInit, "streamPrefix" | "retainMs" | "staleMs" | "onPruneError"> & {
    db: ChatBotDurableStreamDb;
  };
