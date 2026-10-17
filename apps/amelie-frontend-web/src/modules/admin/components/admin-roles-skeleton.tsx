import { Skeleton } from "#/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";

const ROW_COUNT = 4;

function RoleRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-8" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-8 w-16 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export function AdminRolesSkeleton() {
  return (
    <Table className="min-w-[40rem] whitespace-nowrap">
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Powers</TableHead>
          <TableHead>People</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <RoleRowSkeleton key={index} />
        ))}
      </TableBody>
    </Table>
  );
}
