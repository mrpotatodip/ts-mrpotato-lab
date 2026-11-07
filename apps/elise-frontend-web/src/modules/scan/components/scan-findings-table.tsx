import { useSuspenseQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { scanFindingsQuery } from "../hooks";
import { SEVERITIES } from "../schemas";
import { ScanSeverityBadge } from "./scan-severity-badge";

const RANK = new Map<string | null, number>([...SEVERITIES.map((s, i) => [s, i] as const), [null, SEVERITIES.length]]);

export function ScanFindingsTable({ scanId }: { scanId: string }) {
  const { data } = useSuspenseQuery(scanFindingsQuery(scanId));

  if (data.length === 0) return <p className="text-sm text-muted-foreground">No findings. That is not proof the code is safe.</p>;

  const sorted = data.toSorted((a, b) => (RANK.get(a.severity) ?? 0) - (RANK.get(b.severity) ?? 0));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Finding</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((f) => (
          <TableRow key={`${f.title}-${f.place?.file}-${f.place?.line}`}>
            <TableCell>
              <ScanSeverityBadge severity={f.severity} />
            </TableCell>
            <TableCell className="font-medium">{f.title}</TableCell>
            <TableCell className="font-mono text-xs">{f.place ? `${f.place.file}:${f.place.line}` : "-"}</TableCell>
            <TableCell>{f.state.replace("_", " ")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
