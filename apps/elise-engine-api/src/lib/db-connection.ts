import { createDb, createPoolDb } from "@repo/db-elise/client";

export type DbConnectType = ReturnType<typeof createDb>;
export type PoolDbType = ReturnType<typeof createPoolDb>["db"];

export const dbConnect = (url: string): DbConnectType => createDb(url);

// -----
// For code that needs a transaction: sign-up and
// better-auth. Call close() when the request ends.
// -----
export const poolConnect = (url: string) => createPoolDb(url);

// -----
// Runs a job on a pooled connection and closes the
// pool after the answer, through waitUntil.
// -----
export const withPool = async <T>(
  url: string,
  waitUntil: (promise: Promise<unknown>) => void,
  run: (db: PoolDbType) => Promise<T>,
): Promise<T> => {
  const { db, close } = poolConnect(url);
  try {
    return await run(db);
  } finally {
    waitUntil(close());
  }
};
