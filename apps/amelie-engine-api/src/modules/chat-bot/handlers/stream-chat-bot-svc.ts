import { produceChatBotDurableRun } from "@repo/chat-bot-durable-stream";
import { resolveResumeRunId, type StreamChunk } from "@tanstack/ai";
import { Cause, Effect } from "effect";
import { runEffect, toDbError, type DbError } from "#/lib/effect-query";
import {
  CHAT_BOT_MODEL_MESSAGE_LIMIT,
  CHAT_BOT_RUN_FAILED,
  CHAT_BOT_RUN_SETUP_RETRY,
} from "#/modules/chat-bot/constants";
import type {
  ChatBotInput,
  ChatBotRuntime,
  ChatBotStreamRequest,
  ChatBotTurnStart,
  StreamChatBotError,
  StreamChatBotResult,
} from "#/modules/chat-bot/types";
import {
  chatBotThreadTitleFromContent,
  collectChatBotTurn,
  readChatBotStreamOffsetForRunEffect,
} from "#/modules/chat-bot/lib";
import { resumeChatBotSseResponse } from "./resume-chat-bot-sse-svc";

// -----
// Stream first, then the run row: a reader
// drains the stream before the run ends.
// -----
async function produceChatBotRun(
  start: Pick<ChatBotTurnStart, "db" | "queries" | "durableStream" | "runId">,
  source: AsyncIterable<StreamChunk>,
): Promise<void> {
  const { db, queries, durableStream, runId } = start;
  try {
    await produceChatBotDurableRun(durableStream({ runId }), source, {
      runId,
      errorMessage: CHAT_BOT_RUN_FAILED,
      onCloseError: (closeError) => {
        console.error("chat-bot: failed to close stream", runId, closeError);
      },
    });
  } catch (error) {
    // -----
    // A failed close is logged, not thrown, so
    // the turn's own error stays the cause.
    // -----
    await runEffect(queries.closeChatBotRunEffect(db, runId, "failed")).catch(
      (closeError: Error) => {
        console.error("chat-bot: failed to close run", runId, closeError);
      },
    );
    throw error;
  }
  await runEffect(queries.closeChatBotRunEffect(db, runId, "completed"));
}

// -----
// Hands the turn to waitUntil. The run's own
// failures land in the log, not this request.
// -----
function startChatBotTurn(start: ChatBotTurnStart): void {
  const {
    db,
    queries,
    runner,
    waitUntil,
    owner,
    threadId,
    agent,
    messages,
  } = start;
  // -----
  // Tools run in-process; the owner comes from
  // the server, never from the model.
  // -----
  const runtime: ChatBotRuntime = { db, owner, threadId };
  const input: ChatBotInput = {
    adapter: runner.adapterFor(agent.model),
    messages,
    prompts: agent.prompts,
    tools: agent.tools,
    temperature: agent.temperature,
    runtime,
    subagents: agent.subagents.map((sub) => ({
      name: sub.name,
      description: sub.description,
      adapter: runner.adapterFor(sub.model),
      prompts: sub.prompts,
      tools: sub.tools,
      temperature: sub.temperature,
    })),
    route: runner.route,
  };
  // -----
  // Every tool the turn can call, children
  // included, so their cards get saved.
  // -----
  const allTools = [...agent.tools, ...agent.subagents.flatMap((sub) => sub.tools)];

  // -----
  // Its own run point: the producer awaits it,
  // and waitUntil already holds the producer.
  // -----
  const turn = collectChatBotTurn(
    runner.run(input),
    allTools,
    (collected) =>
      runEffect(
        Effect.all(
          [
            queries.insertChatBotAssistantMessageEffect(db, {
              threadId,
              tenantId: owner.tenantId,
              content: collected.answer,
              toolsUsed: collected.toolsUsed,
              structure: collected.structure,
            }),
            collected.usage
              ? queries.recordChatBotRunUsageEffect(db, start.runId, {
                  ...collected.usage,
                  model: collected.usage.model ?? agent.model,
                })
              : Effect.void,
          ],
          { concurrency: "unbounded", discard: true },
        ),
      ),
  );
  waitUntil(produceChatBotRun(start, turn));
}

// -----
// Everything one POST hands the stream
// travels as one value, not seven arguments.
// -----
export const startChatBotRunSvc = (
  stream: ChatBotStreamRequest,
): Effect.Effect<StreamChatBotResult, StreamChatBotError> =>
  Effect.gen(function* () {
    const { db, queries, owner, body, request } = stream;
    const runId = resolveResumeRunId(request) ?? crypto.randomUUID();
    // -----
    // A bad offset is a 400 now, before a model
    // call starts that nobody would read.
    // -----
    const offset = yield* readChatBotStreamOffsetForRunEffect(request, runId);
    // -----
    // Setup reads are safe to repeat; only a
    // DbError is retried, never a NotFound.
    // -----
    const existing = yield* queries
      .lookupChatBotRunEffect(db, owner, runId)
      .pipe(Effect.retry(CHAT_BOT_RUN_SETUP_RETRY));
    if (existing) {
      return { runId: existing.id, threadId: existing.threadId, offset };
    }
    if (!body.threadId) {
      yield* queries
        .assertChatBotThreadLookupsEffect(db, body.trigger, body.module)
        .pipe(Effect.retry(CHAT_BOT_RUN_SETUP_RETRY));
    }
    // -----
    // Claim the run. A new thread is written with
    // it, so a 409 never leaves an empty thread.
    // -----
    const threadId = body.threadId
      ? yield* queries.findChatBotThreadEffect(db, owner, body.threadId).pipe(
          Effect.tap((thread) =>
            queries.insertChatBotRunEffect(db, {
              runId,
              threadId: thread.id,
            }),
          ),
          Effect.map((thread) => thread.id),
        )
      : (yield* queries.insertChatBotThreadWithRunEffect(db, {
          owner,
          locationId: stream.locationId,
          countryId: stream.countryId,
          title: body.title ?? chatBotThreadTitleFromContent(body.content),
          trigger: body.trigger,
          module: body.module,
          runId,
        })).id;
    // -----
    // The run is claimed. If setup fails now, close
    // run and stream so no reader waits on it.
    // -----
    yield* Effect.gen(function* () {
      yield* queries.insertChatBotUserMessageEffect(db, {
        threadId,
        tenantId: owner.tenantId,
        content: body.content,
      });
      if (owner.kind === "anonymous") {
        yield* queries.extendAnonymousChatBotThreadEffect(db, threadId);
      }
      const history = yield* queries.listChatBotMessagesForModelEffect(
        db,
        threadId,
        CHAT_BOT_MODEL_MESSAGE_LIMIT,
      );

      yield* Effect.sync(() =>
        startChatBotTurn({ ...stream, runId, threadId, messages: history }),
      );
    }).pipe(
      Effect.onError(() => {
        const logFailedClose = (cause: Cause.Cause<DbError>) =>
          Effect.sync(() =>
            console.error(
              "chat-bot: failed to close run",
              runId,
              Cause.pretty(cause),
            ),
          );
        return Effect.all(
          [
            queries
              .closeChatBotRunEffect(db, runId, "failed")
              .pipe(Effect.catchAllCause(logFailedClose)),
            Effect.tryPromise({
              try: () => stream.durableStream({ runId }).close(),
              catch: toDbError,
            }).pipe(Effect.catchAllCause(logFailedClose)),
          ],
          { concurrency: "unbounded", discard: true },
        );
      }),
    );

    return { runId, threadId, offset };
  });

// -----
// Start (or find) the run, then answer
// with its SSE stream from the offset.
// -----
export const streamChatBotSvc = (
  stream: ChatBotStreamRequest,
): Effect.Effect<Response, StreamChatBotError> =>
  startChatBotRunSvc(stream).pipe(
    Effect.map(({ runId, threadId, offset }) =>
      resumeChatBotSseResponse(stream.durableStream, runId, offset, threadId),
    ),
  );
