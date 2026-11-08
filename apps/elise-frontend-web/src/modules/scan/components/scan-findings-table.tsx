import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "#/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { cn } from "#/lib/utils";
import { SCAN_FINDING_STATE_COPY } from "../constants";
import { scanFindingsQuery } from "../hooks";
import { SEVERITIES, type Finding } from "../schemas";
import { scanFindingsPrompt } from "../utils";
import { ScanFindingCopy } from "./scan-finding-copy";
import { ScanFindingSheet } from "./scan-finding-sheet";
import { ScanSeverityBadge } from "./scan-severity-badge";

const RANK = new Map<string | null, number>([...SEVERITIES.map((s, i) => [s, i] as const), [null, SEVERITIES.length]]);

const keyOf = (f: Finding) => `${f.title}-${f.place?.file}-${f.place?.line}`;

function ScanFindingDecisionLink({ repoId }: { repoId: string | undefined }) {
  if (!repoId) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Decide whether to fix, dismiss or accept it on the{" "}
      <Link
        to="/repos/$repoId"
        params={{ repoId }}
        className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        repository page
      </Link>
      .
    </p>
  );
}

type ScanFindingsTableProps = { scanId: string; repoId?: string; repoLabel?: string; commit?: string };

export function ScanFindingsTable({ scanId, repoId, repoLabel, commit }: ScanFindingsTableProps) {
  const { data } = useSuspenseQuery(scanFindingsQuery(scanId));
  const [selected, setSelected] = useState<number | undefined>();

  if (data.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldCheck />
          </EmptyMedia>
          <EmptyTitle>No findings recorded</EmptyTitle>
          <EmptyDescription>The scan finished without reporting a problem. That is not proof the code is safe: it only covers what the review looked at.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const sorted = data.toSorted((a, b) => (RANK.get(a.severity) ?? 0) - (RANK.get(b.severity) ?? 0));

  const actionable = sorted.filter((f) => f.state !== "rejected");

  return (
    <>
      {actionable.length > 0 && (
        <div className="flex justify-end border-b px-5 py-3">
          <ScanFindingCopy text={scanFindingsPrompt(sorted, { repo: repoLabel, commit })} label={`Copy ${actionable.length === 1 ? "finding" : `all ${actionable.length} findings`} for coding agent`} />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Severity</TableHead>
            <TableHead className="w-[42%]">Finding</TableHead>
            <TableHead>Where</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((f, index) => (
            <TableRow key={keyOf(f)} className={cn("relative", index === selected && "bg-accent")}>
              <TableCell>
                <ScanSeverityBadge severity={f.severity} />
              </TableCell>
              <TableCell>
                {f.detail ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setSelected(index)}
                    className="rounded-sm text-left font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {f.title}
                  </button>
                ) : (
                  <span className="font-medium">{f.title}</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground [overflow-wrap:normal]">{f.place ? `${f.place.file}:${f.place.line}` : "-"}</TableCell>
              <TableCell>
                <Badge variant={f.state === "confirmed" ? "success" : f.state === "needs_validation" ? "warning" : "neutral"}>{SCAN_FINDING_STATE_COPY[f.state].label}</Badge>
              </TableCell>
              <TableCell>{f.detail && <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScanFindingSheet
        findings={sorted}
        selected={selected}
        onSelect={setSelected}
        decision={<ScanFindingDecisionLink repoId={repoId} />}
      />
    </>
  );
}
