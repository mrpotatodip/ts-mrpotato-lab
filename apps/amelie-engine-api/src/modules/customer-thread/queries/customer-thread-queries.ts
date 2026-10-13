import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import { chatBotMessages, chatBotThreadSessions, chatBotThreads } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import { CUSTOMER_THREAD_NOT_FOUND } from "#/modules/customer-thread/constants";
import type { CustomerThreadRow, CustomerThreadSummaryRow } from "#/modules/customer-thread/types";

const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

const MISSING_TOOL = "reportMissingInformation";

// -----
// Customer threads only (an anonymous id, no login),
// newest activity first. Every row is this Tenant's.
// -----
export const listCustomerThreadsEffect = (
  db: DbConnectType,
  tenantId: string,
  limit: number,
): Effect.Effect<CustomerThreadSummaryRow[], DbError> => {
  const lastMessageAt = sql<Date>`max(${chatBotMessages.createdAt})`.mapWith(chatBotMessages.createdAt);
  return query(() =>
    db
      .select({
        id: chatBotThreads.id,
        title: chatBotThreads.title,
        startedAt: chatBotThreads.createdAt,
        lastMessageAt,
        messageCount: sql<number>`count(*)::int`,
        unansweredCount: sql<number>`count(*) filter (where ${chatBotMessages.role} = 'assistant'
          and ${chatBotMessages.toolsUsed} @> ARRAY[${MISSING_TOOL}]::text[]
          and ${chatBotMessages.dismissedAt} is null)::int`,
      })
      .from(chatBotMessages)
      .innerJoin(chatBotThreadSessions, eq(chatBotThreadSessions.threadId, chatBotMessages.threadId))
      .innerJoin(chatBotThreads, eq(chatBotThreads.id, chatBotMessages.threadId))
      .where(and(eq(chatBotMessages.tenantId, tenantId), isNotNull(chatBotThreadSessions.anonymousId)))
      .groupBy(chatBotThreads.id, chatBotThreads.title, chatBotThreads.createdAt)
      .orderBy(desc(lastMessageAt))
      .limit(limit),
  );
};

// -----
// A thread of another Tenant, or a signed-in
// thread, is the same 404 as one that is not there.
// -----
export const getCustomerThreadEffect = (
  db: DbConnectType,
  tenantId: string,
  threadId: string,
): Effect.Effect<CustomerThreadRow, DbError | NotFound> =>
  Effect.gen(function* () {
    const [thread] = yield* query(() =>
      db
        .select({ id: chatBotThreads.id, title: chatBotThreads.title, startedAt: chatBotThreads.createdAt })
        .from(chatBotThreadSessions)
        .innerJoin(chatBotThreads, eq(chatBotThreads.id, chatBotThreadSessions.threadId))
        .where(
          and(
            eq(chatBotThreadSessions.threadId, threadId),
            eq(chatBotThreadSessions.tenantId, tenantId),
            isNotNull(chatBotThreadSessions.anonymousId),
          ),
        ),
    );
    if (!thread) return yield* new NotFound({ message: CUSTOMER_THREAD_NOT_FOUND });
    const messages = yield* query(() =>
      db
        .select({
          id: chatBotMessages.id,
          role: chatBotMessages.role,
          content: chatBotMessages.content,
          structure: chatBotMessages.structure,
          dismissedAt: chatBotMessages.dismissedAt,
          createdAt: chatBotMessages.createdAt,
        })
        .from(chatBotMessages)
        .where(and(eq(chatBotMessages.threadId, threadId), eq(chatBotMessages.tenantId, tenantId)))
        .orderBy(asc(chatBotMessages.createdAt)),
    );
    return { ...thread, messages };
  });
