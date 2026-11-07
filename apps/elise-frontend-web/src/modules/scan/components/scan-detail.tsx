import { Suspense, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { scanFileQuery, scanQuery } from "../hooks";
import { ScanFindingsTable } from "./scan-findings-table";
import { ScanStatusBadge } from "./scan-status-badge";

const DEFAULT_FILE = "REPORT.md";

function ScanFileViewer({ scanId, file }: { scanId: string; file: string }) {
  const { data, isPending, error } = useQuery(scanFileQuery(scanId, file));

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  return <pre className="max-h-[70vh] overflow-auto rounded-md border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{data}</pre>;
}

export function ScanDetail({ scanId }: { scanId: string }) {
  const { data: scan } = useSuspenseQuery(scanQuery(scanId));
  const [picked, setPicked] = useState(DEFAULT_FILE);
  const files = scan.files ?? [];
  const file = files.includes(picked) ? picked : (files[0] ?? DEFAULT_FILE);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{scan.repo?.replace("https://github.com/", "") ?? scan.scanId}</h1>
        <ScanStatusBadge status={scan.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {[scan.model, scan.effort, scan.skill, scan.skill === "full" ? scan.profile : null].filter(Boolean).join(" · ")}
      </p>
      {scan.status === "failed" && <p className="text-sm text-destructive">{scan.error ?? "The scan failed."}</p>}
      {(scan.status === "queued" || scan.status === "running") && (
        <p className="text-sm text-muted-foreground">The scan is {scan.status}. This page updates by itself.</p>
      )}
      {scan.status === "succeeded" && (
        <>
          {files.includes("findings.json") && (
            <section className="grid gap-2">
              <h2 className="text-lg font-semibold">Findings</h2>
              <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                <ScanFindingsTable scanId={scanId} />
              </Suspense>
            </section>
          )}
          <h2 className="text-lg font-semibold">Files</h2>
          <div className="flex flex-wrap gap-2">
            {files.map((name) => (
              <Button key={name} size="sm" variant={name === file ? "default" : "outline"} onClick={() => setPicked(name)}>
                {name}
              </Button>
            ))}
          </div>
          <ScanFileViewer key={file} scanId={scanId} file={file} />
        </>
      )}
    </div>
  );
}
