import { createDb } from "@repo/db-elise/client";

export type DbConnectType = ReturnType<typeof createDb>;

export const dbConnect = (url: string): DbConnectType => createDb(url);
