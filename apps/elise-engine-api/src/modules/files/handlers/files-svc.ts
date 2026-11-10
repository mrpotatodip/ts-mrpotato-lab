import { Effect } from "effect";
import type { FileList, FilesQuery } from "@repo/contracts/elise";
import type { DbConnectType } from "#/lib/db-connection";
import type { DbError } from "#/lib/effect-query";
import { countFilesEffect, listFilesEffect } from "#/modules/files/queries";

// -----
// One more row than asked tells whether another
// page exists; the cursor is the next offset.
// -----
export const listFilesSvc = (db: DbConnectType, accountId: string, query: FilesQuery): Effect.Effect<FileList, DbError> =>
  Effect.gen(function* () {
    const [rows, counts] = yield* Effect.all([listFilesEffect(db, accountId, query), countFilesEffect(db, accountId, query)], { concurrency: 2 });
    const offset = query.cursor ? Number(query.cursor) : 0;
    return { files: rows.slice(0, query.limit), nextCursor: rows.length > query.limit ? String(offset + query.limit) : null, counts };
  });
