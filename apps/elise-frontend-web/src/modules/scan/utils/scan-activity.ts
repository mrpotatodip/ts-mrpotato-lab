import type { ScanState } from "../schemas";

export type ScanActivityDay = {
  key: string;
  label: string;
  succeeded: number;
  failed: number;
  active: number;
  total: number;
};

type ScanActivityInput = { createdAt: string; status: ScanState };

const DAY_MS = 86_400_000;
const LABEL = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

export function scanActivity(scans: readonly ScanActivityInput[], days: number, now: Date): ScanActivityDay[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const buckets = Array.from({ length: days }, (_, index) => {
    const start = today - (days - 1 - index) * DAY_MS;
    return { key: new Date(start).toISOString().slice(0, 10), label: LABEL.format(start), succeeded: 0, failed: 0, active: 0, total: 0 };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const scan of scans) {
    const bucket = byKey.get(scan.createdAt.slice(0, 10));
    if (!bucket) continue;
    bucket.total += 1;
    if (scan.status === "succeeded") bucket.succeeded += 1;
    else if (scan.status === "failed") bucket.failed += 1;
    else bucket.active += 1;
  }
  return buckets;
}
