import { Cause, Effect, Exit, Option } from "effect";
import type { StreamChatBotError } from "@repo/chat-bot-api";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 404 | 409 | 500,
  ) {
    super(message);
  }
}

const STATUS_BY_TAG = {
  Invalid: 400,
  NotFound: 404,
  Conflict: 409,
  DbError: 500,
} as const satisfies Record<StreamChatBotError["_tag"], HttpError["status"]>;

// -----
// The host's run point: run the engine's Effect,
// and turn its tagged failure into an HTTP error.
// A database error never shows its cause.
// -----
export async function run<A>(effect: Effect.Effect<A, StreamChatBotError>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.failureOption(exit.cause);
  if (Option.isNone(failure)) throw new HttpError("Internal server error", 500);
  const error = failure.value;
  if (error._tag === "DbError") throw new HttpError("Internal server error", 500);
  throw new HttpError(error.message, STATUS_BY_TAG[error._tag]);
}
