import { and, desc, eq, exists, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import type { CreditEntries } from "@repo/contracts/elise";
import { tenantCreditLedger } from "@repo/db-elise/schema";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";
import { roundUsd } from "#/modules/credit/utils";

// -----
// The account's credit history, newest first. A scan is one entry:
// its settle row holds what the hold gave back less the charge, so
// the charge is the hold plus the settle, and the hold row is left
// out once the scan has settled. A running scan shows its hold. The
// cursor is the ID of the last entry on the page before; the next
// page is everything older than it.
// -----
export const creditEntriesEffect = (db: DbConnectType, tenantId: string, query: { limit: number; cursor?: string }): Effect.Effect<CreditEntries, DbError> =>
  Effect.tryPromise({
    try: async () => {
      const hold = alias(tenantCreditLedger, "hold");
      const settle = alias(tenantCreditLedger, "settle");
      const settled = db
        .select({ one: sql`1` })
        .from(settle)
        .where(and(eq(settle.scanId, tenantCreditLedger.scanId), eq(settle.kind, "scan_settle")));
      const olderThanCursor = query.cursor
        ? sql`(${tenantCreditLedger.createdAt}, ${tenantCreditLedger.id}) < (select c.created_at, c.id from ${tenantCreditLedger} c where c.id = ${query.cursor})`
        : undefined;
      const rows = await db
        .select({
          id: tenantCreditLedger.id,
          kind: tenantCreditLedger.kind,
          amount: sql<string>`case when ${tenantCreditLedger.kind} = 'scan_settle' then ${tenantCreditLedger.amountUsd} + coalesce(${hold.amountUsd}, 0) else ${tenantCreditLedger.amountUsd} end`,
          scanId: tenantCreditLedger.scanId,
          note: tenantCreditLedger.note,
          createdAt: tenantCreditLedger.createdAt,
        })
        .from(tenantCreditLedger)
        .leftJoin(hold, and(eq(hold.scanId, tenantCreditLedger.scanId), eq(hold.kind, "scan_hold")))
        .where(and(eq(tenantCreditLedger.tenantId, tenantId), or(ne(tenantCreditLedger.kind, "scan_hold"), sql`not ${exists(settled)}`), olderThanCursor))
        .orderBy(desc(tenantCreditLedger.createdAt), desc(tenantCreditLedger.id))
        .limit(query.limit + 1);
      const page = rows.slice(0, query.limit);
      return {
        entries: page.map((row) => ({
          id: row.id,
          kind: row.kind,
          amountUsd: roundUsd(Number(row.amount)),
          scanId: row.scanId,
          note: row.note,
          createdAt: row.createdAt.toISOString(),
        })),
        nextCursor: rows.length > query.limit ? (page.at(-1)?.id ?? null) : null,
      };
    },
    catch: toDbError,
  });
