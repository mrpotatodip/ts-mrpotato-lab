import { produceChatBotDurableRun } from "@repo/chat-bot-durable-stream";
import { resolveResumeRunId, type StreamChunk } from "@tanstack/ai";
import { Cause, Effect } from "effect";
import {
  CHAT_BOT_MODEL_MESSAGE_LIMIT,
  CHAT_BOT_RUN_FAILED,
  CHAT_BOT_RUN_SETUP_RETRY,
} from "../constants";
import { toChatBotDbError, type ChatBotDbError } from "../errors";
import { readChatBotStreamOffsetForRunEffect } from "../lib/stream-offset";
import { chatBotThreadTitleFromContent } from "../lib/thread-title";
import { collectChatBotTurn } from "../run/turn-collector";
import type {
  ChatBotInput,
  ChatBotRuntime,
  ChatBotServices,
  ChatBotStreamRequest,
  ChatBotTurnStart,
  StreamChatBotError,
  StreamChatBotResult,
} from "../types";
import { resumeChatBotSseResponse } from "./resume";

// -----
// Stream first, then the run row: a reader
// drains the stream before the run ends.
// -----
async function produceChatBotRun<S extends ChatBotServices>(
  start: Pick<ChatBotTurnStart<S>, "store" | "durableStream" | "runId">,
  source: AsyncIterable<StreamChunk>,
): Promise<void> {
  const { store, durableStream, runId } = start;
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
    await Effect.runPromise(store.closeRun(runId, "failed")).catch((closeError: Error) => {
      console.error("chat-bot: failed to close run", runId, closeError);
    });
    throw error;
  }
  await Effect.runPromise(store.closeRun(runId, "completed"));
}

// -----
// Hands the turn to waitUntil. The run's own
// failures land in the log, not this request.
// -----
function startChatBotTurn<S extends ChatBotServices>(start: ChatBotTurnStart<S>): void {
  const { store, runner, waitUntil, services, owner, threadId, agent, messages } = start;
  // -----
  // Tools run in-process; the owner comes from
  // the server, never from the model.
  // -----
  // -----
  // SAFETY: S is the host's services and the
  // runtime is exactly those plus the owner.
  // -----
  const runtime = { ...services, owner, threadId } as ChatBotRuntime<S>;
  const input: ChatBotInput<S> = {
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
  const turn = collectChatBotTurn(runner.run(input), allTools, (collected) =>
    Effect.runPromise(
      Effect.all(
        [
          store.insertAssistantMessage({
            threadId,
            scopeId: owner.scopeId,
            content: collected.answer,
            toolsUsed: collected.toolsUsed,
            structure: collected.structure,
          }),
          collected.usage
            ? store.recordRunUsage(start.runId, {
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
export const startChatBotRunSvc = <S extends ChatBotServices>(
  stream: ChatBotStreamRequest<S>,
): Effect.Effect<StreamChatBotResult, StreamChatBotError> =>
  Effect.gen(function* () {
    const { store, owner, body, request } = stream;
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
    const existing = yield* store
      .lookupRun(owner, runId)
      .pipe(Effect.retry(CHAT_BOT_RUN_SETUP_RETRY));
    if (existing) {
      return { runId: existing.id, threadId: existing.threadId, offset };
    }
    if (!body.threadId) {
      yield* store
        .assertThreadStart({ trigger: body.trigger, module: body.module })
        .pipe(Effect.retry(CHAT_BOT_RUN_SETUP_RETRY));
    }
    // -----
    // Claim the run. A new thread is written with
    // it, so a 409 never leaves an empty thread.
    // -----
    const threadId = body.threadId
      ? yield* store.findThread(owner, body.threadId).pipe(
          Effect.tap((thread) => store.insertRun({ runId, threadId: thread.id })),
          Effect.map((thread) => thread.id),
        )
      : (yield* store.insertThreadWithRun({
          owner,
          attrs: stream.attrs,
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
      yield* store.insertUserMessage({
        threadId,
        scopeId: owner.scopeId,
        content: body.content,
      });
      if (owner.kind === "anonymous") {
        yield* store.extendAnonymousThread(threadId);
      }
      const history = yield* store.listMessagesForModel(
        threadId,
        stream.modelMessageLimit ?? CHAT_BOT_MODEL_MESSAGE_LIMIT,
      );

      yield* Effect.sync(() =>
        startChatBotTurn({ ...stream, runId, threadId, messages: history }),
      );
    }).pipe(
      Effect.onError(() => {
        const logFailedClose = (cause: Cause.Cause<ChatBotDbError>) =>
          Effect.sync(() =>
            console.error("chat-bot: failed to close run", runId, Cause.pretty(cause)),
          );
        return Effect.all(
          [
            store.closeRun(runId, "failed").pipe(Effect.catchAllCause(logFailedClose)),
            Effect.tryPromise({
              try: () => stream.durableStream({ runId }).close(),
              catch: toChatBotDbError,
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
export const streamChatBotSvc = <S extends ChatBotServices>(
  stream: ChatBotStreamRequest<S>,
): Effect.Effect<Response, StreamChatBotError> =>
  startChatBotRunSvc(stream).pipe(
    Effect.map(({ runId, threadId, offset }) =>
      resumeChatBotSseResponse(stream.durableStream, runId, offset, threadId),
    ),
  );
