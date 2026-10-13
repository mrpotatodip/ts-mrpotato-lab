import { and, asc, desc, eq, gt, gte, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { isActiveLocation } from "#/modules/location/queries";
import { isOpenCountry } from "#/modules/country/queries";
import { Effect } from "effect";
import {
  chatBotMessages,
  chatBotModules,
  chatBotRuns,
  chatBotThreads,
  chatBotTriggers,
  chatBotThreadSessions,
  tenantCountries,
  tenantLocations,
} from "@repo/db-amelie";
import {
  ChatBotThreadDetailSchema,
  ChatBotThreadListItemSchema,
  ChatBotTurnSchema,
  type ChatBotThreadDeleted,
  type ChatBotThreadDetail,
  type ChatBotThreadListItem,
  type ChatBotThreadsQuery,
  type ChatBotTurn,
} from "@repo/contracts/chat-bots";
import type { DbConnectType } from "#/lib/db-connection";
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION, pgErrorCode } from "#/lib/pg-error";
import {
  Conflict,
  Invalid,
  NotFound,
  toDbError,
  type DbError,
} from "#/lib/effect-query";
import {
  CHAT_BOT_ANONYMOUS_HARD_CAP_MS,
  CHAT_BOT_ANONYMOUS_IDLE_MS,
  CHAT_BOT_MODULE_UNKNOWN,
  CHAT_BOT_LOOKUP_UNKNOWN,
  CHAT_BOT_RUN_EXISTS,
  CHAT_BOT_RUN_NOT_FOUND,
  CHAT_BOT_THREAD_LIST_LIMIT,
  CHAT_BOT_THREAD_NOT_FOUND,
  CHAT_BOT_TRIGGER_UNKNOWN,
} from "#/modules/chat-bot/constants";
import {
  type ChatBotAssistantMessage,
  type ChatBotRunCloseStatus,
  type ChatBotRunRefRow,
  type ChatBotThreadRef,
} from "#/modules/chat-bot/schemas";
import type { ChatBotOwner, ChatBotTurnUsage } from "#/modules/chat-bot/types";

// -----
// The threads this owner holds: its Tenant,
// and its login or live anonymous id.
// -----
const ownedThreadIds = (db: DbConnectType, owner: ChatBotOwner) =>
  db
    .select({ id: chatBotThreadSessions.threadId })
    .from(chatBotThreadSessions)
    .where(
      owner.kind === "user"
        ? and(
            eq(chatBotThreadSessions.tenantId, owner.tenantId),
            eq(chatBotThreadSessions.userId, owner.userId),
          )
        : and(
            eq(chatBotThreadSessions.tenantId, owner.tenantId),
            eq(chatBotThreadSessions.anonymousId, owner.anonymousId),
            gt(chatBotThreadSessions.expiresAt, new Date()),
          ),
    );

const ownedThread = (db: DbConnectType, owner: ChatBotOwner, threadId: string) =>
  and(eq(chatBotThreads.id, threadId), inArray(chatBotThreads.id, ownedThreadIds(db, owner)));

// -----
// Our own rows: a parse failure means schema
// drift, so it is a defect, not a typed error.
// -----
const parseOwnRow = <A>(parse: () => A): Effect.Effect<A> =>
  Effect.try(parse).pipe(Effect.orDie);

const threadListItemColumns = {
  id: chatBotThreads.id,
  createdAt: chatBotThreads.createdAt,
  updatedAt: chatBotThreads.updatedAt,
  title: chatBotThreads.title,
  trigger: chatBotThreads.trigger,
  module: chatBotThreads.module,
};

// -----
// Trigger and module are table rows, so an
// unknown or disabled one is a 400, not an FK 500.
// -----
export const assertChatBotThreadLookupsEffect = (
  db: DbConnectType,
  trigger: string,
  module: string,
): Effect.Effect<void, DbError | Invalid> =>
  Effect.gen(function* () {
    const [triggerRows, moduleRows] = yield* Effect.tryPromise({
      try: () =>
        Promise.all([
          db
            .select({ id: chatBotTriggers.id })
            .from(chatBotTriggers)
            .where(
              and(eq(chatBotTriggers.id, trigger), eq(chatBotTriggers.enabled, true)),
            )
            .limit(1),
          db
            .select({ id: chatBotModules.id })
            .from(chatBotModules)
            .where(
              and(eq(chatBotModules.id, module), eq(chatBotModules.enabled, true)),
            )
            .limit(1),
        ]),
      catch: toDbError,
    });
    if (!triggerRows[0]) {
      return yield* new Invalid({ message: `${CHAT_BOT_TRIGGER_UNKNOWN}: ${trigger}` });
    }
    if (!moduleRows[0]) {
      return yield* new Invalid({ message: `${CHAT_BOT_MODULE_UNKNOWN}: ${module}` });
    }
  });

// -----
// The client picks the run id, so the primary
// key is the guard: a taken id is a 409.
// -----
const toRunInsertError = (cause: unknown): DbError | Conflict | NotFound => {
  const code = pgErrorCode(cause);
  if (code === PG_UNIQUE_VIOLATION) return new Conflict({ message: CHAT_BOT_RUN_EXISTS });
  if (code === PG_FOREIGN_KEY_VIOLATION) {
    return new NotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
  }
  return toDbError(cause);
};

// -----
// A lookup row removed after the check fails
// the thread's FK: a 400, like the check.
// -----
const toThreadWithRunInsertError = (cause: unknown): DbError | Conflict | Invalid => {
  const code = pgErrorCode(cause);
  if (code === PG_UNIQUE_VIOLATION) return new Conflict({ message: CHAT_BOT_RUN_EXISTS });
  if (code === PG_FOREIGN_KEY_VIOLATION) return new Invalid({ message: CHAT_BOT_LOOKUP_UNKNOWN });
  return toDbError(cause);
};

// -----
// A new thread commits with its first run, so a
// taken run id never leaves an empty thread.
// -----
export const insertChatBotThreadWithRunEffect = (
  db: DbConnectType,
  params: {
    owner: ChatBotOwner;
    locationId?: string | null;
    countryId?: string | null;
    title: string;
    trigger: string;
    module: string;
    runId: string;
  },
): Effect.Effect<{ id: string }, DbError | Conflict | Invalid> =>
  Effect.gen(function* () {
    const thread = yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const [row] = await tx
            .insert(chatBotThreads)
            .values({
              title: params.title,
              trigger: params.trigger,
              module: params.module,
            })
            .returning({ id: chatBotThreads.id });
          if (!row) return null;
          const { owner } = params;
          const now = new Date();
          await tx.insert(chatBotThreadSessions).values({
            threadId: row.id,
            tenantId: owner.tenantId,
            locationId: params.locationId ?? null,
            countryId: params.countryId ?? null,
            userId: owner.kind === "user" ? owner.userId : null,
            anonymousId: owner.kind === "anonymous" ? owner.anonymousId : null,
            expiresAt:
              owner.kind === "anonymous"
                ? new Date(now.getTime() + CHAT_BOT_ANONYMOUS_IDLE_MS)
                : null,
          });
          await tx.insert(chatBotRuns).values({
            id: params.runId,
            threadId: row.id,
            status: "running",
          });
          return row;
        }),
      catch: toThreadWithRunInsertError,
    });
    if (!thread) {
      return yield* Effect.die(new Error("insertChatBotThreadWithRun() returned no thread"));
    }
    return thread;
  });

export const findChatBotThreadEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<ChatBotThreadRef, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: chatBotThreads.id,
            title: chatBotThreads.title,
            trigger: chatBotThreads.trigger,
            module: chatBotThreads.module,
          })
          .from(chatBotThreads)
          .where(ownedThread(db, owner, threadId))
          .limit(1),
      catch: toDbError,
    });
    const row = rows[0];
    if (!row) return yield* new NotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
    return row;
  });

// -----
// The Thread's Location, unless it was archived
// since: then the thread has none again.
// -----
export const findChatBotThreadLocationIdEffect = (
  db: DbConnectType,
  threadId: string,
): Effect.Effect<string | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: tenantLocations.id })
        .from(chatBotThreadSessions)
        .innerJoin(tenantLocations, eq(tenantLocations.id, chatBotThreadSessions.locationId))
        .where(and(eq(chatBotThreadSessions.threadId, threadId), isActiveLocation))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map(([row]) => row?.id ?? null));

// -----
// Only the owner's own thread; the FK keeps the
// Location inside the thread's Tenant. The Thread's
// Country follows the Location's, so a stale Thread
// Country can never contradict the Location.
// -----
export const setChatBotThreadLocationEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
  locationId: string,
): Effect.Effect<void, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .update(chatBotThreadSessions)
          .set({
            locationId,
            countryId: sql`(select ${tenantLocations.countryId} from ${tenantLocations} where ${tenantLocations.id} = ${locationId})`,
          })
          .where(
            and(
              eq(chatBotThreadSessions.threadId, threadId),
              inArray(chatBotThreadSessions.threadId, ownedThreadIds(db, owner)),
            ),
          )
          .returning({ threadId: chatBotThreadSessions.threadId }),
      catch: toDbError,
    });
    if (!rows[0]) return yield* new NotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
  });

// -----
// The Thread's Country, unless it was archived
// since: then the thread has none again.
// -----
export const findChatBotThreadCountryIdEffect = (
  db: DbConnectType,
  threadId: string,
): Effect.Effect<string | null, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ id: tenantCountries.id })
        .from(chatBotThreadSessions)
        .innerJoin(tenantCountries, eq(tenantCountries.id, chatBotThreadSessions.countryId))
        .where(and(eq(chatBotThreadSessions.threadId, threadId), isOpenCountry))
        .limit(1),
    catch: toDbError,
  }).pipe(Effect.map(([row]) => row?.id ?? null));

// -----
// Only the owner's own thread; the FK keeps the
// Country inside the thread's Tenant. A Location
// in another Country no longer fits, so it is
// cleared: the customer moved.
// -----
export const setChatBotThreadCountryEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
  countryId: string,
): Effect.Effect<void, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .update(chatBotThreadSessions)
          .set({
            countryId,
            locationId: sql`case when exists (
              select 1 from ${tenantLocations}
              where ${tenantLocations.id} = ${chatBotThreadSessions.locationId}
                and ${tenantLocations.countryId} = ${countryId}
            ) then ${chatBotThreadSessions.locationId} else null end`,
          })
          .where(
            and(
              eq(chatBotThreadSessions.threadId, threadId),
              inArray(chatBotThreadSessions.threadId, ownedThreadIds(db, owner)),
            ),
          )
          .returning({ threadId: chatBotThreadSessions.threadId }),
      catch: toDbError,
    });
    if (!rows[0]) return yield* new NotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
  });

const threadTranscript =(threadId: string) => eq(chatBotMessages.threadId, threadId);

export const insertChatBotUserMessageEffect = (
  db: DbConnectType,
  params: { threadId: string; tenantId: string; content: string },
): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.insert(chatBotMessages).values({
        threadId: params.threadId,
        tenantId: params.tenantId,
        role: "user",
        content: params.content,
      }),
    catch: toDbError,
  });

export const insertChatBotAssistantMessageEffect = (
  db: DbConnectType,
  params: ChatBotAssistantMessage,
): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        await tx.insert(chatBotMessages).values({
          threadId: params.threadId,
          tenantId: params.tenantId,
          role: "assistant",
          content: params.content,
          toolsUsed: params.toolsUsed,
          structure: params.structure,
        });
        await tx
          .update(chatBotThreads)
          .set({ updatedAt: new Date() })
          .where(eq(chatBotThreads.id, params.threadId));
      }),
    catch: toDbError,
  });

export const listChatBotMessagesForModelEffect = (
  db: DbConnectType,
  threadId: string,
  limit: number,
): Effect.Effect<ChatBotTurn[], DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            role: chatBotMessages.role,
            content: chatBotMessages.content,
          })
          .from(chatBotMessages)
          .where(threadTranscript(threadId))
          .orderBy(desc(chatBotMessages.createdAt), desc(chatBotMessages.id))
          .limit(limit),
      catch: toDbError,
    });
    return yield* parseOwnRow(() =>
      ChatBotTurnSchema.array().parse(rows.toReversed()),
    );
  });

export const listChatBotThreadsForOwnerEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  query: ChatBotThreadsQuery,
): Effect.Effect<ChatBotThreadListItem[], DbError> =>
  Effect.gen(function* () {
    const conditions: SQL[] = [inArray(chatBotThreads.id, ownedThreadIds(db, owner))];
    if (query.trigger) conditions.push(eq(chatBotThreads.trigger, query.trigger));
    if (query.module) conditions.push(eq(chatBotThreads.module, query.module));
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select(threadListItemColumns)
          .from(chatBotThreads)
          .where(and(...conditions))
          .orderBy(desc(chatBotThreads.updatedAt))
          .limit(CHAT_BOT_THREAD_LIST_LIMIT),
      catch: toDbError,
    });
    return yield* parseOwnRow(() => ChatBotThreadListItemSchema.array().parse(rows));
  });

export const getChatBotThreadForOwnerEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<ChatBotThreadDetail, DbError | NotFound> =>
  Effect.gen(function* () {
    const thread = yield* findChatBotThreadEffect(db, owner, threadId);
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: chatBotMessages.id,
            role: chatBotMessages.role,
            content: chatBotMessages.content,
            toolsUsed: chatBotMessages.toolsUsed,
            structure: chatBotMessages.structure,
            createdAt: chatBotMessages.createdAt,
          })
          .from(chatBotMessages)
          .where(threadTranscript(threadId))
          .orderBy(asc(chatBotMessages.createdAt), asc(chatBotMessages.id)),
      catch: toDbError,
    });
    return yield* parseOwnRow(() =>
      ChatBotThreadDetailSchema.parse({
        id: thread.id,
        title: thread.title,
        trigger: thread.trigger,
        module: thread.module,
        messages: rows,
      }),
    );
  });

export const updateChatBotThreadTitleForOwnerEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
  title: string,
): Effect.Effect<ChatBotThreadListItem, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .update(chatBotThreads)
          .set({ title, updatedAt: new Date() })
          .where(ownedThread(db, owner, threadId))
          .returning(threadListItemColumns),
      catch: toDbError,
    });
    const row = rows[0];
    if (!row) return yield* new NotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
    return yield* parseOwnRow(() => ChatBotThreadListItemSchema.parse(row));
  });

export const deleteChatBotThreadForOwnerEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<ChatBotThreadDeleted, DbError | NotFound> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .delete(chatBotThreads)
          .where(ownedThread(db, owner, threadId))
          .returning({ id: chatBotThreads.id }),
      catch: toDbError,
    });
    const row = rows[0];
    if (!row) return yield* new NotFound({ message: CHAT_BOT_THREAD_NOT_FOUND });
    return row;
  });

export const insertChatBotRunEffect = (
  db: DbConnectType,
  params: { runId: string; threadId: string },
): Effect.Effect<void, DbError | Conflict | NotFound> =>
  Effect.tryPromise({
    try: () =>
      db.insert(chatBotRuns).values({
        id: params.runId,
        threadId: params.threadId,
        status: "running",
      }),
    catch: toRunInsertError,
  });

export const lookupChatBotRunEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  runId: string,
): Effect.Effect<ChatBotRunRefRow | null, DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({
            id: chatBotRuns.id,
            threadId: chatBotRuns.threadId,
          })
          .from(chatBotRuns)
          .where(
            and(
              eq(chatBotRuns.id, runId),
              inArray(chatBotRuns.threadId, ownedThreadIds(db, owner)),
            ),
          )
          .limit(1),
      catch: toDbError,
    });
    return rows[0] ?? null;
  });

export const findChatBotRunForOwnerEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  runId: string,
): Effect.Effect<ChatBotRunRefRow, DbError | NotFound> =>
  Effect.gen(function* () {
    const row = yield* lookupChatBotRunEffect(db, owner, runId);
    if (!row) return yield* new NotFound({ message: CHAT_BOT_RUN_NOT_FOUND });
    return row;
  });

export const findActiveChatBotRunEffect = (
  db: DbConnectType,
  threadId: string,
): Effect.Effect<{ id: string } | null, DbError> =>
  Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ id: chatBotRuns.id })
          .from(chatBotRuns)
          .where(
            and(eq(chatBotRuns.threadId, threadId), eq(chatBotRuns.status, "running")),
          )
          .orderBy(desc(chatBotRuns.startedAt))
          .limit(1),
      catch: toDbError,
    });
    return rows[0] ?? null;
  });

export const closeChatBotRunEffect = (
  db: DbConnectType,
  runId: string,
  status: ChatBotRunCloseStatus,
): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(chatBotRuns)
        .set({ status })
        .where(eq(chatBotRuns.id, runId)),
    catch: toDbError,
  });

// -----
// Slides an anonymous thread's expiry on each
// message, up to its hard cap.
// -----
export const extendAnonymousChatBotThreadEffect = (
  db: DbConnectType,
  threadId: string,
): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .update(chatBotThreadSessions)
        .set({
          expiresAt: sql`least(now() + ${`${CHAT_BOT_ANONYMOUS_IDLE_MS} milliseconds`}::interval, ${chatBotThreadSessions.createdAt} + ${`${CHAT_BOT_ANONYMOUS_HARD_CAP_MS} milliseconds`}::interval)`,
        })
        .where(
          and(
            eq(chatBotThreadSessions.threadId, threadId),
            sql`${chatBotThreadSessions.anonymousId} IS NOT NULL`,
          ),
        ),
    catch: toDbError,
  });

export const recordChatBotRunUsageEffect = (
  db: DbConnectType,
  runId: string,
  usage: ChatBotTurnUsage,
): Effect.Effect<void, DbError> =>
  Effect.tryPromise({
    try: () => db.update(chatBotRuns).set(usage).where(eq(chatBotRuns.id, runId)),
    catch: toDbError,
  });

// -----
// What the stream turn reads and writes; the
// route passes it in, a test passes stubs.
// -----
export const chatBotStreamQueries = {
  assertChatBotThreadLookupsEffect,
  closeChatBotRunEffect,
  extendAnonymousChatBotThreadEffect,
  findChatBotThreadEffect,
  insertChatBotAssistantMessageEffect,
  insertChatBotRunEffect,
  insertChatBotThreadWithRunEffect,
  insertChatBotUserMessageEffect,
  listChatBotMessagesForModelEffect,
  lookupChatBotRunEffect,
  recordChatBotRunUsageEffect,
};

const countRows = sql<number>`count(*)::int`;

// -----
// The Customer's own messages in a thread
// they hold; a stranger's thread counts 0.
// -----
export const countCustomerMessagesInThreadEffect = (
  db: DbConnectType,
  owner: ChatBotOwner,
  threadId: string,
): Effect.Effect<number, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ count: countRows })
        .from(chatBotMessages)
        .where(
          and(
            eq(chatBotMessages.threadId, threadId),
            inArray(chatBotMessages.threadId, ownedThreadIds(db, owner)),
            eq(chatBotMessages.role, "user"),
          ),
        ),
    catch: toDbError,
  }).pipe(Effect.map(([row]) => row?.count ?? 0));

// -----
// Customer messages since midnight where the
// Tenant is; staff chat doesn't count.
// -----
export const countTenantCustomerMessagesTodayEffect = (
  db: DbConnectType,
  tenantId: string,
  timezone: string,
): Effect.Effect<number, DbError> =>
  Effect.tryPromise({
    try: () =>
      db
        .select({ count: countRows })
        .from(chatBotMessages)
        .innerJoin(chatBotThreadSessions, eq(chatBotThreadSessions.threadId, chatBotMessages.threadId))
        .where(
          and(
            eq(chatBotMessages.tenantId, tenantId),
            eq(chatBotMessages.role, "user"),
            isNotNull(chatBotThreadSessions.anonymousId),
            gte(
              chatBotMessages.createdAt,
              sql`date_trunc('day', now() at time zone ${timezone}) at time zone ${timezone}`,
            ),
          ),
        ),
    catch: toDbError,
  }).pipe(Effect.map(([row]) => row?.count ?? 0));
