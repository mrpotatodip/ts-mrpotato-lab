import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usageQuery } from "#/modules/usage";
import { overviewQuery, ScanLinkModeContext, scanFileQuery, scanFindingsQuery, scanQuery, scansQuery } from "../hooks";
import { buildOverviewPrototype, buildScanPrototype, buildUsagePrototype } from "./scan-prototype-data";

// -----
// The server renders the demo once and the browser renders it again a moment
// later. A clock read to the millisecond differs between the two, so every
// timestamp would fail to hydrate. Rounded down to the hour, both agree.
// -----
const HOUR_MS = 3_600_000;
const demoNow = () => Math.floor(Date.now() / HOUR_MS) * HOUR_MS;

function createScanPrototypeClient() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } } });
  const original = client.defaultQueryOptions.bind(client);
  // -----
  // The queries poll the engine while a scan is active. Demo data has no engine,
  // so every query here never refetches and can only answer from the seeded cache.
  // -----
  // SAFETY: the patched result keeps the exact shape defaultQueryOptions returns.
  client.defaultQueryOptions = ((options) => ({
    ...original(options),
    refetchInterval: false,
    queryFn: () => Promise.reject(new Error("Demo data only")),
  })) as typeof client.defaultQueryOptions;

  const now = demoNow();
  const entries = buildScanPrototype(now);
  client.setQueryData(scansQuery().queryKey, { scans: entries.map((entry) => entry.scan), nextCursor: null });
  client.setQueryData(overviewQuery().queryKey, buildOverviewPrototype(entries));
  client.setQueryData(usageQuery().queryKey, buildUsagePrototype(entries, now));
  for (const { scan, findings, files } of entries) {
    client.setQueryData(scanQuery(scan.scanId).queryKey, scan);
    client.setQueryData(scanFindingsQuery(scan.scanId).queryKey, findings);
    for (const { name, content } of files) client.setQueryData(scanFileQuery(scan.scanId, name).queryKey, content);
  }
  return client;
}

export function ScanPrototypeProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createScanPrototypeClient);
  return (
    <QueryClientProvider client={client}>
      <ScanLinkModeContext value="demo">{children}</ScanLinkModeContext>
    </QueryClientProvider>
  );
}
