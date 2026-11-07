import { Cause, Data, Effect, Exit, Option } from "effect";
import {
  type AppError,
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  InternalServiceError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "#/lib/errors";
import { redactForLog } from "#/lib/redact-log";

export class DbError extends Data.TaggedError("DbError")<{
  cause: unknown;
}> {}
export class ExternalError extends Data.TaggedError("ExternalError")<{
  cause: unknown;
}> {}
export class ParseError extends Data.TaggedError("ParseError")<{
  cause: unknown;
}> {}

export class NotFound extends Data.TaggedError("NotFound")<{
  message: string;
}> {}
export class Conflict extends Data.TaggedError("Conflict")<{
  message: string;
}> {}
export class Forbidden extends Data.TaggedError("Forbidden")<{
  message: string;
}> {}
export class Invalid extends Data.TaggedError("Invalid")<{
  message: string;
}> {}
export class RateLimited extends Data.TaggedError("RateLimited")<{
  code: string;
  message: string;
}> {}

export type DomainFailure = NotFound | Conflict | Forbidden | Invalid | RateLimited;
export type AppFailure = DomainFailure | DbError | ExternalError | ParseError;

export const toDbError = (cause: unknown): DbError => new DbError({ cause });
export const toExternalError = (cause: unknown): ExternalError => new ExternalError({ cause });
export const toParseError = (cause: unknown): ParseError => new ParseError({ cause });

// -----
// One case per tag and no default, so a new
// tag fails the build until it's mapped.
// -----
export function toAppError(failure: AppFailure): AppError {
  switch (failure._tag) {
    case "NotFound":
      return new NotFoundError(failure.message);
    case "Conflict":
      return new ConflictError(failure.message);
    case "Forbidden":
      return new ForbiddenError(failure.message);
    case "Invalid":
      return new ValidationError(failure.message);
    case "RateLimited":
      return new TooManyRequestsError(failure.message, failure.code);
    case "DbError":
      return new InternalServiceError("Database error", { cause: failure });
    case "ExternalError":
      return new ExternalServiceError("External service failed", { cause: failure });
    case "ParseError":
      return new ExternalServiceError("Unreadable upstream response", { cause: failure });
  }
}

// -----
// The run point for an Effect entry. Typed
// failures map to AppError; defects log here.
// -----
export async function runEffect<A>(effect: Effect.Effect<A, AppFailure>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.failureOption(exit.cause);
  if (Option.isSome(failure)) throw toAppError(failure.value);
  console.error(redactForLog(Cause.pretty(exit.cause)));
  throw new InternalServiceError("Unexpected failure", { cause: Cause.squash(exit.cause) });
}
