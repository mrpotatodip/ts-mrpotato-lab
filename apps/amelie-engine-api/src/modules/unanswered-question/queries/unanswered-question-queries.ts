import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import { chatBotMessages, chatBotThreadSessions } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFound, toDbError, type DbError } from "#/lib/effect-query";
import {
  UNANSWERED_QUESTION_NOT_FOUND,
  UNANSWERED_QUESTION_TOOL,
  UNANSWERED_QUESTION_WEEK_DAYS,
} from "#/modules/unanswered-question/constants";
import type { UnansweredQuestionRow, UnansweredQuestionWeek } from "#/modules/unanswered-question/types";

const query = <A>(run: () => Promise<A>): Effect.Effect<A, DbError> =>
  Effect.tryPromise({ try: run, catch: toDbError });

// -----
// A reply that reported a Missing topic, in a
// Customer's thread; staff chat never counts.
// -----
const reportedMissing = (tenantId: string) =>
  and(
    eq(chatBotMessages.tenantId, tenantId),
    eq(chatBotMessages.role, "assistant"),
    isNotNull(chatBotThreadSessions.anonymousId),
    sql`${chatBotMessages.toolsUsed} @> ARRAY[${UNANSWERED_QUESTION_TOOL}]::text[]`,
  );

// -----
// Newest first, not dismissed. The question is the
// Customer message just before the reply.
// -----
export const listUnansweredQuestionsEffect = (
  db: DbConnectType,
  tenantId: string,
  limit: number,
): Effect.Effect<UnansweredQuestionRow[], DbError> =>
  query(() =>
    db
      .select({
        messageId: chatBotMessages.id,
        threadId: chatBotMessages.threadId,
        question: sql<string | null>`(
          select q.content from chat_bot_messages q
          where q.thread_id = ${chatBotMessages.threadId}
            and q.role = 'user'
            and q.created_at <= ${chatBotMessages.createdAt}
          order by q.created_at desc limit 1
        )`,
        structure: chatBotMessages.structure,
        askedAt: chatBotMessages.createdAt,
      })
      .from(chatBotMessages)
      .innerJoin(chatBotThreadSessions, eq(chatBotThreadSessions.threadId, chatBotMessages.threadId))
      .where(and(reportedMissing(tenantId), isNull(chatBotMessages.dismissedAt)))
      .orderBy(desc(chatBotMessages.createdAt))
      .limit(limit),
  );

// -----
// The last 7 days in the Tenant's own timezone:
// Customer questions, and replies still open.
// -----
export const countUnansweredQuestionWeekEffect = (
  db: DbConnectType,
  tenantId: string,
  timezone: string,
): Effect.Effect<UnansweredQuestionWeek, DbError> =>
  query(() =>
    db
      .select({
        weekQuestions: sql<number>`count(*) filter (where ${chatBotMessages.role} = 'user')::int`,
        weekUnanswered: sql<number>`count(*) filter (where ${chatBotMessages.role} = 'assistant'
          and ${chatBotMessages.toolsUsed} @> ARRAY[${UNANSWERED_QUESTION_TOOL}]::text[]
          and ${chatBotMessages.dismissedAt} is null)::int`,
      })
      .from(chatBotMessages)
      .innerJoin(chatBotThreadSessions, eq(chatBotThreadSessions.threadId, chatBotMessages.threadId))
      .where(
        and(
          eq(chatBotMessages.tenantId, tenantId),
          isNotNull(chatBotThreadSessions.anonymousId),
          sql`${chatBotMessages.createdAt} >= date_trunc('day', now() at time zone ${timezone}) at time zone ${timezone} - make_interval(days => ${UNANSWERED_QUESTION_WEEK_DAYS - 1})`,
        ),
      ),
  ).pipe(Effect.map(([row]) => row ?? { weekQuestions: 0, weekUnanswered: 0 }));

// -----
// Dismissing twice is fine; another Tenant's
// row, or a plain reply, is a 404.
// -----
export const dismissUnansweredQuestionEffect = (
  db: DbConnectType,
  tenantId: string,
  messageId: string,
): Effect.Effect<void, DbError | NotFound> =>
  query(() =>
    db
      .update(chatBotMessages)
      .set({ dismissedAt: sql`coalesce(${chatBotMessages.dismissedAt}, now())` })
      .where(
        and(
          eq(chatBotMessages.id, messageId),
          eq(chatBotMessages.tenantId, tenantId),
          eq(chatBotMessages.role, "assistant"),
          sql`${chatBotMessages.toolsUsed} @> ARRAY[${UNANSWERED_QUESTION_TOOL}]::text[]`,
        ),
      )
      .returning({ id: chatBotMessages.id }),
  ).pipe(
    Effect.flatMap((rows) =>
      rows.length > 0 ? Effect.void : Effect.fail(new NotFound({ message: UNANSWERED_QUESTION_NOT_FOUND })),
    ),
  );
