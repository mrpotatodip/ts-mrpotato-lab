import { and, eq, gte, inArray, lt, ne, or, type SQL } from "drizzle-orm";
import { scans } from "@repo/db-elise/schema";
import type { ScanOptions } from "#/schemas";
import { SCANS_ACTIVE_FULL_WINDOW_MS, SCANS_ACTIVE_WINDOW_MS } from "#/modules/scans/constants";

// -----
// How long a queued or running Scan may go without an update and still be
// live. After it the Scan is stalled: it no longer counts as active, and
// a newer request for its repo may close it. A full Scan runs longer, so
// its window is longer.
// -----
export const activeWindowMsOf = (skill: ScanOptions["skill"]): number => (skill === "full" ? SCANS_ACTIVE_FULL_WINDOW_MS : SCANS_ACTIVE_WINDOW_MS);

const lastLiveAt = (nowMs: number, skill: ScanOptions["skill"]) => new Date(nowMs - activeWindowMsOf(skill));

// -----
// SQL for a Scan that is queued or running and not stalled, each Skill
// judged by its own window.
// -----
export const liveScansSql = (nowMs: number): SQL | undefined =>
  and(
    inArray(scans.status, ["queued", "running"]),
    or(and(eq(scans.skill, "full"), gte(scans.updatedAt, lastLiveAt(nowMs, "full"))), and(ne(scans.skill, "full"), gte(scans.updatedAt, lastLiveAt(nowMs, "lite")))),
  );

// -----
// SQL for a Scan that is queued or running and stalled.
// -----
export const stalledScansSql = (nowMs: number): SQL | undefined =>
  and(
    inArray(scans.status, ["queued", "running"]),
    or(and(eq(scans.skill, "full"), lt(scans.updatedAt, lastLiveAt(nowMs, "full"))), and(ne(scans.skill, "full"), lt(scans.updatedAt, lastLiveAt(nowMs, "lite")))),
  );
