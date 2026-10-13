import { Effect } from "effect";
import type { CustomerThreadDetail, CustomerThreadList } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError, NotFound } from "#/lib/effect-query";
import { parseReplyStructure, toMissingTopics } from "#/modules/unanswered-question";
import { CUSTOMER_THREAD_LIST_LIMIT } from "#/modules/customer-thread/constants";
import { getCustomerThreadEffect, listCustomerThreadsEffect } from "#/modules/customer-thread/queries";

export const listCustomerThreadsSvc = (
  db: DbConnectType,
  tenantId: string,
): Effect.Effect<CustomerThreadList, DbError> =>
  listCustomerThreadsEffect(db, tenantId, CUSTOMER_THREAD_LIST_LIMIT).pipe(
    Effect.map((rows) =>
      rows.map((row) => ({
        ...row,
        startedAt: row.startedAt.toISOString(),
        lastMessageAt: row.lastMessageAt.toISOString(),
      })),
    ),
  );

// -----
// Missing topics show only on a Customer's reply
// that reported one, as the Tenant sees them.
// -----
export const getCustomerThreadSvc = (
  db: DbConnectType,
  tenantId: string,
  threadId: string,
): Effect.Effect<CustomerThreadDetail, DbError | NotFound> =>
  getCustomerThreadEffect(db, tenantId, threadId).pipe(
    Effect.map((thread) => ({
      id: thread.id,
      title: thread.title,
      startedAt: thread.startedAt.toISOString(),
      messages: thread.messages.map((message) => ({
        id: message.id,
        role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        missingTopics: message.role === "assistant" ? toMissingTopics(parseReplyStructure(message)) : [],
        isDismissed: message.dismissedAt !== null,
      })),
    })),
  );
