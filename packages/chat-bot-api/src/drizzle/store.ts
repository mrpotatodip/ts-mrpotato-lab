import { and, asc, desc, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import {
  ChatBotThreadDeletedSchema,
  ChatBotThreadDetailSchema,
  ChatBotThreadListItemSchema,
  ChatBotTurnSchema,
} from "../contracts";
import { CHAT_BOT_RUN_EXISTS, CHAT_BOT_THREAD_NOT_FOUND } from "../constants";
import { ChatBotConflict, ChatBotInvalid, ChatBotNotFound, toChatBotDbError } from "../errors";
import type { ChatBotOwner, ChatBotStore } from "../types";
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION, pgErrorCode } from "./pg-error";
import { chatBotTables, type ChatBotTables } from "./tables";

export type DrizzleChatBotStoreOptions = {
  db: PgDatabase<PgQueryResultHKT>;
  tables?: ChatBotTables;
  triggers?: ReadonlyArray<string>;
  modules?: ReadonlyArray<string>;
  anonymousIdleMs?: number;
  anonymousHardCapMs?: number;
  threadListLimit?: number;
};

const DEFAULT_ANONYMOUS_IDLE_MS = 30 * 60 * 1000;
const DEFAULT_ANONYMOUS_HARD_CAP_MS = 24 * 60 * 60 * 1000;
const DEFAULT_THREAD_LIST_LIMIT = 50;

// -----
// Our own rows: a parse failure means schema
// drift, so it is a defect, not a typed error.
// -----
const parseOwnRow = <A>(parse: () => A): Effect.Effect<A> => Effect.try(parse).pipe(Effect.orDie);

// -----
// The ChatBotStore port over Postgres through
// Drizzle. Hand it a db client (node-postgres,
// Neon, PGlite, ...) and, if you gave your tables
// a prefix, the tables. triggers and modules, when
// set, are the only ones a thread may start with;
// anonymousIdleMs and anonymousHardCapMs set how
// long an anonymous thread lives.
// -----
export function createDrizzleChatBotStore(options: DrizzleChatBotStoreOptions): ChatBotStore {
  const { db } = options;
  const { threads, threadSessions, runs, messages } = options.tables ?? chatBotTables;
  const idleMs = options.anonymousIdleMs ?? DEFAULT_ANONYMOUS_IDLE_MS;
  const hardCapMs = options.anonymousHardCapMs ?? DEFAULT_ANONYMOUS_HARD_CAP_MS;
  const listLimit = options.threadListLimit ?? DEFAULT_THREAD_LIST_LIMIT;

  const ownedThreadIds = (owner: ChatBotOwner) =>
    db
      .select({ id: threadSessions.threadId })
      .from(threadSessions)
      .where(
        owner.kind === "user"
          ? and(eq(threadSessions.scopeId, owner.scopeId), eq(threadSessions.userId, owner.userId))
          : and(
              eq(threadSessions.scopeId, owner.scopeId),
              eq(threadSessions.anonymousId, owner.anonymousId),
              gt(threadSessions.expiresAt, new Date()),
            ),
      );

  const ownedThread = (owner: ChatBotOwner, threadId: string) =>
    and(eq(threads.id, threadId), inArray(threads.id, ownedThreadIds(owner)));

  const listColumns = {
    id: threads.id,
    createdAt: threads.createdAt,
    updatedAt: threads.updatedAt,
    title: threads.title,
    trigger: threads.trigger,
    module: threads.module,
  };

  const notFound = () => new ChatBotNotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });

  const findThread: ChatBotStore["findThread"] = (owner, threadId) =>
    Effect.gen(function* () {
      const rows = yield* Effect.tryPromise({
        try: () =>
          db
            .select({
              id: threads.id,
              title: threads.title,
              trigger: threads.trigger,
              module: threads.module,
            })
            .from(threads)
            .where(ownedThread(owner, threadId))
            .limit(1),
        catch: toChatBotDbError,
      });
      const row = rows[0];
      if (!row) return yield* notFound();
      return row;
    });

  return {
    assertThreadStart: ({ trigger, module }) =>
      Effect.gen(function* () {
        if (options.triggers && !options.triggers.includes(trigger)) {
          return yield* new ChatBotInvalid({ message: `Unknown chat trigger: ${trigger}` });
        }
        if (options.modules && !options.modules.includes(module)) {
          return yield* new ChatBotInvalid({ message: `Unknown chat module: ${module}` });
        }
      }),

    lookupRun: (owner, runId) =>
      Effect.tryPromise({
        try: () =>
          db
            .select({ id: runs.id, threadId: runs.threadId })
            .from(runs)
            .where(and(eq(runs.id, runId), inArray(runs.threadId, ownedThreadIds(owner))))
            .limit(1),
        catch: toChatBotDbError,
      }).pipe(Effect.map((rows) => rows[0] ?? null)),

    findThread,

    insertRun: ({ runId, threadId }) =>
      Effect.tryPromise({
        try: () => db.insert(runs).values({ id: runId, threadId, status: "running" }),
        catch: (cause) => {
          const code = pgErrorCode(cause);
          if (code === PG_UNIQUE_VIOLATION) return new ChatBotConflict({ message: CHAT_BOT_RUN_EXISTS });
          if (code === PG_FOREIGN_KEY_VIOLATION) return notFound();
          return toChatBotDbError(cause);
        },
      }).pipe(Effect.asVoid),

    insertThreadWithRun: ({ owner, title, trigger, module, runId, attrs }) =>
      Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            const [thread] = await tx
              .insert(threads)
              .values({ title, trigger, module })
              .returning({ id: threads.id });
            if (!thread) throw new Error("insertThreadWithRun() returned no thread");
            await tx.insert(threadSessions).values({
              threadId: thread.id,
              scopeId: owner.scopeId,
              userId: owner.kind === "user" ? owner.userId : null,
              anonymousId: owner.kind === "anonymous" ? owner.anonymousId : null,
              attrs: attrs ?? {},
              expiresAt: owner.kind === "anonymous" ? new Date(Date.now() + idleMs) : null,
            });
            await tx.insert(runs).values({ id: runId, threadId: thread.id, status: "running" });
            return thread;
          }),
        catch: (cause) =>
          pgErrorCode(cause) === PG_UNIQUE_VIOLATION
            ? new ChatBotConflict({ message: CHAT_BOT_RUN_EXISTS })
            : toChatBotDbError(cause),
      }),

    insertUserMessage: ({ threadId, scopeId, content }) =>
      Effect.tryPromise({
        try: () => db.insert(messages).values({ threadId, scopeId, role: "user", content }),
        catch: toChatBotDbError,
      }).pipe(Effect.asVoid),

    insertAssistantMessage: ({ threadId, scopeId, content, toolsUsed, structure }) =>
      Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            await tx
              .insert(messages)
              .values({ threadId, scopeId, role: "assistant", content, toolsUsed, structure });
            await tx.update(threads).set({ updatedAt: new Date() }).where(eq(threads.id, threadId));
          }),
        catch: toChatBotDbError,
      }),

    listMessagesForModel: (threadId, limit) =>
      Effect.gen(function* () {
        const rows = yield* Effect.tryPromise({
          try: () =>
            db
              .select({ role: messages.role, content: messages.content })
              .from(messages)
              .where(eq(messages.threadId, threadId))
              .orderBy(desc(messages.id))
              .limit(limit),
          catch: toChatBotDbError,
        });
        return yield* parseOwnRow(() => ChatBotTurnSchema.array().parse(rows.toReversed()));
      }),

    closeRun: (runId, status) =>
      Effect.tryPromise({
        try: () => db.update(runs).set({ status }).where(eq(runs.id, runId)),
        catch: toChatBotDbError,
      }).pipe(Effect.asVoid),

    extendAnonymousThread: (threadId) =>
      Effect.tryPromise({
        try: () =>
          db
            .update(threadSessions)
            .set({
              expiresAt: sql`least(now() + ${`${idleMs} milliseconds`}::interval, ${threadSessions.createdAt} + ${`${hardCapMs} milliseconds`}::interval)`,
            })
            .where(
              and(eq(threadSessions.threadId, threadId), sql`${threadSessions.anonymousId} IS NOT NULL`),
            ),
        catch: toChatBotDbError,
      }).pipe(Effect.asVoid),

    recordRunUsage: (runId, usage) =>
      Effect.tryPromise({
        try: () =>
          db
            .update(runs)
            .set({
              model: usage.model,
              inputTokens: usage.inputTokens,
              cachedTokens: usage.cachedTokens,
              outputTokens: usage.outputTokens,
            })
            .where(eq(runs.id, runId)),
        catch: toChatBotDbError,
      }).pipe(Effect.asVoid),

    findActiveRun: (threadId) =>
      Effect.tryPromise({
        try: () =>
          db
            .select({ id: runs.id })
            .from(runs)
            .where(and(eq(runs.threadId, threadId), eq(runs.status, "running")))
            .orderBy(desc(runs.startedAt))
            .limit(1),
        catch: toChatBotDbError,
      }).pipe(Effect.map((rows) => rows[0] ?? null)),

    listThreads: (owner, query) =>
      Effect.gen(function* () {
        const conditions: SQL[] = [inArray(threads.id, ownedThreadIds(owner))];
        if (query.trigger) conditions.push(eq(threads.trigger, query.trigger));
        if (query.module) conditions.push(eq(threads.module, query.module));
        const rows = yield* Effect.tryPromise({
          try: () =>
            db
              .select(listColumns)
              .from(threads)
              .where(and(...conditions))
              .orderBy(desc(threads.updatedAt))
              .limit(listLimit),
          catch: toChatBotDbError,
        });
        return yield* parseOwnRow(() => ChatBotThreadListItemSchema.array().parse(rows));
      }),

    getThread: (owner, threadId) =>
      Effect.gen(function* () {
        const thread = yield* findThread(owner, threadId);
        const rows = yield* Effect.tryPromise({
          try: () =>
            db
              .select({
                id: messages.id,
                role: messages.role,
                content: messages.content,
                toolsUsed: messages.toolsUsed,
                structure: messages.structure,
                createdAt: messages.createdAt,
              })
              .from(messages)
              .where(eq(messages.threadId, threadId))
              .orderBy(asc(messages.id)),
          catch: toChatBotDbError,
        });
        return yield* parseOwnRow(() =>
          ChatBotThreadDetailSchema.parse({
            ...thread,
            messages: rows.map((row) => ({ ...row, id: String(row.id) })),
          }),
        );
      }),

    renameThread: (owner, threadId, title) =>
      Effect.gen(function* () {
        const rows = yield* Effect.tryPromise({
          try: () =>
            db
              .update(threads)
              .set({ title, updatedAt: new Date() })
              .where(ownedThread(owner, threadId))
              .returning(listColumns),
          catch: toChatBotDbError,
        });
        const row = rows[0];
        if (!row) return yield* notFound();
        return yield* parseOwnRow(() => ChatBotThreadListItemSchema.parse(row));
      }),

    deleteThread: (owner, threadId) =>
      Effect.gen(function* () {
        const rows = yield* Effect.tryPromise({
          try: () =>
            db.delete(threads).where(ownedThread(owner, threadId)).returning({ id: threads.id }),
          catch: toChatBotDbError,
        });
        const row = rows[0];
        if (!row) return yield* notFound();
        return yield* parseOwnRow(() => ChatBotThreadDeletedSchema.parse(row));
      }),
  };
}
