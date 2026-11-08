import type { Conflict, DbError, Forbidden, NotFound } from "#/lib/effect-query";

export type GroupFailure = Conflict | Forbidden | NotFound | DbError;
