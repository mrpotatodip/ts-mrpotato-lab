import { Effect } from "effect";
import type { UnansweredQuestion, UnansweredQuestionList } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { getTenantClockSvc } from "#/modules/tenant";
import { UNANSWERED_QUESTION_LIST_LIMIT } from "#/modules/unanswered-question/constants";
import { parseReplyStructure, toMissingTopics } from "#/modules/unanswered-question/lib";
import {
  countUnansweredQuestionWeekEffect,
  dismissUnansweredQuestionEffect,
  listUnansweredQuestionsEffect,
} from "#/modules/unanswered-question/queries";
import type { UnansweredQuestionRow } from "#/modules/unanswered-question/types";

const toUnansweredQuestion = (row: UnansweredQuestionRow): UnansweredQuestion => ({
  messageId: row.messageId,
  threadId: row.threadId,
  question: row.question,
  topics: toMissingTopics(parseReplyStructure(row)),
  askedAt: row.askedAt.toISOString(),
});

export const listUnansweredQuestionsSvc = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<UnansweredQuestionList, DbError | NotFound> =>
  Effect.gen(function* () {
    const { timezone } = yield* getTenantClockSvc(db, tenantId);
    const [rows, summary] = yield* Effect.all(
      [
        listUnansweredQuestionsEffect(db, tenantId, UNANSWERED_QUESTION_LIST_LIMIT),
        countUnansweredQuestionWeekEffect(db, tenantId, timezone),
      ],
      { concurrency: "unbounded" },
    );
    return { summary, questions: rows.map(toUnansweredQuestion) };
  });

export const dismissUnansweredQuestionSvc = (
  db: DbConnectType,
  tenantId: string,
  messageId: string,
): Effect.Effect<void, DbError | NotFound> => dismissUnansweredQuestionEffect(db, tenantId, messageId);
