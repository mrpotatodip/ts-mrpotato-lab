import { Skeleton } from "#/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";

const ROW_COUNT = 4;

function InviteCodeRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-10" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-8 w-16 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export function AdminInviteCodesSkeleton() {
  return (
    <Table className="min-w-[48rem] whitespace-nowrap">
      <TableHeader>
        <TableRow>
          <TableHead>Note</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uses</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <InviteCodeRowSkeleton key={index} />
        ))}
      </TableBody>
    </Table>
  );
}
