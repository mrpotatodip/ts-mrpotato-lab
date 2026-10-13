import { Cause, Data, Effect, Exit, Option } from "effect";
import { redactForLog } from "#/lib/redact-log";
import {
  AppError,
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  InternalServiceError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "#/lib/errors";

export class DbError extends Data.TaggedError("DbError")<{
  cause: unknown;
}> {}
export class ParseError extends Data.TaggedError("ParseError")<{
  cause: unknown;
}> {}
export class ExternalError extends Data.TaggedError("ExternalError")<{
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
export class NeedsLocation extends Data.TaggedError("NeedsLocation")<{
  message: string;
  locations: { id: string; name: string }[];
}> {}
export class RateLimited extends Data.TaggedError("RateLimited")<{
  code: string;
  message: string;
}> {}

export type QueryError = DbError | ParseError;
export type QueryFailure = QueryError | NotFoundError;
export type DomainFailure = NotFound | Conflict | Forbidden | Invalid | NeedsLocation | RateLimited;
export type AppFailure = DomainFailure | DbError | ExternalError | ParseError;

export const toDbError = (cause: unknown) => new DbError({ cause });
export const toParseError = (cause: unknown) => new ParseError({ cause });

export const toNotFoundError = (cause: unknown): NotFoundError =>
  new NotFoundError("Resource not found", { cause });

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
    case "NeedsLocation":
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

const isDomainFailure = <E>(failure: E): failure is E & DomainFailure =>
  failure instanceof NotFound ||
  failure instanceof Conflict ||
  failure instanceof Forbidden ||
  failure instanceof Invalid ||
  failure instanceof NeedsLocation ||
  failure instanceof RateLimited;

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

// -----
// Shared unwrap: a typed failure goes to
// onFailure; a defect is logged whole first.
// -----
function toThrown<E>(
  cause: Cause.Cause<E>,
  onFailure: (failure: E) => Error,
  onDefect: (defect: Cause.Cause<E>) => Error,
): Error {
  const failure = Cause.failureOption(cause);
  if (Option.isSome(failure)) return onFailure(failure.value);
  console.error(redactForLog(Cause.pretty(cause)));
  return onDefect(cause);
}

// -----
// The run point for an Effect entry. Typed
// failures map to AppError; defects log here.
// -----
export async function runEffect<A>(effect: Effect.Effect<A, AppFailure>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;
  throw toThrown(
    exit.cause,
    toAppError,
    (defect) => new InternalServiceError("Unexpected failure", { cause: Cause.squash(defect) }),
  );
}

// -----
// Legacy runner for untagged errors. Domain
// tags and AppError pass; the rest is onError.
// -----
export async function runQuery<A, E>(
  effect: Effect.Effect<A, E>,
  onError: (cause: Error) => Error,
): Promise<A> {
  const exit = await Effect.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;
  const passOrWrap = (cause: unknown): Error =>
    cause instanceof AppError ? cause : onError(asError(cause));
  throw toThrown(
    exit.cause,
    (failure) => (isDomainFailure(failure) ? toAppError(failure) : passOrWrap(failure)),
    (defect) => passOrWrap(Cause.squash(defect)),
  );
}
