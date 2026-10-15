import { Data } from "effect";

// -----
// The engine's typed failures. The tags match
// the host's own (DbError, NotFound, ...), so a
// host that maps failures by tag needs no glue.
// -----
export class ChatBotDbError extends Data.TaggedError("DbError")<{
  cause: unknown;
}> {}

export class ChatBotNotFound extends Data.TaggedError("NotFound")<{
  message: string;
}> {}

export class ChatBotConflict extends Data.TaggedError("Conflict")<{
  message: string;
}> {}

export class ChatBotInvalid extends Data.TaggedError("Invalid")<{
  message: string;
}> {}

export const toChatBotDbError = (cause: unknown): ChatBotDbError => new ChatBotDbError({ cause });
