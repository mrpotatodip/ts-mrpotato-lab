import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { scansQuery } from "../hooks";
import { ScanStatusBadge } from "./scan-status-badge";

export function ScanList() {
  const { data } = useSuspenseQuery(scansQuery());

  if (data.scans.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No scans yet</EmptyTitle>
          <EmptyDescription>Start one above and it will show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Repository</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Skill</TableHead>
          <TableHead>Started</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.scans.map((scan) => (
          <TableRow key={scan.scanId}>
            <TableCell>
              <Link to="/scans/$scanId" params={{ scanId: scan.scanId }} className="font-medium underline-offset-4 hover:underline">
                {scan.repo?.replace("https://github.com/", "") ?? scan.scanId}
              </Link>
            </TableCell>
            <TableCell>
              <ScanStatusBadge status={scan.status} />
            </TableCell>
            <TableCell>{scan.skill ?? "-"}</TableCell>
            <TableCell>{scan.createdAt ? new Date(scan.createdAt).toLocaleString() : "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
